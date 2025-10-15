import { NextResponse } from "next/server";

export async function GET() {
  try {
    const now = new Date();

    // Get current time in IST using Intl API (reliable)
    const istFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const parts = istFormatter.formatToParts(now);
    const getValue = (type: string) =>
      parts.find((p) => p.type === type)?.value || "";

    const istTimeString = `${getValue("year")}-${getValue("month")}-${getValue(
      "day"
    )} ${getValue("hour")}:${getValue("minute")}:${getValue("second")}`;

    return NextResponse.json({
      time: istTimeString,
      timestamp: now.getTime(),
      timezone: "Asia/Kolkata",
      source: "vercel-server",
    });
  } catch (error) {
    console.error("Error getting server time:", error);
    return NextResponse.json(
      { error: "Failed to get server time" },
      { status: 500 }
    );
  }
}
