// app/api/auth/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { email, password, userType, action } = await request.json()

    if (action === 'signup') {
      // Hash password on server
      const hashedPassword = await bcrypt.hash(password, 10)
      
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            email,
            password: hashedPassword,
            user_type: userType
          }
        ])
        .select()

      if (error) {
        if (error.code === '23505') {
          return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
        }
        return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
      }

      return NextResponse.json({ message: 'Account created successfully' })
    }

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

      const isPasswordValid = await bcrypt.compare(password, data.password)
      if (!isPasswordValid) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
      }

      return NextResponse.json({
        user: {
          id: data.id,
          email: data.email,
          userType: data.user_type
        }
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}