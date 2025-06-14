import { NextRequest, NextResponse } from "next/server";

// Use global variables to persist across API route executions
// This works in development and most deployment environments
declare global {
  var progressStore: Map<string, any> | undefined;
  var completionTracker: Map<string, boolean> | undefined;
}

// Initialize global stores if they don't exist
if (!global.progressStore) {
  global.progressStore = new Map<string, any>();
}
if (!global.completionTracker) {
  global.completionTracker = new Map<string, boolean>();
}

// Use the global stores
const progressStore = global.progressStore;
const completionTracker = global.completionTracker;

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
      let isClosed = false;

      const safeClose = () => {
        if (!isClosed) {
          try {
            controller.close();
            isClosed = true;
            // Only log connection close for debugging if needed
          } catch (error) {
            // Controller already closed or invalid state - this is expected
          }
        }
      };

      // Send initial connection
      const connectMsg = JSON.stringify({ type: "connected" });
      controller.enqueue(encoder.encode(`data: ${connectMsg}\n\n`));
      // Removed verbose connection message log

      // Check for updates every 500ms
      const interval = setInterval(() => {
        if (isClosed) {
          clearInterval(interval);
          return;
        }

        const progress = progressStore.get(sessionId);

        if (progress) {
          try {
            const progressMsg = JSON.stringify(progress);
            controller.enqueue(encoder.encode(`data: ${progressMsg}\n\n`));

            // Clean up when completed - send completion message once then stop immediately
            if (progress.completed && !completionTracker.get(sessionId)) {
              completionTracker.set(sessionId, true);
              console.log(
                `🎉 Campaign completed: ${progress.sent} emails sent successfully`
              );

              // Stop the interval immediately to prevent duplicate messages
              clearInterval(interval);

              // Clean up after a short delay to ensure message is delivered
              setTimeout(() => {
                progressStore.delete(sessionId);
                completionTracker.delete(sessionId);
                safeClose();
              }, 500);
            }
          } catch (error) {
            // Stream is closed, clean up silently
            clearInterval(interval);
            isClosed = true;
          }
        }
      }, 500);

      // Cleanup on client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        safeClose();
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
