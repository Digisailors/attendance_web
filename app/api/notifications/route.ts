// File: app/api/notifications/route.ts
// URL: /api/notifications?userId=uuid OR ?email=user@example.com OR ?userType=employee

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const email = searchParams.get("email");
    const userType = searchParams.get("userType");

    let actualUserId = userId;

    // If email is provided, look up the user ID
    if (email && !actualUserId) {
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

      if (userError || !user) {
        return NextResponse.json(
          { error: "User not found", details: userError?.message },
          { status: 404 }
        );
      }

      actualUserId = user.id;
    }

    // If userType is provided, get notifications for ALL users of that type
    if (userType && !actualUserId) {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id")
        .eq("user_type", userType);

      if (usersError) {
        return NextResponse.json(
          { error: "Error fetching users", details: usersError.message },
          { status: 500 }
        );
      }

      if (!users || users.length === 0) {
        return NextResponse.json({ notifications: [] });
      }

      const userIds = users.map((u) => u.id);

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .in("user_id", userIds)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      return NextResponse.json({ notifications: data || [] });
    }

    // Direct userId query
    if (actualUserId) {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", actualUserId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      return NextResponse.json({ notifications: data || [] });
    }

    return NextResponse.json(
      { error: "userId, email, or userType parameter required" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
