import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Get ALL team leads for this employee (multiple team memberships)
    const { data: teamMembers, error: teamError } = await supabase
      .from("team_members")
      .select("team_lead_id")
      .eq("employee_id", employeeId)
      .eq("is_active", true);

    console.log("👥 Team members found:", teamMembers);

    if (teamError) {
      console.error("❌ Error fetching team members:", teamError);
      return NextResponse.json(
        { error: "Failed to fetch team members" },
        { status: 500 }
      );
    }

    if (!teamMembers || teamMembers.length === 0) {
      console.warn("⚠️ No team leads found for employee:", employeeId);
      return NextResponse.json(
        { error: "No team lead found for this employee" },
        { status: 404 }
      );
    }

    // Extract all team lead IDs and filter out any null/undefined values
    const teamLeadIds = teamMembers
      .map((tm) => tm.team_lead_id)
      .filter((id) => id && id !== "DEFAULT_LEAD"); // Remove invalid IDs

    console.log("📋 Team lead IDs extracted:", teamLeadIds);

    if (teamLeadIds.length === 0) {
      console.error("❌ No valid team lead IDs found");
      return NextResponse.json(
        { error: "No valid team lead found for this employee" },
        { status: 404 }
      );
    }

    const primaryTeamLeadId = teamLeadIds[0]; // Use first as primary for backward compatibility

    // Insert permission request
    const { data: permissionRequest, error: insertError } = await supabase
      .from("permission_requests")
      .insert({
        employee_id: employeeId,
        employee_name: employee.name,
        employee_email: employee.email_address,
        team_lead_id: primaryTeamLeadId, // Primary team lead
        team_lead_ids: teamLeadIds, // ALL eligible team leads
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

    // Create notifications for ALL team leads
    const notificationPromises = teamLeadIds.map((tlId) =>
      supabase.from("notifications").insert({
        recipient_type: "team-lead",
        recipient_id: tlId,
        title: "New Permission Request",
        message: `${employee.name} has submitted a permission request for ${permissionType}`,
        type: "permission_request",
        reference_id: permissionRequest.id,
      })
    );

    await Promise.all(notificationPromises).catch((err) => {
      console.error("Error creating notifications:", err);
    });

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const teamLeadId = searchParams.get("teamLeadId");

    console.log("📡 GET Permission Requests - Params:", {
      employeeId,
      teamLeadId,
    });

    let query = supabase
      .from("permission_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (employeeId) {
      query = query.eq("employee_id", employeeId);
    }

    if (teamLeadId) {
      // FIXED: Query using contains for the array
      // This will find all requests where teamLeadId is in the team_lead_ids array
      query = query.contains("team_lead_ids", [teamLeadId]);
      console.log("🔍 Filtering by team_lead_ids contains:", teamLeadId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Error fetching permission requests:", error);
      return NextResponse.json(
        { error: "Failed to fetch permission requests" },
        { status: 500 }
      );
    }

    console.log("✅ Found permission requests:", data?.length || 0);
    if (data && data.length > 0) {
      console.log("📄 Sample request:", {
        id: data[0].id,
        team_lead_id: data[0].team_lead_id,
        team_lead_ids: data[0].team_lead_ids,
        status: data[0].status,
      });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("❌ Error in GET permission requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, action, teamLeadId, comments, userType } = body;

    console.log("🔍 PATCH Request received:", {
      requestId,
      action,
      teamLeadId,
      userType,
    });

    if (!requestId || !action || !teamLeadId || !userType) {
      return NextResponse.json(
        { error: "Missing required fields: requestId, action, teamLeadId" },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Use "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Get the permission request details
    const { data: permissionRequest, error: fetchError } = await supabase
      .from("permission_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (fetchError || !permissionRequest) {
      console.error("❌ Permission request not found:", fetchError);
      return NextResponse.json(
        { error: "Permission request not found" },
        { status: 404 }
      );
    }

    console.log("📋 Permission request data:", {
      id: permissionRequest.id,
      status: permissionRequest.status,
      team_lead_id: permissionRequest.team_lead_id,
      team_lead_ids: permissionRequest.team_lead_ids,
    });

    // Check if request is still pending
    if (!["Pending", "Pending Team Lead"].includes(permissionRequest.status)) {
      return NextResponse.json(
        {
          error: `Request is not pending team lead approval (current status: ${permissionRequest.status})`,
        },
        { status: 400 }
      );
    }

    // **FIXED: Authorization check for multi-team-lead support with fallback**
    let teamLeadIdsArray = permissionRequest.team_lead_ids;

    // Fallback: If team_lead_ids is null/empty, create array from team_lead_id
    if (
      !teamLeadIdsArray ||
      !Array.isArray(teamLeadIdsArray) ||
      teamLeadIdsArray.length === 0
    ) {
      if (permissionRequest.team_lead_id) {
        teamLeadIdsArray = [permissionRequest.team_lead_id];

        // Update the database with this array for future use
        await supabase
          .from("permission_requests")
          .update({ team_lead_ids: teamLeadIdsArray })
          .eq("id", requestId)
          .then(() => console.log("✅ Updated team_lead_ids array"))
          .catch((err) =>
            console.error("⚠️ Failed to update team_lead_ids:", err)
          );
      } else {
        teamLeadIdsArray = [];
      }
    }

    const isInTeamLeadIds = teamLeadIdsArray.includes(teamLeadId);
    const isPrimaryTeamLead = permissionRequest.team_lead_id === teamLeadId;
    const isAuthorized = isInTeamLeadIds || isPrimaryTeamLead;

    console.log("🔐 Authorization check:", {
      requestingTeamLeadId: teamLeadId,
      requestTeamLeadId: permissionRequest.team_lead_id,
      requestTeamLeadIdsArray: teamLeadIdsArray,
      isInTeamLeadIds,
      isPrimaryTeamLead,
      isAuthorized,
    });

    if (!isAuthorized) {
      console.error("❌ Unauthorized team lead:", {
        requestingTeamLead: teamLeadId,
        allowedTeamLeads: teamLeadIdsArray,
        primaryTeamLead: permissionRequest.team_lead_id,
      });
      return NextResponse.json(
        {
          error:
            "Unauthorized: You can only approve/reject requests assigned to you",
        },
        { status: 403 }
      );
    }

    // Update the permission request
    const updateData: any = {
      team_lead_comments: comments || null,
      team_lead_id: teamLeadId, // Record which team lead processed it
    };

    let notificationTitle = "";
    let notificationMessage = "";
    let notificationRecipientId = permissionRequest.employee_id;
    let notificationRecipientType = "employee";

    if (action === "approve") {
      // When team lead approves, send to manager for final approval
      updateData.status = "Pending Manager Approval";
      updateData.approved_at = new Date().toISOString();
      notificationTitle = "Permission Request Approved by Team Lead";
      notificationMessage = `${permissionRequest.employee_name}'s permission request for ${permissionRequest.permission_type} has been approved by their Team Lead and is now pending your approval.`;
      notificationRecipientId = permissionRequest.manager_id;
      notificationRecipientType = "manager";
    } else {
      // When team lead rejects, request is fully rejected
      updateData.status = "Rejected";
      updateData.rejected_at = new Date().toISOString();
      notificationTitle = "Permission Request Rejected";
      notificationMessage = `Your permission request for ${permissionRequest.permission_type} has been rejected by your Team Lead.`;
    }

    console.log("💾 Updating permission request with:", updateData);

    const { data: updatedRequest, error: updateError } = await supabase
      .from("permission_requests")
      .update(updateData)
      .eq("id", requestId)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Error updating permission request:", updateError);
      return NextResponse.json(
        { error: "Failed to update permission request" },
        { status: 500 }
      );
    }

    console.log("✅ Permission request updated successfully");

    // Create notification
    if (notificationRecipientId) {
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          recipient_type: notificationRecipientType,
          recipient_id: notificationRecipientId,
          title: notificationTitle,
          message:
            notificationMessage + (comments ? `. Comment: ${comments}` : ""),
          type: "permission_request_update",
          reference_id: requestId,
        });

      if (notificationError) {
        console.error("Error creating notification:", notificationError);
      }
    }

    return NextResponse.json({
      message: `Permission request ${
        action === "approve" ? "approved and sent to manager" : "rejected"
      } successfully`,
      data: updatedRequest,
    });
  } catch (error) {
    console.error("❌ Error in PATCH permission request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
