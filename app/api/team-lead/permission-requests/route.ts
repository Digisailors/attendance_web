import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

const supabase = createServerSupabaseClient();

// 🟩 POST — Employee applies for Permission
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeId, permissionType, date, startTime, endTime, reason } =
      body;

    if (
      !employeeId ||
      !permissionType ||
      !date ||
      !startTime ||
      !endTime ||
      !reason
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1️⃣ Fetch employee details (includes manager)
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("id, name, email_address, manager_id")
      .eq("id", employeeId)
      .single();

    if (empError || !employee)
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );

    // 2️⃣ Fetch all active team leads for this employee
    const { data: teamMembers, error: teamError } = await supabase
      .from("team_members")
      .select("team_lead_id")
      .eq("employee_id", employeeId)
      .eq("is_active", true);

    if (teamError || !teamMembers || teamMembers.length === 0) {
      return NextResponse.json(
        { error: "No active team leads found" },
        { status: 404 }
      );
    }

    const teamLeadIds = teamMembers.map((tm) => tm.team_lead_id);
    const permissionGroupId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2);

    // 3️⃣ Insert into permission_requests (with team_lead_id as null initially)
    const { data: inserted, error: insertError } = await supabase
      .from("permission_requests")
      .insert({
        employee_id: employee.id,
        employee_name: employee.name,
        employee_email: employee.email_address,
        permission_type: permissionType,
        date,
        start_time: startTime,
        end_time: endTime,
        reason,
        status: "Pending Team Lead",
        team_lead_id: null, // ✅ Will be set when a team lead approves/rejects
        team_lead_ids: teamLeadIds, // ✅ Array of all eligible team leads
        manager_id: employee.manager_id,
        permission_group_id: permissionGroupId,
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Insert failed:", insertError);
      return NextResponse.json(
        { error: "Failed to submit permission request" },
        { status: 500 }
      );
    }

    // 4️⃣ Notify all team leads
    const notifications = teamLeadIds.map((leadId) => ({
      recipient_type: "team-lead",
      recipient_id: leadId,
      title: "New Permission Request",
      message: `${employee.name} submitted a permission request for ${permissionType}`,
      type: "permission_request",
      reference_id: permissionGroupId,
    }));

    await supabase.from("notifications").insert(notifications);

    return NextResponse.json(
      { message: "Permission request submitted successfully", data: inserted },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error in Permission POST:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// 🟦 GET — Team Lead fetches all permission requests
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const teamLeadId = url.searchParams.get("teamLeadId");
    const month = url.searchParams.get("month");
    const year = url.searchParams.get("year");

    let query = supabase
      .from("permission_requests")
      .select("*")
      .order("created_at", { ascending: false });

    // Filter by teamLeadId if provided (check if teamLeadId is in team_lead_ids array)
    if (teamLeadId) {
      query = query.contains("team_lead_ids", [teamLeadId]);
    }

    // Filter by date if provided
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      query = query
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());
    }

    const { data: requests, error } = await query;

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    // Manually fetch employee details for each permission request
    const results = [];
    for (const req of requests || []) {
      const { data: emp } = await supabase
        .from("employees")
        .select(
          "name, id as employee_id, designation, phoneNumber, emailAddress, address"
        )
        .eq("id", req.employee_id)
        .single();
      results.push({ ...req, employee: emp || null });
    }

    console.log(`Fetched ${results.length} permission requests`);
    return NextResponse.json({ data: results }, { status: 200 });
  } catch (err) {
    console.error("GET Permission error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// 🟥 PATCH — Team Lead approves/rejects
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, action, teamLeadId, comments, userType } = body;

    if (!requestId || !action || !teamLeadId || !userType) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: requestId, action, teamLeadId, userType",
        },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Use "approve" or "reject"' },
        { status: 400 }
      );
    }

    // 1️⃣ Fetch the permission request
    const { data: permissionRequest, error: fetchError } = await supabase
      .from("permission_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (fetchError || !permissionRequest) {
      return NextResponse.json(
        { error: "Permission request not found" },
        { status: 404 }
      );
    }

    // 2️⃣ Check if this team lead is eligible to process this request
    if (
      !permissionRequest.team_lead_ids ||
      !permissionRequest.team_lead_ids.includes(teamLeadId)
    ) {
      return NextResponse.json(
        {
          error: "You are not authorized to process this permission request",
        },
        { status: 403 }
      );
    }

    // 3️⃣ Check if the request is still pending
    if (!["Pending Team Lead", "Pending"].includes(permissionRequest.status)) {
      return NextResponse.json(
        { error: "This permission request has already been processed" },
        { status: 400 }
      );
    }

    // 4️⃣ Prepare update data
    const updateData: any = {
      team_lead_comments: comments || null,
      team_lead_id: teamLeadId, // ✅ Set the acting team lead who approved/rejected
    };

    let notificationTitle = "";
    let notificationMessage = "";
    let notificationRecipientId = permissionRequest.employee_id;
    let notificationRecipientType = "employee";

    if (action === "approve") {
      updateData.status = "Pending Manager Approval";
      updateData.approved_at = new Date().toISOString();

      notificationTitle = "Permission Request Approved by Team Lead";
      notificationMessage = `Your permission request for ${permissionRequest.permission_type} has been approved by your Team Lead and is now pending Manager approval.`;

      // Also notify manager if exists
      if (permissionRequest.manager_id) {
        setTimeout(async () => {
          await supabase.from("notifications").insert({
            recipient_type: "manager",
            recipient_id: permissionRequest.manager_id,
            title: "Permission Request Pending Approval",
            message: `${permissionRequest.employee_name}'s permission request for ${permissionRequest.permission_type} has been approved by Team Lead and requires your approval.`,
            type: "permission_request_pending",
            reference_id: permissionRequest.id,
          });
        }, 100);
      }
    } else {
      updateData.status = "Rejected";
      updateData.rejected_at = new Date().toISOString();

      notificationTitle = "Permission Request Rejected";
      notificationMessage = `Your permission request for ${permissionRequest.permission_type} has been rejected by your Team Lead.`;
    }

    // 5️⃣ Update the permission request
    const { data: updatedRequest, error: updateError } = await supabase
      .from("permission_requests")
      .update(updateData)
      .eq("id", requestId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating permission request:", updateError);
      return NextResponse.json(
        { error: "Failed to update permission request" },
        { status: 500 }
      );
    }

    // 6️⃣ Create notification for employee
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        recipient_type: notificationRecipientType,
        recipient_id: notificationRecipientId,
        title: notificationTitle,
        message:
          notificationMessage + (comments ? ` Comment: ${comments}` : ""),
        type: "permission_request_update",
        reference_id: permissionRequest.id,
      });

    if (notificationError) {
      console.error("Error creating notification:", notificationError);
    }

    return NextResponse.json({
      message: `Permission request ${action}d successfully`,
      data: updatedRequest,
    });
  } catch (error) {
    console.error("Error in PATCH permission request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
