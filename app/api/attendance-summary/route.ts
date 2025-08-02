import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    
    const employeeCode = url.searchParams.get('employeeId') // like 'DS093'
    const month = Number(url.searchParams.get('month'))
    const year = Number(url.searchParams.get('year'))
    
    if (!employeeCode || !month || !year) {
      return NextResponse.json(
        { error: 'Missing required query parameters' },
        { status: 400 }
      )
    }
    
    // ✅ Fetch UUID using employee_id
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id')
      .eq('employee_id', employeeCode)
      .single()
    
    if (empError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }
    
    const employeeUUID = employee.id
    
    // ✅ Get attendance for employee UUID - Remove .single() to handle 0 values
    const { data: attendance, error: attError } = await supabase
      .from('attendance')
      .select('total_days, working_days, permissions, leaves, missed_days')
      .eq('employee_id', employeeUUID)
      .eq('month', month)
      .eq('year', year)
    
    // Check if any record exists
    if (attError) {
      console.error('❌ Attendance Query Error:', attError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
    
    // If no attendance record exists at all
    if (!attendance || attendance.length === 0) {
      return NextResponse.json({ error: 'Attendance not found' }, { status: 404 })
    }
    
    // Return the first record (should be only one anyway)
    const attendanceRecord = attendance[0]
    
    // ✅ Even if all values are 0, return the record
    return NextResponse.json(attendanceRecord)
    
  } catch (error) {
    console.error('❌ Attendance Summary Error:', error)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}