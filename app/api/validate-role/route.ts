import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ role: null }, { status: 401 })
    }

    // Fetch the actual userType from Supabase
    const { data, error } = await supabase
      .from('users')
      .select('user_type')
      .eq('email', email)
      .single()

    if (error || !data) {
      return NextResponse.json({ role: null }, { status: 404 })
    }

    return NextResponse.json({ role: data.user_type }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: 'Server Error', details: error.message }, { status: 500 })
  }
}
