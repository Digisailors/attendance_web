// /api/team-lead/notifications/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamLeadId = searchParams.get('team_lead_id')
    
    console.log('Received team_lead_id:', teamLeadId)
    
    if (!teamLeadId) {
      return NextResponse.json({ error: 'Team lead ID is required' }, { status: 400 })
    }

    // First, let's check the table structure to see what columns exist
    console.log('Checking table structure...')
    
    // Get a sample row to see the column structure
    const { data: sampleData, error: sampleError } = await supabase
      .from('notifications')
      .select('*')
      .limit(1)
    
    if (sampleError) {
      console.error('Error checking table structure:', sampleError)
    } else {
      console.log('Sample notification structure:', sampleData?.[0] || 'No data found')
    }

    // Try to fetch notifications using different possible column names
    let notifications = null
    let queryError = null

    // Try common column names one by one
    const possibleColumns = [
      'team_lead_id',
      'recipient_id', 
      'user_id',
      'to_user_id',
      'assigned_to',
      'target_user_id'
    ]

    for (const columnName of possibleColumns) {
      console.log(`Trying column: ${columnName}`)
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq(columnName, teamLeadId)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (!error) {
        console.log(`Success with column: ${columnName}`)
        notifications = data
        break
      } else {
        console.log(`Failed with column ${columnName}:`, error.message)
        queryError = error
      }
    }

    // If all column attempts failed, try without filtering to see all data
    if (!notifications) {
      console.log('All column attempts failed, fetching all notifications...')
      
      const { data: allData, error: allError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (allError) {
        console.error('Error fetching all notifications:', allError)
        return NextResponse.json({ 
          error: 'Failed to fetch notifications',
          details: allError.message,
          suggestion: 'Check your database table structure'
        }, { status: 500 })
      }
      
      console.log('All notifications (unfiltered):', allData)
      
      // Return all notifications with a warning
      return NextResponse.json({ 
        notifications: allData || [],
        count: allData?.length || 0,
        team_lead_id: teamLeadId,
        warning: 'Could not filter by team lead ID - returning all notifications. Please check your table structure.'
      })
    }

    console.log('Final notifications data:', notifications)
    console.log('Notifications count:', notifications?.length || 0)

    return NextResponse.json({ 
      notifications: notifications || [],
      count: notifications?.length || 0,
      team_lead_id: teamLeadId
    })

  } catch (error) {
    console.error('Error in notifications API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}