"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { AiRulesManager } from "@/components/ai-rules-manager";
import { Brain } from "lucide-react";

export default function AiRulesPage() {
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
            <Brain className="h-8 w-8 text-orange-600" />
            <h1 className="text-3xl font-bold tracking-tight">
              AI Enhancement Rules
            </h1>
          </div>
          <p className="text-muted-foreground">
            Configure how AI enhances your emails with custom rules and
            preferences.
          </p>
        </div>

        {/* AI Info */}
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-orange-600 dark:text-orange-400 text-lg">
              🤖
            </div>
            <div>
              <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                Smart Email Enhancement
              </h3>
              <p className="text-sm text-orange-800 dark:text-orange-200">
                AI rules help personalize your emails based on company research
                and job descriptions. Set up custom rules to match your
                communication style and preferences.
              </p>
            </div>
          </div>
        </div>

        {/* AI Rules Manager Component */}
        <AiRulesManager />
      </div>
    </DashboardLayout>
  );
}
