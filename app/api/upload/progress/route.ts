import { NextRequest } from "next/server";

// This should match the uploadSessions from the upload route
// In production, use a shared store like Redis
declare global {
  var uploadSessions:
    | Map<
        string,
        {
          status: "processing" | "completed" | "failed";
          progress: number;
          message: string;
          totalContacts: number;
          processedContacts: number;
          startTime: number;
          result?: any;
          error?: string;
        }
      >
    | undefined;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return new Response("Session ID required", { status: 400 });
  }

  // Set up Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection confirmation
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "connected",
            sessionId,
            message: "Connected to progress stream",
          })}\n\n`
        )
      );

      // Check for session progress periodically
      const checkProgress = () => {
        // Access global uploadSessions
        if (!global.uploadSessions) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                error: "Session store not initialized",
              })}\n\n`
            )
          );
          controller.close();
          return;
        }

        const session = global.uploadSessions.get(sessionId);

        if (!session) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                error: "Session not found",
              })}\n\n`
            )
          );
          controller.close();
          return;
        }

        // Send progress update
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "progress",
              sessionId,
              status: session.status,
              progress: session.progress,
              message: session.message,
              totalContacts: session.totalContacts,
              processedContacts: session.processedContacts,
              elapsedTime: Date.now() - session.startTime,
              completed: session.status !== "processing",
              result: session.result,
              error: session.error,
            })}\n\n`
          )
        );

        // Close stream if completed or failed
        if (session.status !== "processing") {
          setTimeout(() => {
            controller.close();
          }, 1000);
          return;
        }

        // Continue checking progress
        setTimeout(checkProgress, 500); // Check every 500ms
      };

      // Start checking progress
      setTimeout(checkProgress, 100);
    },

    cancel() {
      // Cleanup if needed
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
