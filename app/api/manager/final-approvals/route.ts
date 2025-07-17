import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const manager_id = searchParams.get("manager_id")

    if (!manager_id) {
      return NextResponse.json({ error: "Manager ID is required" }, { status: 400 })
    }

    console.log("Fetching final approvals for manager:", manager_id)

    // Fetch all submissions that are pending final approval or have been processed by this manager
    const { data: submissions, error } = await supabase
      .from("work_submissions")
      .select(`
        id,
        employee_id,
        employee_name,
        title,
        work_type,
        work_description,
        department,
        priority,
        status,
        submitted_date,
        team_lead_approved_at,
        team_lead_id,
        team_lead_comments,
        manager_id,
        manager_name,
        manager_comments,
        final_approved_date,
        final_rejected_date,
        created_at,
        updated_at,
        employee:employees!work_submissions_employee_id_fkey(
          id,
          employee_id,
          name,
          designation
        )
      `)
      .in("status", ["Pending Final Approval", "Final Approved", "Final Rejected"])
      .order("submitted_date", { ascending: false })

    if (error) {
      console.error("Error fetching final approvals:", error)
      return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 })
    }

    console.log("Found submissions:", submissions?.length || 0)

    // Format the data for the frontend
    const formattedApprovals = submissions?.map(submission => ({
      id: submission.id,
      title: submission.title || submission.work_type,
      employee_name: submission.employee_name,
      team_lead_name: "Team Lead", // You might want to fetch this from team_members table
      department: submission.department || "N/A",
      work_type: submission.work_type,
      work_description: submission.work_description,
      priority: submission.priority,
      status: submission.status,
      submitted_date: submission.submitted_date,
      approved_by_team_lead_date: submission.team_lead_approved_at,
      team_lead_comments: submission.team_lead_comments,
      manager_comments: submission.manager_comments,
      final_approved_date: submission.final_approved_date,
      final_rejected_date: submission.final_rejected_date,
    })) || []

    console.log("Formatted approvals:", formattedApprovals.length)

    return NextResponse.json({
      success: true,
      approvals: formattedApprovals,
    })
  } catch (error) {
    console.error("Error in final approvals API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}