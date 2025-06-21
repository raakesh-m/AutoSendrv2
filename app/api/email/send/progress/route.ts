import { NextRequest, NextResponse } from "next/server";

// Global progress storage for development and deployment environments
declare global {
  var progressStore: Map<string, any> | undefined;
  var completionTracker: Map<string, boolean> | undefined;
}

// Initialize global stores
if (!global.progressStore) {
  global.progressStore = new Map<string, any>();
}
if (!global.completionTracker) {
  global.completionTracker = new Map<string, boolean>();
}

const progressStore = global.progressStore;
const completionTracker = global.completionTracker;

// Store active controllers for immediate updates
const streamControllers = new Map<string, ReadableStreamDefaultController>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "Session ID required" }, { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let isClosed = false;

      const safeClose = () => {
        if (!isClosed) {
          try {
            controller.close();
            isClosed = true;
            streamControllers.delete(sessionId);
          } catch (error) {
            // Controller already closed - expected behavior
          }
        }
      };

      // Register controller for immediate updates
      streamControllers.set(sessionId, controller);

      // Send initial connection confirmation
      const connectMsg = JSON.stringify({ type: "connected" });
      controller.enqueue(encoder.encode(`data: ${connectMsg}\n\n`));

      let lastSentTimestamp = 0;

      // Check for updates every 100ms for responsive real-time updates
      const interval = setInterval(() => {
        if (isClosed) {
          clearInterval(interval);
          return;
        }

        const progress = progressStore.get(sessionId);

        if (progress && progress.timestamp !== lastSentTimestamp) {
          try {
            const progressMsg = JSON.stringify(progress);
            controller.enqueue(encoder.encode(`data: ${progressMsg}\n\n`));
            lastSentTimestamp = progress.timestamp;

            // Handle completion cleanup
            if (progress.completed && !completionTracker.get(sessionId)) {
              completionTracker.set(sessionId, true);
              console.log(
                `🎉 Campaign completed: ${progress.sent} emails sent successfully`
              );

              clearInterval(interval);

              // Cleanup after ensuring message delivery
              setTimeout(() => {
                progressStore.delete(sessionId);
                completionTracker.delete(sessionId);
                safeClose();
              }, 500);
            }
          } catch (error) {
            clearInterval(interval);
            isClosed = true;
          }
        }
      }, 100);

      // Cleanup on client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        streamControllers.delete(sessionId);
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

// Helper function to update progress with immediate streaming
export function updateProgress(sessionId: string, progressData: any) {
  const dataWithTimestamp = {
    ...progressData,
    timestamp: Date.now(),
  };

  progressStore.set(sessionId, dataWithTimestamp);

  // Send immediately to active stream if available
  const controller = streamControllers.get(sessionId);
  if (controller) {
    try {
      const encoder = new TextEncoder();
      const progressMsg = JSON.stringify(dataWithTimestamp);
      controller.enqueue(encoder.encode(`data: ${progressMsg}\n\n`));
    } catch (error) {
      // Stream closed, clean up controller
      streamControllers.delete(sessionId);
    }
  }
}

// Helper function to get current progress
export function getProgress(sessionId: string) {
  return progressStore.get(sessionId);
}
