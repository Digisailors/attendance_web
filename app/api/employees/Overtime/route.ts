import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Supabase setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Validation schema
const schema = z.object({
  employee_id: z.string(), // Now accepts UUID directly
  ot_date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  reason: z.string(),
});

// Helper function to check if string is a valid UUID
const isValidUUID = (uuid: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    uuid
  );
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // Files
    const image1File = formData.get("image1");
    const image2File = formData.get("image2");
    const image1 = image1File instanceof File ? image1File : null;
    const image2 = image2File instanceof File ? image2File : null;

    // Payload
    const payload = {
      employee_id: formData.get("employee_id") as string,
      ot_date: formData.get("ot_date") as string,
      start_time: formData.get("start_time") as string,
      end_time: formData.get("end_time") as string,
      reason: formData.get("reason") as string,
    };

    console.log("📥 Received payload:", payload);

    // Validate
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { employee_id, ot_date, reason } = parsed.data;
    let employee_uuid = employee_id;

    // 🔑 Check if employee_id is already a UUID or if it's an employee code
    if (isValidUUID(employee_id)) {
      console.log("✅ Employee ID is already a UUID:", employee_id);
      // Verify the UUID exists in the employees table
      const { data: emp, error: empError } = await supabase
        .from("employees")
        .select("id, employee_id, name")
        .eq("id", employee_id)
        .single();

      if (empError || !emp) {
        console.log(
          "❌ Employee UUID not found in database:",
          empError?.message
        );
        return NextResponse.json(
          {
            error: "Employee not found with provided UUID",
            details: empError?.message,
          },
          { status: 404 }
        );
      }

      employee_uuid = emp.id;
      console.log("✅ Found employee:", emp.name, emp.employee_id);
    } else {
      console.log("🔄 Employee ID is a code, converting to UUID:", employee_id);
      // Convert employee_code (like NE075) to UUID
      const { data: emp, error: empError } = await supabase
        .from("employees")
        .select("id, employee_id, name")
        .eq("employee_id", employee_id)
        .single();

      if (empError || !emp) {
        console.log("❌ Employee code not found:", empError?.message);
        return NextResponse.json(
          {
            error: "Employee not found with provided code",
            details: empError?.message,
          },
          { status: 404 }
        );
      }

      employee_uuid = emp.id;
      console.log(
        "✅ Converted employee code to UUID:",
        emp.employee_id,
        "->",
        emp.id
      );
    }

    const formatToTime = (datetimeStr: string) => {
      const date = new Date(datetimeStr);
      return date.toTimeString().split(" ")[0]; // "HH:MM:SS"
    };

    const start_time = formatToTime(payload.start_time);
    const end_time = formatToTime(payload.end_time);

    const ot_id = uuidv4();

    // Helper to upload image
    const uploadImage = async (file: File | null, label: string) => {
      if (!file) return null;
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

      console.log(
        `✅ ${label} uploaded successfully:`,
        publicUrlData?.publicUrl
      );
      return publicUrlData?.publicUrl ?? null;
    };

    // Upload both images
    const image1_url = await uploadImage(image1, "img1");
    const image2_url = await uploadImage(image2, "img2");

    // Insert into overtime_requests table
    const overtimeData = {
      id: ot_id,
      employee_id: employee_uuid,
      ot_date,
      start_time,
      end_time,
      reason,
      image1: image1_url,
      image2: image2_url,
      created_at: new Date().toISOString(),
      status: "pending",
    };

    console.log("💾 Inserting overtime request:", overtimeData);

    const { error: insertError } = await supabase
      .from("overtime_requests")
      .insert([overtimeData]);

    if (insertError) {
      console.log("❌ Insert failed:", insertError.message);
      return NextResponse.json(
        { error: "Failed to insert OT request", details: insertError.message },
        { status: 500 }
      );
    }

    console.log("✅ OT request created successfully:", ot_id);

    return NextResponse.json({
      success: true,
      ot_id,
      employee_uuid,
      image1_url,
      image2_url,
    });
  } catch (err: any) {
    console.error("❌ Unexpected error:", err.message);
    return NextResponse.json(
      { error: "Unexpected server error", details: err.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employee_id = searchParams.get("employee_id");
    const team_lead_code = searchParams.get("team_lead_id");

    console.log("🔍 GET Request received:", { employee_id, team_lead_code });

    if (team_lead_code) {
      // Get OT requests for team members using a JOIN query
      console.log("🔍 Looking for OT requests for team lead:", team_lead_code);

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

      console.log("🔍 Raw OT requests found:", otRequests?.length);

      if (otError) {
        console.log("🚨 Error fetching OT requests:", otError);
        return NextResponse.json(
          { error: "Failed to fetch OT requests", details: otError.message },
          { status: 500 }
        );
      }

      if (!otRequests) {
        return NextResponse.json([]);
      }

      // Filter OT requests for team members under this team lead
      const filteredOTRequests = [];

      for (const otRequest of otRequests) {
        const employee = otRequest.employees;
        if (!employee || !employee.team_members) continue;

        // Check if any team member record has matching team lead
        const teamMemberRecords = Array.isArray(employee.team_members)
          ? employee.team_members
          : [employee.team_members];

        const isTeamMember = teamMemberRecords.some((tm) => {
          if (!tm || !tm.is_active) return false;

          // Check both UUID and string formats
          return (
            tm.team_lead_id === team_lead_code ||
            (typeof tm.team_lead_id === "string" &&
              tm.team_lead_id.includes(team_lead_code))
          );
        });

        if (isTeamMember) {
          filteredOTRequests.push(otRequest);
        }
      }

      console.log(
        "🔍 Filtered OT requests for team lead:",
        filteredOTRequests.length
      );
      return NextResponse.json(filteredOTRequests);
    }

    // If employee_id is passed, handle both UUID and code formats
    else if (employee_id) {
      let query;

      if (isValidUUID(employee_id)) {
        // employee_id is a UUID
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
        // employee_id is a code, need to join with employees table
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
    }

    // No filters → return all
    else {
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

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, approved_by } = body;

    if (!id || !status) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          details: "id and status are required",
        },
        { status: 400 }
      );
    }

    // Validate UUID format for approved_by if it's provided
    if (approved_by && !isValidUUID(approved_by)) {
      return NextResponse.json(
        {
          error: "Invalid approved_by format",
          details: "approved_by must be a valid UUID",
        },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("overtime_requests")
      .update({
        status,
        approved_by,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to update status", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Status updated successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
