import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, description } = body;

    if (!user_id || !description) {
      return NextResponse.json({ error: "Missing user_id or description" }, { status: 400 });
    }

    // Get the user's role
    const { data: user, error: userError } = await supabase
      .from("employees")
      .select("id, name, user_type") // user_type = 'employee' | 'team-lead'
      .eq("id", user_id)
      .eq("is_active", true)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userType = user.user_type;

    let teamLeadId = null;
    let teamLeadName = null;
    let managerId = null;
    let managerName = null;

    // 👇 Route based on role
    if (userType === "employee") {
      // 🔍 Get team lead of this employee
      const { data: teamMember } = await supabase
        .from("team_members")
        .select("team_lead_id")
        .eq("employee_id", user_id)
        .eq("is_active", true)
        .single();

      if (!teamMember) {
        return NextResponse.json({ error: "Team lead not assigned" }, { status: 400 });
      }

      teamLeadId = teamMember.team_lead_id;

      const { data: teamLead } = await supabase
        .from("employees")
        .select("id, name")
        .eq("id", teamLeadId)
        .single();

      teamLeadName = teamLead?.name;
    } else if (userType === "team-lead") {
      // 🔍 Get any one manager
      const { data: manager } = await supabase
        .from("employees")
        .select("id, name")
        .eq("user_type", "manager")
        .eq("is_active", true)
        .limit(1)
        .single();

      if (!manager) {
        return NextResponse.json({ error: "Manager not found" }, { status: 400 });
      }

      managerId = manager.id;
      managerName = manager.name;
    }

    // 📝 Create submission
    const { data: submission, error: submitError } = await supabase
      .from("work_submissions")
      .insert([
        {
          employee_id: user.id,
          submitted_by: user.id,
          description,
          status:
            userType === "employee"
              ? "Pending Team Lead Approval"
              : "Pending Final Approval",
          team_lead_id: teamLeadId,
          team_lead_name: teamLeadName,
          manager_id: managerId,
          manager_name: managerName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (submitError) {
      console.error("Submission failed:", submitError.message);
      return NextResponse.json({ error: "Work submission failed" }, { status: 500 });
    }

    return NextResponse.json({
      message: "Work submitted successfully",
      submission,
    });
  } catch (err) {
    console.error("Unhandled error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
