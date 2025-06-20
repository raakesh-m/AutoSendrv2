"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { AttachmentsManager } from "@/components/attachments-manager";
import { Paperclip } from "lucide-react";

export default function AttachmentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return; // Still loading
    if (!session) {
      router.push("/auth/signin");
      return;
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null; // Redirecting
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <Paperclip className="h-8 w-8 text-amber-600" />
            <h1 className="text-3xl font-bold tracking-tight">
              File Attachments
            </h1>
          </div>
          <p className="text-muted-foreground">
            Upload and manage files to attach to your email campaigns, such as
            resumes and cover letters.
          </p>
        </div>

        {/* Attachments Info */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-amber-600 dark:text-amber-400 text-lg">📎</div>
            <div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                Personal File Library
              </h3>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Upload your documents like resumes, cover letters, and
                portfolios. Each user has their own private file storage.
                Supported formats: PDF, DOC, DOCX, TXT.
              </p>
            </div>
          </div>
        </div>

        {/* Attachments Manager Component */}
        <AttachmentsManager />
      </div>
    </DashboardLayout>
  );
}
