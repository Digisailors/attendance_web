import { createClient } from "@supabase/supabase-js";

export async function markAsRead(req: any, res: any) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { notificationId } = req.body;

    const { data, error } = await supabase // ✅ Added 'data' here
      .from("notifications")
      .update({ is_read: true, read_at: new Date() })
      .eq("id", notificationId)
      .select(); // ✅ Optional: return updated row(s) to include in response

    if (error) throw error;

    res.status(200).json({ notifications: data }); // ✅ Now 'data' exists
  } catch (error: any) {
    console.error("Error updating notification:", error);
    res.status(500).json({ error: error.message });
  }
}
