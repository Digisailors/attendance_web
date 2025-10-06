import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

// 🔄 Utility to resolve employeeId (UUID) from either UUID or code
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
  const supabase = createServerSupabaseClient()

  try {
    const body = await request.json()
    const { employeeId: rawEmployeeId, permissionType, date, startTime, endTime, reason } = body

    if (!rawEmployeeId || !permissionType || !date || !startTime || !endTime || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const employeeId = await resolveEmployeeId(supabase, rawEmployeeId)
    if (!employeeId) return NextResponse.json({ error: "Invalid employee ID or code" }, { status: 404 })

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, name, email_address, manager_id")
      .eq("id", employeeId)
      .single()

    if (employeeError || !employee) {
      console.error("Employee fetch error:", employeeError)
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    const { data: teamMember, error: teamError } = await supabase
      .from("team_members")
      .select("team_lead_id")
      .eq("employee_id", employeeId)
      .eq("is_active", true)
      .single()

    if (teamError || !teamMember) {
      console.error("Team member fetch error:", teamError)
      return NextResponse.json({ error: "Team lead not found for this employee" }, { status: 404 })
    }

    const { data: permissionRequest, error: insertError } = await supabase
      .from("permission_requests")
      .insert({
        employee_id: employeeId,
        employee_name: employee.name,
        employee_email: employee.email_address,
        team_lead_id: teamMember.team_lead_id,
        manager_id: employee.manager_id,
        permission_type: permissionType,
        date,
        start_time: startTime,
        end_time: endTime,
        reason,
        status: "Pending Team Lead",
      })
      .select()
      .single()

    if (insertError) {
      console.error("Insert permission request error:", insertError)
      return NextResponse.json({ error: "Failed to submit permission request" }, { status: 500 })
    }

    await supabase.from("notifications").insert({
      recipient_type: "team-lead",
      recipient_id: teamMember.team_lead_id,
      title: "New Permission Request",
      message: `${employee.name} has submitted a permission request for ${permissionType}`,
      type: "permission_request",
      reference_id: permissionRequest.id,
    })

    return NextResponse.json({
      message: "Permission request submitted successfully",
      data: permissionRequest,
    })
  } catch (error) {
    console.error("Error in permission POST API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();

  try {
    const { searchParams } = new URL(request.url);
    const employeeRaw = searchParams.get("employeeId");
    const teamLeadRaw = searchParams.get("teamLeadId");
    const count = searchParams.get("count") === "true";

    console.log("📥 Permission Request API Called");
    console.log("teamLeadRaw:", teamLeadRaw);

    if (teamLeadRaw) {
      // Step 1: Resolve team lead UUID
      console.log("teamLeadRaw:", teamLeadRaw);
      const teamLeadUUID = await resolveEmployeeId(supabase, teamLeadRaw);
      console.log("Resolved Team Lead UUID:", teamLeadUUID);

      if (!teamLeadUUID) {
        return NextResponse.json(
          { error: "Invalid team lead ID" },
          { status: 404 }
        );
      }

      // Step 2: Fetch active team members - FIXED: Remove nested select
      const { data: teamMembers, error: teamError } = await supabase
        .from("team_members")
        .select("employee_id")
        .eq("team_lead_id", teamLeadUUID)
        .eq("is_active", true);

      console.log("👥 Team Members Query Result:", {
        count: teamMembers?.length || 0,
        error: teamError,
        members: teamMembers,
      });

      if (teamError) {
        console.error("❌ Team members fetch error:", teamError);
        return NextResponse.json(
          { error: "Failed to fetch team members", details: teamError.message },
          { status: 500 }
        );
      }

     const teamMemberIds = (teamMembers || []).map((tm) => tm.employee_id);
     console.log("Team Member IDs:", teamMemberIds);
     teamMemberIds.push(teamLeadUUID);
      // Step 3: Fetch permission requests for team members
     let query = supabase
       .from("permission_requests")
       .select("*", { count: count ? "exact" : undefined })
       .in("employee_id", teamMemberIds)
       .order("created_at", { ascending: false });


      const { data, error, count: total } = await query;

      console.log("📊 Permission Requests Query Result:", {
        count: data?.length || 0,
        error: error,
        total: total,
      });

      if (error) {
        console.error("❌ Permission request fetch error:", error);
        return NextResponse.json(
          { error: "Failed to fetch permission requests" },
          { status: 500 }
        );
      }

      // Step 4: Fetch employee details for the requests
      if (data && data.length > 0) {
        const employeeIds = [...new Set(data.map((req) => req.employee_id))];

        const { data: employees, error: empError } = await supabase
          .from("employees")
          .select(
            "id, name, employee_id, designation, phoneNumber, emailAddress, address"
          )
          .in("id", employeeIds);

        console.log("👤 Employee Details:", {
          count: employees?.length || 0,
          error: empError,
        });

        if (!empError && employees) {
          const employeeMap = new Map(employees.map((emp) => [emp.id, emp]));

          data.forEach((request) => {
            const employee = employeeMap.get(request.employee_id);
            if (employee) {
              request.employee = {
                name: employee.name,
                employee_id: employee.employee_id,
                designation: employee.designation,
                phoneNumber: employee.phoneNumber,
                emailAddress: employee.emailAddress,
                address: employee.address,
              };
            }
          });
        }
      }

      console.log("✅ Returning permission requests:", data?.length || 0);
      return NextResponse.json({ data: data || [], count: total || 0 });
    }

    // Handle employeeId case
    if (employeeRaw) {
      const employeeId = await resolveEmployeeId(supabase, employeeRaw);
      if (!employeeId) {
        return NextResponse.json(
          { error: "Invalid employee ID or code" },
          { status: 404 }
        );
      }

      let query = supabase
        .from("permission_requests")
        .select("*", { count: count ? "exact" : undefined })
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false });

      const { data, error, count: total } = await query;

      if (error) {
        console.error("Permission request fetch error:", error);
        return NextResponse.json(
          { error: "Failed to fetch permission requests" },
          { status: 500 }
        );
      }

      return NextResponse.json({ data: data || [], count: total || 0 });
    }

    return NextResponse.json(
      { error: "Missing employeeId or teamLeadId" },
      { status: 400 }
    );
  } catch (error) {
    console.error("💥 Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
export async function PATCH(request: NextRequest) {
  const supabase = createServerSupabaseClient()

  try {
    const body = await request.json()
    const { requestId, action, teamLeadId, managerId, comments, userType } = body

    if (!requestId || !action || !userType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { data: permissionRequest, error: fetchError } = await supabase
      .from("permission_requests")
      .select("*")
      .eq("id", requestId)
      .single()

    if (fetchError || !permissionRequest) {
      return NextResponse.json({ error: "Permission request not found" }, { status: 404 })
    }

    if (userType === "team-lead") {
      if (!teamLeadId || permissionRequest.team_lead_id !== teamLeadId) {
        return NextResponse.json({ error: "Unauthorized team lead" }, { status: 403 })
      }
      if (permissionRequest.status !== "Pending Team Lead") {
        return NextResponse.json({ error: "Invalid status for team lead action" }, { status: 400 })
      }
    } else if (userType === "manager") {
      if (!managerId || permissionRequest.manager_id !== managerId) {
        return NextResponse.json({ error: "Unauthorized manager" }, { status: 403 })
      }
      if (permissionRequest.status !== "Pending Manager Approval") {
        return NextResponse.json({ error: "Invalid status for manager action" }, { status: 400 })
      }
    }

    const updateData: any = {}
    let notification = {
      recipient_id: permissionRequest.employee_id,
      recipient_type: "employee",
      title: "",
      message: "",
      type: "permission_request_update",
      reference_id: requestId,
    }

    if (action === "approve") {
      if (userType === "team-lead") {
        updateData.status = "Pending Manager Approval"
        updateData.team_lead_comments = comments || null
        notification.title = "Approved by Team Lead"
        notification.message = `Your permission request is approved by your Team Lead.`
        notification.recipient_id = permissionRequest.manager_id
        notification.recipient_type = "manager"
      } else {
        updateData.status = "Approved"
        updateData.manager_comments = comments || null
        updateData.approved_at = new Date().toISOString()
        notification.title = "Permission Approved"
        notification.message = `Your permission request has been approved.`
      }
    } else {
      updateData.status = "Rejected"
      updateData.rejected_at = new Date().toISOString()
      if (userType === "team-lead") {
        updateData.team_lead_comments = comments || null
        notification.message = `Your request was rejected by your Team Lead.`
      } else {
        updateData.manager_comments = comments || null
        notification.message = `Your request was rejected by your Manager.`
      }
      notification.title = "Permission Rejected"
    }

    const { data: updatedRequest, error: updateError } = await supabase
      .from("permission_requests")
      .update(updateData)
      .eq("id", requestId)
      .select()
      .single()

    if (updateError) {
      console.error("Update error:", updateError)
      return NextResponse.json({ error: "Failed to update request" }, { status: 500 })
    }

    await supabase.from("notifications").insert(notification)

    return NextResponse.json({
      message: `Permission request ${action === "approve" ? "approved" : "rejected"} successfully`,
      data: updatedRequest,
    })
  } catch (error) {
    console.error("PATCH error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
