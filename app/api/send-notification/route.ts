import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

webpush.setVapidDetails(
  "mailto:admin@yourapp.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  const { data: subs } = await supabase.from("push_subscriptions").select("*");

  for (const sub of subs || []) {
    try {
      await webpush.sendNotification(
        sub,
        JSON.stringify({
          title: "Attendance Reminder",
          body: "Please mark your attendance now ⏰",
        })
      );
    } catch (err) {
      console.error("Notification error:", err);
    }
  }

  return NextResponse.json({ sent: subs?.length || 0 });
}
