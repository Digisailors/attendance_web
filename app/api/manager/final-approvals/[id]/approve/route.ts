import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()
    const { manager_id, manager_name, comments } = body

    if (!manager_id || !manager_name) {
      return NextResponse.json(
        { error: "Manager ID and name are required" },
        { status: 400 }
      )
    }

    // Update the work submission with final approval
    const { data, error } = await supabase
      .from("work_submissions")
      .update({
        status: "Final Approved",
        manager_id: manager_id,
        manager_name: manager_name,
        manager_comments: comments || null,
        final_approved_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "Pending Final Approval") // Only update if it's pending final approval
      .select()
      .single()

    if (error) {
      console.error("Error approving submission:", error)
      return NextResponse.json({ error: "Failed to approve submission" }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { error: "Submission not found or not in pending final approval status" },
        { status: 404 }
      )
    }

    // Create notification for employee
    try {
      // First, get the employee UUID from the submission
      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .select("id, employee_id")
        .eq("id", data.employee_id)
        .single()

      if (employeeData && !employeeError) {
        const { error: notificationError } = await supabase
          .from("notifications")
          .insert({
            recipient_type: "employee",
            recipient_id: employeeData.id,
            title: "Work Submission Final Approved",
            message: `Your work submission "${data.title || data.work_type}" has been given final approval by the manager.${comments ? ` Manager comments: ${comments}` : ''}`,
            type: "final_approval",
            reference_id: id,
            is_read: false,
          })

        if (notificationError) {
          console.error("Error creating notification:", notificationError)
        }
      }
    } catch (notifError) {
      console.error("Notification creation failed:", notifError)
    }

    return NextResponse.json({
      success: true,
      message: "Submission approved successfully",
      submission: data,
    })
  } catch (error) {
    console.error("Error in manager approve API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}