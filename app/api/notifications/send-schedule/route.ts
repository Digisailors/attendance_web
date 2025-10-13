// app/api/notifications/send-scheduled/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";
import webpush from "web-push";

// Configure web-push
webpush.setVapidDetails(
  "mailto:your-email@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();

    // Get current time in HH:mm format
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // "HH:mm"

    console.log(`🕐 Checking for notifications at ${currentTime}`);

    // Get all admin notification settings
    const { data: settings, error: settingsError } = await supabase
      .from("notification_settings")
      .select("*");

    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
      return NextResponse.json(
        { error: "Failed to fetch settings" },
        { status: 500 }
      );
    }

    let totalSent = 0;
    let totalFailed = 0;

    // Process each admin's settings
    for (const setting of settings || []) {
      // Check morning reminder
      if (setting.morning_enabled && setting.morning_time === currentTime) {
        const result = await sendNotificationToUsers(
          supabase,
          setting.morning_user_types || [],
          setting.morning_message,
          "Morning Check-in Reminder"
        );
        totalSent += result.sent;
        totalFailed += result.failed;
      }

      // Check evening reminder
      if (setting.evening_enabled && setting.evening_time === currentTime) {
        const result = await sendNotificationToUsers(
          supabase,
          setting.evening_user_types || [],
          setting.evening_message,
          "Evening Check-out Reminder"
        );
        totalSent += result.sent;
        totalFailed += result.failed;
      }
    }

    console.log(`✅ Sent: ${totalSent}, ❌ Failed: ${totalFailed}`);

    return NextResponse.json({
      success: true,
      sent: totalSent,
      failed: totalFailed,
      time: currentTime,
    });
  } catch (error) {
    console.error("Error in scheduled notification:", error);
    return NextResponse.json(
      {
        error: "Failed to send notifications",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function sendNotificationToUsers(
  supabase: any,
  userTypes: string[],
  message: string,
  title: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  try {
    // Get users of specified types
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id")
      .in("user_type", userTypes);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return { sent, failed };
    }

    if (!users || users.length === 0) {
      console.log(`No users found for types: ${userTypes.join(", ")}`);
      return { sent, failed };
    }

    const userIds = users.map((u: any) => u.id);

    // Get push subscriptions for these users
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", userIds);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      return { sent, failed };
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(
        `No subscriptions found for user types: ${userTypes.join(", ")}`
      );
      return { sent, failed };
    }

    // Send notifications to all subscriptions
    const notificationPayload = JSON.stringify({
      title: title,
      body: message,
      icon: "/favicon.png",
      badge: "/favicon.png",
      data: {
        url: "/employee/dashboard",
        timestamp: new Date().toISOString(),
      },
    });

    console.log(`📤 Sending to ${subscriptions.length} subscriptions`);

    const sendPromises = subscriptions.map(async (sub: any) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        await webpush.sendNotification(pushSubscription, notificationPayload);
        sent++;
        return { success: true, userId: sub.user_id };
      } catch (error: any) {
        failed++;
        console.error(`Failed to send to user ${sub.user_id}:`, error.message);

        // If subscription is invalid (410 Gone), delete it
        if (error.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          console.log(`Deleted invalid subscription for user ${sub.user_id}`);
        }

        return { success: false, userId: sub.user_id, error: error.message };
      }
    });

    await Promise.all(sendPromises);
  } catch (error) {
    console.error("Error in sendNotificationToUsers:", error);
  }

  return { sent, failed };
}

// For manual testing
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    message: "Use POST to trigger notifications",
    currentTime: new Date().toTimeString().slice(0, 5),
  });
}
