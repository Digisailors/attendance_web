import { NextResponse } from "next/server";

export async function GET() {
  // Get current time
  const now = new Date();

  // Convert to IST by adding offset to UTC time
  // IST is UTC+5:30 (5.5 hours = 19800000 milliseconds)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);

  // Format readable IST time
  const readableIST = istTime.toLocaleString("en-IN", {
    hour12: true,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return NextResponse.json({
    serverTimeISO: now.toISOString(), // Original UTC time
    serverTimestamp: now.getTime(), // Epoch timestamp
    serverTimeReadable: readableIST, // IST formatted for display
    istTimeISO: istTime.toISOString(), // IST time in ISO format
  });
}
