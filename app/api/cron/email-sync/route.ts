/**
 * Daily email sync cron job
 * Called by Vercel Cron at 3am daily
 */

import { NextResponse } from "next/server";
import { processAllEmails } from "@/lib/email-processor";

export const maxDuration = 300; // 5 minutes max execution time
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Verify request is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[cron] Starting daily email sync...");

  try {
    // Process emails from the last 7 days (to catch any missed ones)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const stats = await processAllEmails(sevenDaysAgo);

    console.log("[cron] Daily sync complete:", stats);

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron] Daily sync failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
