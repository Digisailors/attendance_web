import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

// Utility to resolve employeeId (UUID) from either UUID or code
async function resolveEmployeeId(
  supabase: any,
  rawId: string
): Promise<string | null> {
  const isUuid = rawId.includes("-") && rawId.length >= 36;
  if (isUuid) return rawId;

  const { data, error } = await supabase
    .from("employees")
    .select("id")
    .eq("employee_id", rawId)
    .single();

  if (error || !data) {
    console.error("Failed to resolve employee ID:", error);
    return null;
  }

  return data.id;
}

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

    // Get employee details
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, name, email_address, manager_id")
      .eq("id", employeeId)
      .single();

    if (employeeError || !employee) {
      console.error("Employee fetch error:", employeeError);
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // ✅ Get ALL team leads for this employee
    const { data: teamMembers, error: teamError } = await supabase
      .from("team_members")
      .select("team_lead_id")
      .eq("employee_id", employeeId)
      .eq("is_active", true);

    if (teamError || !teamMembers || teamMembers.length === 0) {
      console.error("Team member fetch error:", teamError);
      return NextResponse.json(
        { error: "No active team leads found for this employee" },
        { status: 404 }
      );
    }

    // Extract all team lead IDs
    const teamLeadIds = teamMembers.map((tm) => tm.team_lead_id);
    console.log("Team Lead IDs for employee:", teamLeadIds);

    // ✅ Insert permission request with ALL team leads
    const { data: permissionRequest, error: insertError } = await supabase
      .from("permission_requests")
      .insert({
        employee_id: employeeId,
        employee_name: employee.name,
        employee_email: employee.email_address,
        team_lead_id: teamLeadIds[0], // First team lead (for backward compatibility)
        team_lead_ids: teamLeadIds, // ✅ Store all team leads
        manager_id: employee.manager_id,
        permission_type: permissionType,
        date: date,
        start_time: startTime,
        end_time: endTime,
        reason: reason,
        status: "Pending Team Lead",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting permission request:", insertError);
      return NextResponse.json(
        { error: "Failed to submit permission request" },
        { status: 500 }
      );
    }

    // ✅ Create notifications for ALL team leads
    const notificationPromises = teamLeadIds.map((teamLeadId) =>
      supabase.from("notifications").insert({
        recipient_type: "team-lead",
        recipient_id: teamLeadId,
        title: "New Permission Request",
        message: `${employee.name} has submitted a permission request for ${permissionType}`,
        type: "permission_request",
        reference_id: permissionRequest.id,
      })
    );

    await Promise.all(notificationPromises);
    console.log(`Sent notifications to ${teamLeadIds.length} team leads`);

    return NextResponse.json({
      message: "Permission request submitted successfully",
      data: permissionRequest,
    });
  } catch (error) {
    console.error("Error in permission request API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const teamLeadId = searchParams.get("teamLeadId");
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");

    console.log("🔍 GET Permission Requests:", {
      teamLeadId,
      employeeId,
      status,
    });

    const supabase = createServerSupabaseClient();

    // ✅ EMPLOYEE VIEW: Fetch their own permission requests
    if (employeeId && !teamLeadId) {
      console.log("📋 Fetching permission requests for employee:", employeeId);

      // Resolve employee code to UUID if needed
      const resolvedEmployeeId = await resolveEmployeeId(supabase, employeeId);

      if (!resolvedEmployeeId) {
        return NextResponse.json(
          { error: "Employee not found" },
          { status: 404 }
        );
      }

      let query = supabase
        .from("permission_requests")
        .select(
          `
          *,
          employee:employees!fk_employee_id(
            name,
            employee_id,
            designation,
            phone_number,
            email_address,
            address
          )
        `
        )
        .eq("employee_id", resolvedEmployeeId)
        .order("created_at", { ascending: false });

      // Apply status filter if provided and not "All"
      if (status && status !== "All") {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) {
        console.error("❌ Error fetching employee permission requests:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      console.log("✅ Found permission requests:", data?.length);

      const transformedData = data?.map((request) => ({
        id: request.id,
        employee_id: request.employee_id,
        employee_name: request.employee?.name || request.employee_name,
        permission_type: request.permission_type,
        date: request.date,
        start_time: request.start_time,
        end_time: request.end_time,
        duration_hours: request.duration_hours || 0,
        reason: request.reason,
        status: request.status,
        applied_date: request.created_at,
        created_at: request.created_at,
        team_lead_comments: request.team_lead_comments,
        manager_comments: request.manager_comments,
        employee: {
          name: request.employee?.name || "Unknown",
          employee_id: request.employee?.employee_id || "",
          designation: request.employee?.designation || "",
          phone_number: request.employee?.phone_number,
          email_address: request.employee?.email_address,
          address: request.employee?.address,
        },
      }));

      return NextResponse.json({ data: transformedData }, { status: 200 });
    }

    // ✅ TEAM LEAD VIEW: Fetch requests for their team members
    if (teamLeadId && !employeeId) {
      console.log("🔍 Fetching permission requests for team lead:", teamLeadId);

      // Step 1: Get the team lead's internal UUID
      const { data: teamLeadEmployee, error: teamLeadError } = await supabase
        .from("employees")
        .select("id, employee_id")
        .eq("employee_id", teamLeadId)
        .single();

      if (teamLeadError || !teamLeadEmployee) {
        console.error("❌ Team lead not found:", teamLeadError);
        return NextResponse.json(
          { error: "Team lead not found" },
          { status: 404 }
        );
      }

      console.log("✅ Team lead found:", teamLeadEmployee);

      // Step 2: Get ALL active team members (employee UUIDs)
      const { data: teamMembers, error: teamError } = await supabase
        .from("team_members")
        .select("employee_id")
        .eq("team_lead_id", teamLeadId)
        .eq("is_active", true);

      if (teamError) {
        console.error("❌ Error fetching team members:", teamError);
        return NextResponse.json(
          { error: "Failed to fetch team members" },
          { status: 500 }
        );
      }

      const teamMemberIds = teamMembers?.map((tm) => tm.employee_id) || [];
      console.log("👥 Team member UUIDs:", teamMemberIds);

      if (teamMemberIds.length === 0) {
        console.warn("⚠️ No team members found for this team lead");
        return NextResponse.json({ data: [] }, { status: 200 });
      }

      // Step 3: Fetch permission requests for team members
      const { data, error } = await supabase
        .from("permission_requests")
        .select(
          `
          *,
          employee:employees!fk_employee_id(
            name,
            employee_id,
            designation,
            phone_number,
            email_address,
            address
          )
        `
        )
        .in("employee_id", teamMemberIds)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Supabase query error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      console.log("📦 Permission requests found:", data?.length);

      // Step 4: Filter requests
      const filteredData = data?.filter((request) => {
        const isPending = ["Pending Team Lead", "Pending"].includes(
          request.status
        );
        const processedByThisTeamLead = request.team_lead_id === teamLeadId;
        return isPending || processedByThisTeamLead;
      });

      console.log(
        "✅ Filtered requests (pending or processed by this TL):",
        filteredData?.length
      );

      // Step 5: Transform the data
      const transformedData = filteredData?.map((request) => ({
        id: request.id,
        employee_id: request.employee_id,
        employee_name: request.employee?.name || request.employee_name,
        permission_type: request.permission_type,
        date: request.date,
        start_time: request.start_time,
        end_time: request.end_time,
        duration_hours: request.duration_hours || 0,
        reason: request.reason,
        status: request.status,
        applied_date: request.created_at,
        created_at: request.created_at,
        team_lead_comments: request.team_lead_comments,
        manager_comments: request.manager_comments,
        team_lead_id: request.team_lead_id,
        team_lead_ids: request.team_lead_ids || [teamLeadId],
        employee: {
          name: request.employee?.name || "Unknown",
          employee_id: request.employee?.employee_id || "",
          designation: request.employee?.designation || "",
          phoneNumber: request.employee?.phone_number,
          emailAddress: request.employee?.email_address,
          address: request.employee?.address,
        },
      }));

      console.log("✨ Transformed data count:", transformedData?.length);

      return NextResponse.json({ data: transformedData }, { status: 200 });
    }

    // ❌ Neither teamLeadId nor employeeId provided
    return NextResponse.json(
      { error: "Missing required parameter: teamLeadId or employeeId" },
      { status: 400 }
    );
  } catch (err) {
    console.error("❌ API Crash:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = createServerSupabaseClient();

  try {
    const body = await request.json();
    const { requestId, action, teamLeadId, managerId, comments, userType } =
      body;

    console.log("🔄 PATCH Permission Request:", {
      requestId,
      action,
      teamLeadId,
      userType,
    });

    if (!requestId || !action || !userType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Fetch the permission request
    const { data: permissionRequest, error: fetchError } = await supabase
      .from("permission_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (fetchError || !permissionRequest) {
      console.error("❌ Request not found:", fetchError);
      return NextResponse.json(
        { error: "Permission request not found" },
        { status: 404 }
      );
    }

    console.log("📋 Found request:", {
      id: permissionRequest.id,
      employee_id: permissionRequest.employee_id,
      status: permissionRequest.status,
    });

    if (userType === "team-lead") {
      if (!teamLeadId) {
        return NextResponse.json(
          { error: "Team lead ID required" },
          { status: 400 }
        );
      }

      // ✅ Verify this team lead manages this employee
      const { data: teamMember, error: teamError } = await supabase
        .from("team_members")
        .select("id, team_lead_id")
        .eq("employee_id", permissionRequest.employee_id)
        .eq("team_lead_id", teamLeadId)
        .eq("is_active", true)
        .single();

      console.log("🔍 Team member check:", { teamMember, teamError });

      if (teamError || !teamMember) {
        console.error("❌ Team member verification failed:", teamError);
        return NextResponse.json(
          {
            error:
              "You are not authorized to process this request. This employee is not in your team.",
          },
          { status: 403 }
        );
      }

      console.log("✅ Team lead authorized:", teamLeadId);

      // ✅ Check if request is still pending (not processed by ANY team lead yet)
      if (
        !["Pending Team Lead", "Pending"].includes(permissionRequest.status)
      ) {
        return NextResponse.json(
          {
            error: `Request already processed. Current status: ${permissionRequest.status}`,
          },
          { status: 400 }
        );
      }

      console.log("✅ Request is pending, proceeding with action:", action);
    } else if (userType === "manager") {
      if (!managerId || permissionRequest.manager_id !== managerId) {
        return NextResponse.json(
          { error: "Unauthorized manager" },
          { status: 403 }
        );
      }
      if (permissionRequest.status !== "Pending Manager Approval") {
        return NextResponse.json(
          { error: "Invalid status for manager action" },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    let notification = {
      recipient_id: permissionRequest.employee_id,
      recipient_type: "employee",
      title: "",
      message: "",
      type: "permission_request_update",
      reference_id: requestId,
    };

    if (action === "approve") {
      if (userType === "team-lead") {
        // ✅ Move to manager approval - no other team lead can approve now
        updateData.status = "Pending Manager Approval";
        updateData.team_lead_comments = comments || null;
        updateData.team_lead_id = teamLeadId; // Store which team lead approved

        // Add this team lead to the processed array
        const currentTeamLeadIds = permissionRequest.team_lead_ids || [];
        if (!currentTeamLeadIds.includes(teamLeadId)) {
          updateData.team_lead_ids = [...currentTeamLeadIds, teamLeadId];
        }

        notification.title = "Permission Approved by Team Lead";
        notification.message = `Your permission request has been approved by your Team Lead and is now pending Manager approval.`;
        notification.recipient_id = permissionRequest.manager_id;
        notification.recipient_type = "manager";
      } else {
        updateData.status = "Approved";
        updateData.manager_comments = comments || null;
        updateData.approved_at = new Date().toISOString();
        notification.title = "Permission Approved";
        notification.message = `Your permission request has been fully approved.`;
      }
    } else if (action === "reject") {
      // ✅ Reject immediately - no other team lead can process now
      updateData.status = "Rejected";
      updateData.rejected_at = new Date().toISOString();

      if (userType === "team-lead") {
        updateData.team_lead_comments = comments || null;
        updateData.team_lead_id = teamLeadId; // Store which team lead rejected

        // Add this team lead to the processed array
        const currentTeamLeadIds = permissionRequest.team_lead_ids || [];
        if (!currentTeamLeadIds.includes(teamLeadId)) {
          updateData.team_lead_ids = [...currentTeamLeadIds, teamLeadId];
        }

        notification.title = "Permission Rejected";
        notification.message = `Your permission request has been rejected by your Team Lead.${
          comments ? ` Reason: ${comments}` : ""
        }`;
      } else {
        updateData.manager_comments = comments || null;
        notification.title = "Permission Rejected";
        notification.message = `Your permission request has been rejected by your Manager.${
          comments ? ` Reason: ${comments}` : ""
        }`;
      }
    }

    console.log("📝 Updating request with data:", updateData);

    // Update the request
    const { data: updatedRequest, error: updateError } = await supabase
      .from("permission_requests")
      .update(updateData)
      .eq("id", requestId)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update request" },
        { status: 500 }
      );
    }

    // Send notification to employee
    const { error: notifError } = await supabase
      .from("notifications")
      .insert(notification);

    if (notifError) {
      console.warn("⚠️ Notification failed:", notifError);
    }

    console.log(
      `✅ Permission request ${action}d by ${userType} ${
        teamLeadId || managerId
      }`
    );

    return NextResponse.json({
      message: `Permission request ${
        action === "approve" ? "approved" : "rejected"
      } successfully`,
      data: updatedRequest,
    });
  } catch (error) {
    console.error("❌ PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
