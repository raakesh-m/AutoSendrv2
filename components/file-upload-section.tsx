"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File, X, Check, ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface UploadSession {
  sessionId: string;
  status: "processing" | "completed" | "failed";
  progress: number;
  message: string;
  totalContacts: number;
  processedContacts: number;
  elapsedTime: number;
  result?: any;
  error?: string;
}

export function FileUploadSection() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [currentSession, setCurrentSession] = useState<UploadSession | null>(
    null
  );
  const [backgroundSessions, setBackgroundSessions] = useState<UploadSession[]>(
    []
  );
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/json": [".json"],
      "text/plain": [".txt"],
    },
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Function to start listening to progress updates
  const startProgressListener = (sessionId: string) => {
    const eventSource = new EventSource(
      `/api/upload/progress?sessionId=${sessionId}`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "connected") {
          console.log("Connected to progress stream:", data.sessionId);
          return;
        }

        if (data.type === "progress") {
          const sessionUpdate: UploadSession = {
            sessionId: data.sessionId,
            status: data.status,
            progress: data.progress,
            message: data.message,
            totalContacts: data.totalContacts,
            processedContacts: data.processedContacts,
            elapsedTime: data.elapsedTime,
            result: data.result,
            error: data.error,
          };

          setCurrentSession(sessionUpdate);

          // If completed, show toast and move to background sessions
          if (data.completed) {
            setUploading(false);
            setFiles([]);

            if (data.status === "completed") {
              toast({
                title: "🎉 Upload completed!",
                description: `${data.totalContacts} contacts processed in ${(
                  data.elapsedTime / 1000
                ).toFixed(1)}s`,
              });

              // Move to background sessions
              setBackgroundSessions((prev) => [...prev, sessionUpdate]);
              setCurrentSession(null);

              // Refresh the page to show new contacts
              setTimeout(() => window.location.reload(), 2000);
            } else if (data.status === "failed") {
              toast({
                title: "Upload failed",
                description: data.error || "Unknown error occurred",
                variant: "destructive",
              });
              setCurrentSession(null);
            }

            eventSource.close();
          }
        }
      } catch (error) {
        console.error("Error parsing SSE data:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
      eventSource.close();
      setUploading(false);
    };

    return eventSource;
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setCurrentSession(null);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const result = await response.json();

      if (result.backgroundProcessing && result.sessionId) {
        // Start listening for progress updates
        startProgressListener(result.sessionId);

        toast({
          title: "🚀 Upload started!",
          description: `Processing ${result.totalContacts} contacts in background. You can navigate to other tabs.`,
        });
      } else {
        // Fallback for non-background processing
        setUploading(false);
        setFiles([]);
        toast({
          title: "🎉 Upload successful!",
          description: result.message,
        });
        window.location.reload();
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploading(false);
      setCurrentSession(null);
      toast({
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  // Clean up completed background sessions
  const clearBackgroundSession = (sessionId: string) => {
    setBackgroundSessions((prev) =>
      prev.filter((s) => s.sessionId !== sessionId)
    );
  };

  return (
    <div className="space-y-6">
      {/* Background Processing Status */}
      {backgroundSessions.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-green-800 text-lg flex items-center gap-2">
              <Check className="h-5 w-5" />
              Recently Completed Uploads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {backgroundSessions.map((session) => (
                <div
                  key={session.sessionId}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200"
                >
                  <div className="flex items-center space-x-3">
                    <Badge
                      variant="outline"
                      className="bg-green-100 text-green-700 border-green-300"
                    >
                      Completed
                    </Badge>
                    <span className="text-sm text-green-700">
                      {session.totalContacts} contacts processed in{" "}
                      {(session.elapsedTime / 1000).toFixed(1)}s
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearBackgroundSession(session.sessionId)}
                    className="text-green-600 hover:text-green-800"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Upload Card */}
      <Card className="border-0 shadow-lg ring-1 ring-border/50 transition-all duration-200 hover:shadow-xl hover:ring-border">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Upload Contact Data</CardTitle>
              <CardDescription className="text-base">
                Upload your scraped contact data in CSV, JSON, or TXT format
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enhanced dropzone with better visual feedback */}
          <div
            {...getRootProps()}
            className={`
              group relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer 
              transition-all duration-300 ease-in-out
              ${
                isDragActive
                  ? "border-primary bg-primary/5 scale-[1.02] shadow-lg"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
              }
            `}
          >
            <input {...getInputProps()} />
            <div className="relative">
              <Upload
                className={`
                  mx-auto h-16 w-16 mb-4 transition-all duration-300
                  ${
                    isDragActive
                      ? "text-primary scale-110"
                      : "text-muted-foreground group-hover:text-primary group-hover:scale-105"
                  }
                `}
              />
              <div className="space-y-2">
                {isDragActive ? (
                  <p className="text-lg font-medium text-primary animate-pulse">
                    Drop the files here...
                  </p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-lg font-medium">
                      Drag & drop files here, or click to select
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <span className="px-3 py-1 text-xs font-medium bg-muted rounded-full">
                        CSV
                      </span>
                      <span className="px-3 py-1 text-xs font-medium bg-muted rounded-full">
                        JSON
                      </span>
                      <span className="px-3 py-1 text-xs font-medium bg-muted rounded-full">
                        TXT
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Expected fields:{" "}
                      <span className="font-medium">email</span> (required),
                      name, company_name, role, recruiter_name
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced file list with better styling */}
          {files.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Selected Files ({files.length})
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFiles([])}
                  disabled={uploading}
                  className="text-xs"
                >
                  Clear All
                </Button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="group flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50 transition-all duration-200 hover:bg-muted hover:border-border"
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="p-1.5 bg-background rounded-md border">
                        <File className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={uploading}
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Enhanced real-time progress indicator */}
          {currentSession && (
            <div className="space-y-4 p-4 bg-blue-50/80 rounded-xl border border-blue-200/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-3 w-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="font-medium text-blue-900">
                    {currentSession.message}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge
                    variant="secondary"
                    className="bg-blue-100 text-blue-800"
                  >
                    {Math.round(currentSession.progress)}%
                  </Badge>
                  {currentSession.totalContacts > 0 && (
                    <span className="text-sm text-blue-700">
                      {currentSession.totalContacts} contacts
                    </span>
                  )}
                </div>
              </div>
              <Progress
                value={currentSession.progress}
                className="h-2 bg-blue-100"
              />
              <div className="flex items-center justify-between text-xs text-blue-600">
                <span>
                  Processing in background - you can navigate to other tabs
                </span>
                <span>
                  {(currentSession.elapsedTime / 1000).toFixed(0)}s elapsed
                </span>
              </div>
            </div>
          )}

          {/* Enhanced upload button */}
          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            className="w-full h-12 text-base font-medium transition-all duration-200 disabled:opacity-50"
            size="lg"
          >
            {uploading ? (
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                <span>Starting Upload...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Upload className="h-4 w-4" />
                <span>
                  Upload {files.length} File{files.length !== 1 ? "s" : ""}{" "}
                  (Background Processing)
                </span>
              </div>
            )}
          </Button>

          {/* Background processing info */}
          {!uploading && files.length > 0 && (
            <div className="text-center p-3 bg-muted/30 rounded-lg border border-border/50">
              <p className="text-sm text-muted-foreground">
                🚀 <strong>Background Processing:</strong> Upload will continue
                even if you navigate to other tabs
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
