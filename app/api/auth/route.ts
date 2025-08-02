import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper function to hash using SHA-256
function hashPassword(password: string) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, userType, action, newPassword } = body

    if (!email || (!password && action !== 'reset')) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ✅ SIGNUP
    if (action === 'signup') {
      const hashedPassword = hashPassword(password)

      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            email,
            password: hashedPassword,
            user_type: userType || 'user',
            is_active: true,
          },
        ])
        .select()

      if (error) {
        if (error.code === '23505') {
          return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
        }
        return NextResponse.json({ error: 'Signup failed', details: error.message }, { status: 500 })
      }

      return NextResponse.json({ message: 'Signup successful', user: data[0] })
    }

    // ✅ SIGNIN
    if (action === 'signin') {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
      }

      const hashedInputPassword = hashPassword(password)
      if (hashedInputPassword !== data.password) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
      }

      return NextResponse.json({
        message: 'Login successful',
        user: {
          id: data.id,
          email: data.email,
          userType: data.user_type,
        },
      })
    }

    // ✅ PASSWORD RESET
    if (action === 'reset') {
      if (!newPassword || !email) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
      }

      const { data: allUsers, error: allError } = await supabase
        .from('users')
        .select('id, email');

      if (allError) {
        return NextResponse.json({ error: 'Database error', details: allError.message }, { status: 500 });
      }

      const exactUser = allUsers?.find(user => user.email === email);
      if (!exactUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const hashedNewPassword = hashPassword(newPassword);

      const { error: updateError } = await supabase
        .from('users')
        .update({ password: hashedNewPassword })
        .eq('id', exactUser.id);

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update password', details: updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        message: 'Password reset successful',
        user: {
          id: exactUser.id,
          email: exactUser.email
        }
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: 'Server error', details: error.message }, { status: 500 });
  }
}
