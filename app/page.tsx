"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { FileUploadSection } from "@/components/file-upload-section";
import { DataSummary } from "@/components/data-summary";
import { ContactsTable } from "@/components/contacts-table";
import { EmailConfigWarning } from "@/components/email-config-warning";

export default function DashboardPage() {
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
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-lg text-muted-foreground mt-2 max-w-2xl">
                Welcome back, {session.user?.name || session.user?.email}!
                Upload and process your contact data with AI-powered email
                automation.
              </p>
            </div>
            <div className="hidden sm:flex items-center space-x-2">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-muted-foreground">
                System Active
              </span>
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-border via-border/50 to-transparent"></div>
        </div>

        <div className="space-y-8">
          <EmailConfigWarning />
          <FileUploadSection />
          <DataSummary />
          <ContactsTable />
        </div>
      </div>
    </DashboardLayout>
  );
}
