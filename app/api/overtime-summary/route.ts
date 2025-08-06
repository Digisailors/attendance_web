import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    
    const employeeCode = url.searchParams.get('employeeId')
    const month = Number(url.searchParams.get('month'))
    const year = Number(url.searchParams.get('year'))
    
    console.log('🔍 Overtime API:', { employeeCode, month, year })
    
    if (!employeeCode || !month || !year) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // Get employee UUID
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id')
      .eq('employee_id', employeeCode)
      .single()

    if (empError || !employee) {
      console.error('Employee not found:', empError)
      return NextResponse.json({ total_hours: 0, records_count: 0 })
    }

    const employeeUUID = employee.id
    console.log('Found employee UUID:', employeeUUID)

    // Try the overtime query with basic error handling
    const { data: overtimeData, error: otError } = await supabase
      .from('overtime_requests')
      .select('*') // Select all columns first to see what we have
      .eq('employee_id', employeeUUID)

    if (otError) {
      console.error('❌ Overtime query error:', otError)
      // Return 0 instead of error to prevent frontend crash
      return NextResponse.json({ 
        total_hours: 0, 
        records_count: 0,
        error_details: otError.message 
      })
    }

    console.log('Raw overtime data:', overtimeData)

    if (!overtimeData || overtimeData.length === 0) {
      console.log('No overtime records found')
      return NextResponse.json({ total_hours: 0, records_count: 0 })
    }

    // Filter by month/year and calculate total
    let totalHours = 0
    let recordsCount = 0

    overtimeData.forEach(record => {
      // Try different possible date column names
      const recordDate = record.request_date || record.date || record.work_date || record.created_at
      
      if (recordDate) {
        const date = new Date(recordDate)
        const recordMonth = date.getMonth() + 1
        const recordYear = date.getFullYear()
        
        // Check if record is from the requested month/year
        if (recordMonth === month && recordYear === year) {
          // Check if approved (try different status formats)
          const status = record.status?.toLowerCase()
          if (status === 'approved' || status === 'approve') {
            // Try different hour column names
            const hours = record.ot_hours || record.hours || record.overtime_hours || 0
            totalHours += Number(hours) || 0
            recordsCount++
            
            console.log('Added record:', { 
              date: recordDate, 
              hours, 
              status: record.status 
            })
          }
        }
      }
    })

    const response = {
      total_hours: totalHours,
      records_count: recordsCount,
      debug_info: {
        employee_uuid: employeeUUID,
        total_records_found: overtimeData.length,
        sample_record: overtimeData[0] // Show structure of first record
      }
    }

    console.log('✅ Overtime response:', response)
    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    // Return 0 instead of error to prevent frontend crash
    return NextResponse.json({ 
      total_hours: 0, 
      records_count: 0,
      error: 'Server error' 
    })
  }
}