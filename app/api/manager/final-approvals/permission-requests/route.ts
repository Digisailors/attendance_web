import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();

  try {
    const { searchParams } = new URL(request.url);
    const managerId = searchParams.get("managerId");
    const status = searchParams.get("status");

    let query = supabase
      .from("permission_requests")
      .select(
        `
        *,
        employee:employees!fk_employee_id(
          id, 
          name, 
          email_address
        )
      `
      )
      .eq("manager_id", managerId)
      .order("created_at", { ascending: false });

    if (status && status !== "All") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching permission requests:", error);
      return NextResponse.json(
        { error: "Failed to fetch permission requests" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error("Error in GET permission requests:", error);
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
    const { requestId, action, comments, userType } = body;

    if (!requestId || !action || !userType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Use "approve" or "reject"' },
        { status: 400 }
      );
    }

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

    if (permissionRequest.status !== "Pending Manager Approval") {
      return NextResponse.json(
        {
          error: `Request is not pending manager approval (current status: ${permissionRequest.status})`,
        },
        { status: 400 }
      );
    }

    const updateData: any = {
      manager_comments: comments || null,
    };

    let notificationTitle = "";
    let notificationMessage = "";
    let notificationRecipientId = permissionRequest.employee_id;

    if (action === "approve") {
      updateData.status = "Approved";
      updateData.approved_at = new Date().toISOString();
      notificationTitle = "Permission Request Approved";
      notificationMessage = `Your permission request for ${permissionRequest.permission_type} has been fully approved.`;
    } else {
      updateData.status = "Rejected";
      updateData.rejected_at = new Date().toISOString();
      notificationTitle = "Permission Request Rejected";
      notificationMessage = `Your permission request for ${permissionRequest.permission_type} has been rejected.`;
    }

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

    // Create notification for employee
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        recipient_type: "employee",
        recipient_id: notificationRecipientId,
        title: notificationTitle,
        message:
          notificationMessage + (comments ? `. Comments: ${comments}` : ""),
        type: "permission_request_update",
        reference_id: requestId,
      });

    if (notificationError) {
      console.error("Error creating notification:", notificationError);
    }

    return NextResponse.json({
      message: `Permission request ${
        action === "approve" ? "approved" : "rejected"
      } successfully`,
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
