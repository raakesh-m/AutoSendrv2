"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { TemplateManager } from "@/components/template-manager";
import { FileText } from "lucide-react";

export default function TemplatesPage() {
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
            <FileText className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-bold tracking-tight">
              Email Templates
            </h1>
          </div>
          <p className="text-muted-foreground">
            Create and customize your email templates and subject lines for job
            applications.
          </p>
        </div>

        {/* Templates Info */}
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-purple-600 dark:text-purple-400 text-lg">
              ✍️
            </div>
            <div>
              <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                Personalized Templates
              </h3>
              <p className="text-sm text-purple-800 dark:text-purple-200">
                Use variables like {"{name}"}, {"{company}"}, and {"{position}"}{" "}
                to personalize your emails. Templates are automatically enhanced
                by AI when enabled.
              </p>
            </div>
          </div>
        </div>

        {/* Template Manager Component */}
        <TemplateManager />
      </div>
    </DashboardLayout>
  );
}
