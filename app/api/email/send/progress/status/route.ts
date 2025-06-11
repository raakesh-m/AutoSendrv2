import { NextRequest, NextResponse } from "next/server";
import { getProgress } from "../route";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "Session ID required" }, { status: 400 });
  }

  const progress = getProgress(sessionId);

  if (!progress) {
    return NextResponse.json(
      { error: "No progress data found for this session" },
      { status: 404 }
    );
  }

  return NextResponse.json(progress);
}
