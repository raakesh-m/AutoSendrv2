"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Settings } from "lucide-react";

export function EmailConfigWarning() {
  const [hasEmailConfig, setHasEmailConfig] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkEmailConfig = async () => {
      try {
        // Check for Gmail config first
        const gmailResponse = await fetch("/api/smtp?provider=gmail");
        let hasConfig = false;

        if (gmailResponse.ok) {
          const gmailData = await gmailResponse.json();
          hasConfig = !!gmailData.smtp_config;
        }

        // If no Gmail config, check for Other provider
        if (!hasConfig) {
          const otherResponse = await fetch("/api/smtp?provider=other");
          if (otherResponse.ok) {
            const otherData = await otherResponse.json();
            hasConfig = !!otherData.smtp_config;
          }
        }

        setHasEmailConfig(hasConfig);
      } catch (error) {
        console.error("Failed to check email config:", error);
        setHasEmailConfig(false);
      } finally {
        setLoading(false);
      }
    };

    checkEmailConfig();
  }, []);

  if (loading || hasEmailConfig) {
    return null;
  }

  return (
    <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-orange-800 dark:text-orange-200">
        <div className="flex items-center justify-between">
          <span>
            <strong>Email not configured:</strong> Set up your email credentials
            to send campaigns.
          </span>
          <Link href="/email-setup">
            <Button size="sm" variant="outline" className="ml-4">
              <Settings className="h-4 w-4 mr-2" />
              Configure Email
            </Button>
          </Link>
        </div>
      </AlertDescription>
    </Alert>
  );
}
