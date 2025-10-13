import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get("adminId");

    if (!adminId) {
      return NextResponse.json(
        { error: "adminId is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("admin_id", adminId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return NextResponse.json({ settings: data || null });
  } catch (error: any) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const body = await request.json();
    const {
      adminId,
      morningEnabled,
      morningTime,
      morningMessage,
      morningUserTypes,
      eveningEnabled,
      eveningTime,
      eveningMessage,
      eveningUserTypes,
    } = body;

    if (!adminId) {
      return NextResponse.json(
        { error: "adminId is required" },
        { status: 400 }
      );
    }

    console.log("Upserting with adminId:", adminId);

    const { data, error } = await supabase
      .from("notification_settings")
      .upsert(
        {
          admin_id: adminId,
          morning_enabled: morningEnabled,
          morning_time: morningTime,
          morning_message: morningMessage,
          morning_user_types: morningUserTypes,
          evening_enabled: eveningEnabled,
          evening_time: eveningTime,
          evening_message: eveningMessage,
          evening_user_types: eveningUserTypes,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "admin_id",
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    return NextResponse.json({ success: true, settings: data });
  } catch (error: any) {
    console.error("Error saving settings:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
