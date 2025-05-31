import { NextRequest, NextResponse } from "next/server";

// In-memory progress store (in production, use Redis or database)
const progressStore = new Map<string, any>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "Session ID required" }, { status: 400 });
  }

  // Set up Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
      );

      // Check for updates every 500ms
      const interval = setInterval(() => {
        const progress = progressStore.get(sessionId);

        if (progress) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(progress)}\n\n`)
          );

          // Clean up when completed
          if (progress.completed) {
            setTimeout(() => {
              progressStore.delete(sessionId);
              clearInterval(interval);
              controller.close();
            }, 5000);
          }
        }
      }, 500);

      // Cleanup on client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}

// Helper function to update progress (called from the main send API)
export function updateProgress(sessionId: string, progressData: any) {
  progressStore.set(sessionId, {
    ...progressData,
    timestamp: Date.now(),
  });
}

// Helper function to get progress
export function getProgress(sessionId: string) {
  return progressStore.get(sessionId);
}
