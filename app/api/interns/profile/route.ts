// app/api/interns/[id]/worklog/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// GET - Fetch work log for a specific date
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get("email");

    console.log("Fetching intern profile for email:", email);

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 }
      );
    }

    // Fetch intern by email
    const { data, error } = await supabase
      .from("interns")
      .select("*")
      .eq("email", email)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        console.log("No intern found with email:", email);
        return NextResponse.json(
          { error: "Intern not found" },
          { status: 404 }
        );
      }
      console.error("Error fetching intern profile:", error);
      return NextResponse.json(
        { error: "Failed to fetch intern profile", details: error.message },
        { status: 500 }
      );
    }

    console.log("Intern profile found:", {
      id: data.id,
      name: data.name,
      email: data.email,
    });

    // Return the intern data with the correct UUID
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GET /api/interns/profile:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST - Create or update work log (check-in, check-out, work submission)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const internId = params.id;
    const body = await request.json();
    const { checkInTime, checkOutTime, workType, workDescription } = body;

    console.log("Work log request:", {
      internId,
      checkInTime,
      checkOutTime,
      workType,
      workDescription,
    });

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];

    // Check if a work log already exists for today
    const { data: existingLog, error: fetchError } = await supabase
      .from("intern_work_logs")
      .select("*")
      .eq("intern_id", internId)
      .eq("date", today)
      .single();

    // Get intern information for name and department
    const { data: internInfo } = await supabase
      .from("interns")
      .select("name, domain_in_office")
      .eq("id", internId)
      .single();

    const internName = internInfo?.name || "Unknown";
    const department = internInfo?.domain_in_office || "General";

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error checking existing log:", fetchError);
      return NextResponse.json(
        { error: "Failed to check existing work log" },
        { status: 500 }
      );
    }

    // Convert ISO strings to TIME format (HH:MM:SS)
    const formatTimeForDB = (isoString: string | null) => {
      if (!isoString) return null;
      const date = new Date(isoString);
      return date.toTimeString().split(" ")[0]; // Returns HH:MM:SS
    };

    if (existingLog) {
      // Update existing log
      const updateData: any = {};

      if (checkInTime && !existingLog.check_in) {
        updateData.check_in = formatTimeForDB(checkInTime);
      }

      if (checkOutTime) {
        updateData.check_out = formatTimeForDB(checkOutTime);
      }

      if (workType) {
        updateData.work_type = workType;
      }

      if (workDescription) {
        updateData.description = workDescription;
      }

      console.log("Updating work log with:", updateData);

      const { data: updatedLog, error: updateError } = await supabase
        .from("intern_work_logs")
        .update(updateData)
        .eq("id", existingLog.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating work log:", updateError);
        return NextResponse.json(
          { error: "Failed to update work log", details: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: "Work log updated successfully",
        workLog: updatedLog,
      });
    } else {
      // Create new log (check-in only)
      if (!checkInTime) {
        return NextResponse.json(
          { error: "Check-in time is required for new work log" },
          { status: 400 }
        );
      }

      const insertData = {
        intern_id: internId,
        intern_name: internName,
        date: today,
        check_in: formatTimeForDB(checkInTime),
        check_out: checkOutTime ? formatTimeForDB(checkOutTime) : null,
        work_type: workType || null,
        description: workDescription || null,
        department: department,
      };

      console.log("Creating new work log:", insertData);

      const { data: newLog, error: insertError } = await supabase
        .from("intern_work_logs")
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        console.error("Error creating work log:", insertError);
        return NextResponse.json(
          { error: "Failed to create work log", details: insertError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: "Work log created successfully",
        workLog: newLog,
      });
    }
  } catch (error) {
    console.error("Error in POST worklog:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
