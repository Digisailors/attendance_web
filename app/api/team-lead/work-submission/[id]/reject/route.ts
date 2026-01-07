import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { team_lead_id, team_lead_name, comments } = await request.json()
    const { id: submissionId } = await params

    console.log("Reject request:", { team_lead_id, submissionId, comments })

    if (!team_lead_id || !submissionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get the work submission with employee info
    const { data: submission, error: submissionError } = await supabase
      .from("work_submissions")
      .select(`
        id,
        employee_id,
        status,
        employee:employees!work_submissions_employee_id_fkey(
          id,
          employee_id
        )
      `)
      .eq("id", submissionId)
      .single()

    if (submissionError) {
      console.error("Submission error:", submissionError)
      return NextResponse.json({ error: "Work submission not found" }, { status: 404 })
    }

    if (!submission) {
      return NextResponse.json({ error: "Work submission not found" }, { status: 404 })
    }

    console.log("Found submission:", submission)

    // Check if the employee is a team member of this team lead
    const { data: teamMember, error: teamError } = await supabase
      .from("team_members")
      .select("id, employee_id, team_lead_id")
      .eq("team_lead_id", team_lead_id)
      .eq("employee_id", submission.employee_id)
      .eq("is_active", true)
      .single()

    console.log("Team member check:", { teamMember, teamError })

    if (teamError || !teamMember) {
      console.error("Team member error:", teamError)
      return NextResponse.json(
        {
          error: "Unauthorized: Employee is not in your team",
          debug: { teamError, submission_employee_id: submission.employee_id, team_lead_id }
        },
        { status: 403 }
      )
    }

    // Update the submission status to "Rejected by Team Lead" (final rejection, no manager review needed)
    const { data: updatedSubmission, error: updateError } = await supabase
      .from("work_submissions")
      .update({
        status: "Rejected by Team Lead",
        team_lead_rejected_at: new Date().toISOString(),
        team_lead_id: team_lead_id,
        team_lead_comments: comments || null, // Add team lead comments
        rejection_reason: comments || "No reason provided",
      })
      .eq("id", submissionId)
      .select()

    if (updateError) {
      console.error("Error updating submission:", updateError)
      return NextResponse.json({ error: "Failed to reject submission" }, { status: 500 })
    }

    console.log("Updated submission:", updatedSubmission)

    // Create notification for the employee - using recipient_id to match your schema
    const externalEmployeeId = submission.employee?.employee_id
    if (externalEmployeeId) {
      // First, get the employee UUID from the external employee_id
      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .select("id")
        .eq("employee_id", externalEmployeeId)
        .single()

      if (employeeData && !employeeError) {
        const { error: notificationError } = await supabase
          .from("notifications")
          .insert({
            recipient_type: "employee",
            recipient_id: employeeData.id, // Use the UUID, not the external ID
            title: "Work Submission Rejected",
            message: `Your work submission has been rejected by your team lead. ${comments ? `Reason: ${comments}` : 'No reason provided'}`,
            type: "work_rejection",
            reference_id: submissionId,
            is_read: false,
          })

        if (notificationError) {
          console.error("Error creating notification:", notificationError)
          // Don't fail the request if notification fails
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Work submission rejected successfully",
    })
  } catch (error) {
    console.error("Error rejecting submission:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}