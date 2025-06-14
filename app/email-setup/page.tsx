"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { SmtpConfig } from "@/components/smtp-config";
import { Mail } from "lucide-react";

export default function EmailSetupPage() {
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
            <Mail className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold tracking-tight">Email Setup</h1>
          </div>
          <p className="text-muted-foreground">
            Configure your personal email credentials to send campaigns. Your
            settings are private and secure.
          </p>
        </div>

        {/* Important Notice */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-blue-600 dark:text-blue-400 text-lg">🔒</div>
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Your Personal Email Configuration
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Each user has their own email credentials. Configure your
                settings below to send emails with your own account. We
                recommend using an app-specific password for better security.
              </p>
            </div>
          </div>
        </div>

        {/* Email Configuration Component */}
        <SmtpConfig />
      </div>
    </DashboardLayout>
  );
}
