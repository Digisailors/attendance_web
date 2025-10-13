// app/api/notifications/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer"; // Service role client

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, subscription } = body;

    console.log("📥 Request received:", {
      userId,
      hasSubscription: !!subscription,
    });

    // Validate input
    if (!userId || !subscription?.endpoint || !subscription?.keys) {
      console.error("❌ Validation failed:", {
        userId,
        hasSubscription: !!subscription,
      });
      return NextResponse.json(
        { error: "Missing required data: userId or subscription" },
        { status: 400 }
      );
    }

    // Use service role client (bypasses RLS)
    const supabase = createServerClient();

    // Verify user exists (optional but recommended)
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      console.error("❌ User not found:", userError);
      return NextResponse.json({ error: "Invalid user ID" }, { status: 401 });
    }

    console.log("✅ User verified:", userId);

    // Save subscription
    const { data, error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,endpoint",
        }
      )
      .select();

    if (error) {
      console.error("❌ Supabase error:", error);
      return NextResponse.json(
        {
          error: "Failed to save subscription",
          details: error.message,
        },
        { status: 500 }
      );
    }

    console.log("✅ Subscription saved successfully:", data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("❌ Server error:", error);
    return NextResponse.json(
      {
        error: "Server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
