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

// GET - Fetch work logs (all or for a specific date)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: internId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get("date"); // Optional date parameter

    console.log(
      "Fetching work logs for intern:",
      internId,
      "date:",
      date || "all"
    );

    if (date) {
      // Fetch work log for specific date (for dashboard)
      const { data, error } = await supabase
        .from("intern_work_logs")
        .select("*")
        .eq("intern_id", internId)
        .eq("date", date)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No rows found - return null (this is expected when no check-in exists)
          console.log("No work log found for this date");
          return NextResponse.json(null);
        }
        console.error("Error fetching work log:", error);
        return NextResponse.json(
          { error: "Failed to fetch work log", details: error.message },
          { status: 500 }
        );
      }

      console.log("Work log found:", data);

      // Return raw timestamps so the client can parse consistently as ISO
      return NextResponse.json({
        date: data.date,
        check_in: data.check_in, // Expect full ISO/timestamptz or null
        check_out: data.check_out, // Expect full ISO/timestamptz or null
        project: data.work_type,
        description: data.description,
      });
    } else {
      // Fetch all work logs (for detail page)
      console.log("Fetching all work logs for intern_id:", internId);

      const { data, error } = await supabase
        .from("intern_work_logs")
        .select("*")
        .eq("intern_id", internId)
        .order("date", { ascending: false });

      if (error) {
        console.error("Error fetching work logs:", error);
        return NextResponse.json(
          { error: "Failed to fetch work logs", details: error.message },
          { status: 500 }
        );
      }

      console.log(
        `Found ${data?.length || 0} work logs for intern ${internId}`
      );
      console.log("Work logs data:", JSON.stringify(data, null, 2));

      // Return all work logs for detail page
      return NextResponse.json({ workLogs: data || [] });
    }
  } catch (error) {
    console.error("Error in GET work logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create or update work log
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: internId } = await params;
    const body = await request.json();
    const { checkInTime, checkOutTime, workType, workDescription } = body;

    console.log("Work log request:", {
      internId,
      checkInTime,
      checkOutTime,
      workType,
      workDescription,
    });

    if (!checkInTime) {
      return NextResponse.json(
        { error: "Check-in time is required" },
        { status: 400 }
      );
    }

    // Parse the ISO date string
    const checkInDate = new Date(checkInTime);
    const today = checkInDate.toISOString().split("T")[0]; // YYYY-MM-DD format

    // Check if a work log already exists for today
    const { data: existingLog, error: fetchError } = await supabase
      .from("intern_work_logs")
      .select("*")
      .eq("intern_id", internId)
      .eq("date", today)
      .single();

    // Get intern information
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

    if (existingLog) {
      console.log("Existing log found, updating...");

      // Update existing log
      const updateData: any = {};

      // Only update check_in if it doesn't exist
      if (checkInTime && !existingLog.check_in) {
        updateData.check_in = checkInTime;
      }

      // Update check_out and work details if provided
      if (checkOutTime) {
        updateData.check_out = checkOutTime;

        // Calculate total hours and overtime
        const checkIn = new Date(existingLog.check_in || checkInTime);
        const checkOut = new Date(checkOutTime);
        const totalHours =
          (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
        const overtimeHours = totalHours > 8 ? totalHours - 8 : 0;

        updateData.total_hours = parseFloat(totalHours.toFixed(2));
        updateData.overtime_hours = parseFloat(overtimeHours.toFixed(2));
      }

      if (workType) {
        updateData.work_type = workType;
      }

      if (workDescription) {
        updateData.description = workDescription;
      }

      updateData.updated_at = new Date().toISOString();

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

      console.log("Work log updated successfully");
      return NextResponse.json({
        message: "Work log updated successfully",
        workLog: updatedLog,
      });
    } else {
      console.log("No existing log, creating new one...");

      // Create new log
      const insertData: any = {
        intern_id: internId,
        intern_name: internName,
        date: today,
        check_in: checkInTime,
        department: department,
      };

      // If checking out immediately (shouldn't happen normally)
      if (checkOutTime) {
        insertData.check_out = checkOutTime;

        const checkIn = new Date(checkInTime);
        const checkOut = new Date(checkOutTime);
        const totalHours =
          (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
        const overtimeHours = totalHours > 8 ? totalHours - 8 : 0;

        insertData.total_hours = parseFloat(totalHours.toFixed(2));
        insertData.overtime_hours = parseFloat(overtimeHours.toFixed(2));
      }

      if (workType) {
        insertData.work_type = workType;
      }

      if (workDescription) {
        insertData.description = workDescription;
      }

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

      console.log("Work log created successfully");
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
