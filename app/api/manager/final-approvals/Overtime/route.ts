import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Supabase setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// GET method - Fetch OT requests with status "final-approval"
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employee_id = searchParams.get('employee_id');
   

    let query = supabase
      .from('overtime_requests')
      .select(`
        *,
        employees!overtime_requests_employee_id_fkey(
          name,
          employee_id,
         
          designation
        )
      `)
      .eq('status', 'Final Approved') // ✅ correct
 // Only show requests awaiting final approval
      .order('ot_date', { ascending: false });

    // Filter by employee if specified
    if (employee_id) {
      query = query.eq('employee_id', employee_id);
    }

    // Filter by department if specified (useful for department managers)
   
    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch OT requests for final approval', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// PUT method - Approve final approval requests to next batch
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, action, approved_by, batch_id, manager_remarks } = body;

    if (!id || !action || !approved_by) {
      return NextResponse.json(
        { error: 'Missing required fields', details: 'id, action, and approved_by are required' },
        { status: 400 }
      );
    }

    // Validate UUID format for approved_by
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(approved_by)) {
      return NextResponse.json(
        { error: 'Invalid approved_by format', details: 'approved_by must be a valid UUID' },
        { status: 400 }
      );
    }

    let updateData: any = {};

    if (action === 'approve') {
      updateData.status = 'approved';
      // Only update status for now since manager_remarks column doesn't exist
    } else if (action === 'reject') {
      updateData.status = 'rejected';
      // Only update status for now since manager_remarks column doesn't exist
    } else {
      return NextResponse.json(
        { error: 'Invalid action', details: 'action must be either "approve" or "reject"' },
        { status: 400 }
      );
    }

    // First, check if the request exists and is in Final Approved status (matching your GET endpoint)
    const { data: existingData, error: fetchError } = await supabase
      .from('overtime_requests')
      .select('id, status, employee_id')
      .eq('id', id)
      .eq('status', 'Final Approved') // ✅ Changed from 'final-approval' to 'Final Approved'
      .single();

    if (fetchError || !existingData) {
      return NextResponse.json(
        { error: 'Request not found or not in Final Approved status', details: fetchError?.message },
        { status: 404 }
      );
    }

    // Update the request
    const { error: updateError } = await supabase
      .from('overtime_requests')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update request status', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        message: action === 'approve' ? 'Request approved successfully' : 'Request rejected successfully',
        action
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH method - Bulk approve multiple requests to next batch
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { request_ids, action, approved_by, batch_id, manager_remarks } = body;

    if (!request_ids || !Array.isArray(request_ids) || request_ids.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields', details: 'request_ids array is required' },
        { status: 400 }
      );
    }

    if (!action || !approved_by) {
      return NextResponse.json(
        { error: 'Missing required fields', details: 'action and approved_by are required' },
        { status: 400 }
      );
    }

    // Validate UUID format for approved_by
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(approved_by)) {
      return NextResponse.json(
        { error: 'Invalid approved_by format', details: 'approved_by must be a valid UUID' },
        { status: 400 }
      );
    }

    let updateData: any = {
      final_approved_by: approved_by,
      final_approved_at: new Date().toISOString(),
    };

    if (action === 'approve') {
      updateData.status = 'approved';
      updateData.batch_id = batch_id || null;
      updateData.manager_remarks = manager_remarks || null;
    } else if (action === 'reject') {
      updateData.status = 'rejected';
      updateData.manager_remarks = manager_remarks || 'Bulk rejected by manager';
    } else {
      return NextResponse.json(
        { error: 'Invalid action', details: 'action must be either "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Update all requests in the array
    const { error: updateError, count } = await supabase
      .from('overtime_requests')
      .update(updateData)
      .in('id', request_ids)
      .eq('status', 'final-approval'); // Only update requests that are in final-approval status

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to bulk update requests', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        message: `${count} requests ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
        updated_count: count,
        action,
        batch_id: action === 'approve' ? batch_id : null
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}