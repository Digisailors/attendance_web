import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Fetch real global time from WorldTimeAPI
    const res = await fetch(
      "https://worldtimeapi.org/api/timezone/Asia/Kolkata",
      {
        cache: "no-store",
        next: { revalidate: 0 },
      }
    );

    if (!res.ok) {
      throw new Error("Failed to fetch world time");
    }

    const data = await res.json();
    const istTime = new Date(data.datetime);

    return NextResponse.json({
      time: istTime.toISOString(),
      timestamp: istTime.getTime(),
      timezone: data.timezone,
      source: "worldtimeapi",
    });
  } catch (error) {
    console.error("Error fetching world time:", error);

    // Fallback: Use server time if WorldTimeAPI fails
    const now = new Date();
    const istTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );

    return NextResponse.json({
      time: istTime.toISOString(),
      timestamp: istTime.getTime(),
      timezone: "Asia/Kolkata",
      source: "server-fallback",
    });
  }
}
