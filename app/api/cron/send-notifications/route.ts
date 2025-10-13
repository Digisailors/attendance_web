import { NextRequest, NextResponse } from "next/server";
import { createClientInstance as createClient } from "@/lib/supabaseServer";
import webpush from "web-push";

// Configure web-push
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function GET(request: NextRequest) {
  // Verify cron secret to secure the endpoint
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createClient();
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    const currentDay = now.toISOString().split("T")[0];

    // Get all admin notification settings
    const { data: allSettings } = await supabase
      .from("notification_settings")
      .select("*");

    if (!allSettings || allSettings.length === 0) {
      return NextResponse.json({ message: "No settings found" });
    }

    let notificationsSent = 0;

    for (const settings of allSettings) {
      // Check morning reminder
      if (settings.morning_enabled && settings.morning_time === currentTime) {
        await sendNotificationsToUserTypes(
          supabase,
          settings.morning_user_types,
          "morning",
          settings.morning_message || "Time to check in!",
          "Morning Check-in Reminder"
        );
        notificationsSent++;
      }

      // Check evening reminder
      if (settings.evening_enabled && settings.evening_time === currentTime) {
        await sendNotificationsToUserTypes(
          supabase,
          settings.evening_user_types,
          "evening",
          settings.evening_message || "Time to check out!",
          "Evening Check-out Reminder"
        );
        notificationsSent++;
      }
    }

    return NextResponse.json({
      success: true,
      notificationsSent,
      time: currentTime,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function sendNotificationsToUserTypes(
  supabase: any,
  userTypes: string[],
  type: string,
  message: string,
  title: string
) {
  // Get users of specified types
  const { data: users } = await supabase
    .from("users")
    .select("id, user_type")
    .in("user_type", userTypes);

  if (!users || users.length === 0) return;

  for (const user of users) {
    // Create notification in database
    await supabase.from("notifications").insert({
      user_id: user.id,
      title,
      message,
      type,
      is_read: false,
    });

    // Get user's push subscriptions
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user.id);

    if (subscriptions && subscriptions.length > 0) {
      // Send push notification to all user's devices
      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            JSON.stringify({
              title,
              message,
              type,
              icon: "/icon-192x192.png",
              url: "/",
            })
          );
        } catch (error: any) {
          console.error("Error sending push notification:", error);

          // If subscription is invalid, remove it
          if (error.statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
      }
    }
  }
}
