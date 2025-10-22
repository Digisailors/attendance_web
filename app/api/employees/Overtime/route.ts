import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { NextRequest, NextResponse } from "next/server";

// Supabase setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to check if string is a valid UUID
const isValidUUID = (uuid: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    uuid
  );
};

// Helper to format datetime to time
const formatToTime = (datetimeStr: string) => {
  const date = new Date(datetimeStr);
  return date.toTimeString().split(" ")[0]; // "HH:MM:SS"
};

// Helper to upload image
const uploadImage = async (file: File | null, ot_id: string, label: string) => {
  if (!file) return null;

  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    throw new Error(
      `${label} upload failed: File too large. Max size is 50MB.`
    );
  }

  const ext = file.name.split(".").pop();
  const path = `ot/${ot_id}_${label}.${ext}`;

  console.log(`📤 Uploading ${label}:`, file.name, file.size, "bytes");

  const { error: uploadError } = await supabase.storage
    .from("ot-images")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (uploadError)
    throw new Error(`${label} upload failed: ${uploadError.message}`);

  const { data: publicUrlData } = supabase.storage
    .from("ot-images")
    .getPublicUrl(path);

  return publicUrlData?.publicUrl ?? null;
};

// POST - STEP 1: Start OT (creates initial record immediately)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employee_id, ot_date, start_time, action } = body;

    console.log("📥 POST Request - Starting OT immediately");
    console.log("Received data:", { employee_id, ot_date, start_time, action });

    // Validate required fields for OT start
    if (!employee_id || !ot_date || !start_time) {
      return NextResponse.json(
        { error: "Missing required fields: employee_id, ot_date, start_time" },
        { status: 400 }
      );
    }

    let employee_uuid = employee_id;

    // Convert employee code to UUID if needed (supports both UUID and employee_id formats)
    if (!isValidUUID(employee_id)) {
      const { data: emp, error: empError } = await supabase
        .from("employees")
        .select("id, employee_id, name")
        .eq("employee_id", employee_id)
        .single();

      if (empError || !emp) {
        return NextResponse.json(
          { error: "Employee not found", details: empError?.message },
          { status: 404 }
        );
      }

      employee_uuid = emp.id;
      console.log(
        "✅ Converted employee code to UUID:",
        employee_id,
        "->",
        emp.id
      );
    }

    // Check if there's already an active OT session for this employee today
    const { data: existingOT } = await supabase
      .from("overtime_requests")
      .select("id, start_time, end_time")
      .eq("employee_id", employee_uuid)
      .eq("ot_date", ot_date)
      .maybeSingle();

    // If active OT exists (end_time is still placeholder), return it
    if (existingOT && existingOT.end_time === "23:59:59") {
      console.log("⚠️ Active OT session already exists:", existingOT.id);
      return NextResponse.json({
        success: true,
        ot_id: existingOT.id,
        message: "Active OT session already exists - resuming",
        existing: true,
      });
    }

    const ot_id = uuidv4();
    const formatted_start_time = formatToTime(start_time);

    // 🎯 CREATE INITIAL OT RECORD IMMEDIATELY WITH START TIME
    const overtimeData = {
      id: ot_id,
      employee_id: employee_uuid,
      ot_date,
      start_time: formatted_start_time,
      end_time: formatted_start_time, // Set same as start_time initially
      reason: "OT in progress - work details pending", // Placeholder
      status: "pending",
      is_active: true, // Mark as active session
      created_at: new Date().toISOString(),
    };

    console.log("💾 SAVING OT START TO DATABASE:", overtimeData);

    const { error: insertError } = await supabase
      .from("overtime_requests")
      .insert([overtimeData]);

    if (insertError) {
      console.log("❌ Database insert failed:", insertError.message);
      return NextResponse.json(
        { error: "Failed to create OT session", details: insertError.message },
        { status: 500 }
      );
    }

    console.log("✅ OT START SAVED TO DATABASE - ID:", ot_id);

    return NextResponse.json({
      success: true,
      ot_id,
      employee_uuid,
      message: "OT started and saved to database",
    });
  } catch (err: any) {
    console.error("❌ Unexpected error:", err.message);
    return NextResponse.json(
      { error: "Unexpected server error", details: err.message },
      { status: 500 }
    );
  }
}

// PUT - STEP 2: Submit work details (updates reason and images)
export async function PUT(req: NextRequest) {
  try {
    const formData = await req.formData();

    const ot_id = formData.get("ot_id") as string;
    const work_type = formData.get("work_type") as string;
    const work_description = formData.get("work_description") as string;

    console.log("📥 PUT Request - Submitting work for OT:", ot_id);

    if (!ot_id || !work_type || !work_description) {
      return NextResponse.json(
        {
          error: "Missing required fields: ot_id, work_type, work_description",
        },
        { status: 400 }
      );
    }

    // Verify OT session exists
    const { data: otSession, error: otError } = await supabase
      .from("overtime_requests")
      .select("id, employee_id, end_time")
      .eq("id", ot_id)
      .single();

    if (otError || !otSession) {
      return NextResponse.json(
        { error: "OT session not found", details: otError?.message },
        { status: 404 }
      );
    }

    // Upload images
    const image1File = formData.get("image1");
    const image2File = formData.get("image2");
    const image1 = image1File instanceof File ? image1File : null;
    const image2 = image2File instanceof File ? image2File : null;

    const image1_url = await uploadImage(image1, ot_id, "img1");
    const image2_url = await uploadImage(image2, ot_id, "img2");

    // Update OT record with work details
    const updateData: any = {
      reason: `${work_type}: ${work_description}`,
      updated_at: new Date().toISOString(),
    };

    if (image1_url) updateData.image1 = image1_url;
    if (image2_url) updateData.image2 = image2_url;

    const { error: updateError } = await supabase
      .from("overtime_requests")
      .update(updateData)
      .eq("id", ot_id);

    if (updateError) {
      console.log("❌ Update failed:", updateError.message);
      return NextResponse.json(
        { error: "Failed to submit work", details: updateError.message },
        { status: 500 }
      );
    }

    console.log("✅ Work submitted successfully for OT:", ot_id);

    return NextResponse.json({
      success: true,
      ot_id,
      image1_url,
      image2_url,
      message: "Work submitted successfully",
    });
  } catch (err: any) {
    console.error("❌ Unexpected error:", err.message);
    return NextResponse.json(
      { error: "Unexpected server error", details: err.message },
      { status: 500 }
    );
  }
}

// PATCH - STEP 3: End OT (updates end_time)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { ot_id, end_time, action } = body;

    console.log("📥 PATCH Request - Ending OT:", ot_id);
    console.log("Received data:", { ot_id, end_time, action });

    if (!ot_id || !end_time) {
      return NextResponse.json(
        { error: "Missing required fields: ot_id, end_time" },
        { status: 400 }
      );
    }

    // Verify OT session exists and has work submitted
    const { data: otSession, error: otError } = await supabase
      .from("overtime_requests")
      .select("id, start_time, image1, image2")
      .eq("id", ot_id)
      .single();

    if (otError || !otSession) {
      return NextResponse.json(
        { error: "OT session not found", details: otError?.message },
        { status: 404 }
      );
    }

    // Ensure work has been submitted (images uploaded)
    if (!otSession.image1 || !otSession.image2) {
      return NextResponse.json(
        { error: "Work must be submitted before ending OT" },
        { status: 400 }
      );
    }

    const formatted_end_time = formatToTime(end_time);

    // Update OT record with actual end time
    const { error: updateError } = await supabase
      .from("overtime_requests")
      .update({
        end_time: formatted_end_time,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ot_id);

    if (updateError) {
      console.log("❌ Update failed:", updateError.message);
      return NextResponse.json(
        { error: "Failed to end OT", details: updateError.message },
        { status: 500 }
      );
    }

    console.log("✅ OT ended successfully:", ot_id);

    return NextResponse.json({
      success: true,
      ot_id,
      message: "OT ended successfully",
    });
  } catch (err: any) {
    console.error("❌ Unexpected error:", err.message);
    return NextResponse.json(
      { error: "Unexpected server error", details: err.message },
      { status: 500 }
    );
  }
}

// GET - Fetch OT requests
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employee_id = searchParams.get("employee_id");
    const team_lead_code = searchParams.get("team_lead_id");
    const date = searchParams.get("date");

    console.log("🔍 GET Request received:", {
      employee_id,
      team_lead_code,
      date,
    });

    // Check for active OT session (NEW - handles /active endpoint)
    if (employee_id && date && req.url.includes("/active")) {
      console.log("🔍 Checking for active OT session...");

      let query = supabase
        .from("overtime_requests")
        .select("*")
        .eq("ot_date", date)
        .eq("end_time", "23:59:59"); // Only get records with placeholder end_time

      if (isValidUUID(employee_id)) {
        query = query.eq("employee_id", employee_id);
      } else {
        const { data: emp } = await supabase
          .from("employees")
          .select("id")
          .eq("employee_id", employee_id)
          .single();

        if (emp) {
          query = query.eq("employee_id", emp.id);
        }
      }

      const { data, error } = await query.maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.log("❌ Error fetching active OT:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      console.log("Active OT result:", data);
      return NextResponse.json(data || null);
    }

    if (team_lead_code) {
      const { data: otRequests, error: otError } = await supabase
        .from("overtime_requests")
        .select(
          `
          *,
          employees!overtime_requests_employee_id_fkey(
            name,
            employee_id,
            team_members!team_members_employee_id_fkey(
              team_lead_id,
              is_active
            )
          )
        `
        )
        .order("ot_date", { ascending: false });

      if (otError) {
        return NextResponse.json(
          { error: "Failed to fetch OT requests", details: otError.message },
          { status: 500 }
        );
      }

      if (!otRequests) {
        return NextResponse.json([]);
      }

      const filteredOTRequests = otRequests.filter((otRequest) => {
        const employee = otRequest.employees;
        if (!employee || !employee.team_members) return false;

        const teamMemberRecords = Array.isArray(employee.team_members)
          ? employee.team_members
          : [employee.team_members];

        return teamMemberRecords.some((tm) => {
          if (!tm || !tm.is_active) return false;
          return (
            tm.team_lead_id === team_lead_code ||
            (typeof tm.team_lead_id === "string" &&
              tm.team_lead_id.includes(team_lead_code))
          );
        });
      });

      return NextResponse.json(filteredOTRequests);
    } else if (employee_id) {
      let query;

      if (isValidUUID(employee_id)) {
        query = supabase
          .from("overtime_requests")
          .select(
            `
            *,
            employees!overtime_requests_employee_id_fkey(name, employee_id)
          `
          )
          .eq("employee_id", employee_id);
      } else {
        query = supabase
          .from("overtime_requests")
          .select(
            `
            *,
            employees!overtime_requests_employee_id_fkey(name, employee_id)
          `
          )
          .eq("employees.employee_id", employee_id);
      }

      const { data, error } = await query.order("ot_date", {
        ascending: false,
      });

      if (error) {
        return NextResponse.json(
          { error: "Failed to fetch OT requests", details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json(data || []);
    } else {
      const { data, error } = await supabase
        .from("overtime_requests")
        .select(
          `
          *,
          employees!overtime_requests_employee_id_fkey(name, employee_id)
        `
        )
        .order("ot_date", { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: "Failed to fetch OT requests", details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json(data || []);
    }
  } catch (error: any) {
    console.error("🚨 API Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Admin only: Delete OT request
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ot_id = searchParams.get("ot_id");

    if (!ot_id) {
      return NextResponse.json(
        { error: "Missing ot_id parameter" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("overtime_requests")
      .delete()
      .eq("id", ot_id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete OT request", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "OT request deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
