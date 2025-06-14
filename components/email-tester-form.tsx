"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Send,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Mail,
  User,
  Building2,
  Settings,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SendingState {
  isActive: boolean;
  step: string;
  progress: number;
  logs: string[];
}

export function EmailTesterForm() {
  const [formData, setFormData] = useState({
    companyName: "",
    recipientEmail: "",
    position: "",
    recruiterName: "",
  });
  const [sendingState, setSendingState] = useState<SendingState>({
    isActive: false,
    step: "",
    progress: 0,
    logs: [],
  });
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  // Form validation
  const isFormValid =
    formData.companyName.trim() !== "" &&
    formData.recipientEmail.trim() !== "" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.recipientEmail);

  const addLog = (message: string) => {
    setSendingState((prev) => ({
      ...prev,
      logs: [...prev.logs, `${new Date().toLocaleTimeString()}: ${message}`],
    }));
  };

  const updateProgress = (step: string, progress: number) => {
    setSendingState((prev) => ({
      ...prev,
      step,
      progress,
    }));
  };

  const handleSendEmail = async () => {
    if (!isFormValid) {
      toast({
        title: "Invalid Form",
        description:
          "Please fill in all required fields with valid information.",
        variant: "destructive",
      });
      return;
    }

    setSendingState({
      isActive: true,
      step: "Preparing email...",
      progress: 0,
      logs: [],
    });
    setEmailSent(false);

    try {
      addLog("Starting email preparation");
      updateProgress("Personalizing template...", 20);

      addLog(`Preparing email for ${formData.companyName}...`);
      updateProgress("Processing with template and AI...", 40);

      updateProgress("Sending email...", 70);
      addLog(`Sending email to ${formData.recipientEmail}...`);

      // Send the email using unified system
      const response = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: formData.recipientEmail,
          companyName: formData.companyName,
          position: formData.position,
          recruiterName: formData.recruiterName,
          useAiCustomization: true, // Always use AI for single emails
        }),
      });

      if (response.ok) {
        const result = await response.json();
        updateProgress("Email sent successfully!", 100);
        addLog(`✅ Email sent successfully to ${formData.recipientEmail}`);
        addLog(`📧 Template: ${result.template}`);
        addLog(`🤖 AI Enhanced: ${result.aiEnhanced ? "Yes" : "No"}`);
        addLog(`📎 Attachments: ${result.attachments}`);

        const successTitle = result.aiEnhanced
          ? "🎉 AI-Enhanced Email Sent!"
          : "📧 Email Sent Successfully!";

        const successDescription = result.aiEnhanced
          ? `AI-enhanced email delivered to ${formData.companyName} with ${result.attachments} attachment(s)`
          : `Personalized email delivered to ${formData.companyName} with ${result.attachments} attachment(s)`;

        toast({
          title: successTitle,
          description: successDescription,
        });

        setEmailSent(true);

        // Auto-clear form after 3 seconds
        setTimeout(() => {
          setFormData({
            companyName: "",
            recipientEmail: "",
            position: "",
            recruiterName: "",
          });
          setEmailSent(false);
          setSendingState({
            isActive: false,
            step: "",
            progress: 0,
            logs: [],
          });
        }, 3000);
      } else {
        const errorResult = await response.json();
        addLog(
          `❌ ${errorResult.error}: ${
            errorResult.message || errorResult.details
          }`
        );
        throw new Error(
          errorResult.message || errorResult.error || "Failed to send email"
        );
      }
    } catch (error) {
      addLog("❌ Email sending failed");
      updateProgress("Failed to send email", 100);
      toast({
        title: "Send Failed",
        description:
          "Failed to send email. Please check your configuration and try again.",
        variant: "destructive",
      });

      setTimeout(() => {
        setSendingState({
          isActive: false,
          step: "",
          progress: 0,
          logs: [],
        });
      }, 2000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Mail className="h-5 w-5" />
          <span>Single Email Sender</span>
        </CardTitle>
        <CardDescription>
          Send personalized job application emails using your saved template
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template & Rules Link */}
        <div className="flex justify-end">
          <Link href="/settings">
            <Button variant="outline" size="sm" className="text-xs">
              <Settings className="h-3 w-3 mr-2" />
              View Controls
            </Button>
          </Link>
        </div>

        {/* Required Fields Notice */}
        {!emailSent && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Company Name and Recipient Email are required. Other fields are
              optional but recommended for better personalization.
            </AlertDescription>
          </Alert>
        )}

        {/* Success State */}
        {emailSent && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Email sent successfully! Form will clear automatically in a few
              seconds.
            </AlertDescription>
          </Alert>
        )}

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="companyName" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Company Name *
            </Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  companyName: e.target.value,
                }))
              }
              placeholder="e.g., Google, Microsoft, Stripe"
              className={!formData.companyName ? "border-red-300" : ""}
              disabled={sendingState.isActive}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipientEmail" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Recipient Email *
            </Label>
            <Input
              id="recipientEmail"
              type="email"
              value={formData.recipientEmail}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  recipientEmail: e.target.value,
                }))
              }
              placeholder="hr@company.com"
              className={
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.recipientEmail) &&
                formData.recipientEmail
                  ? "border-red-300"
                  : ""
              }
              disabled={sendingState.isActive}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Position (Optional)</Label>
            <Input
              id="position"
              value={formData.position}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, position: e.target.value }))
              }
              placeholder="e.g., Frontend Developer, Full Stack Engineer"
              disabled={sendingState.isActive}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recruiterName" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Recruiter Name (Optional)
            </Label>
            <Input
              id="recruiterName"
              value={formData.recruiterName}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  recruiterName: e.target.value,
                }))
              }
              placeholder="e.g., Sarah, John, Alex"
              disabled={sendingState.isActive}
            />
          </div>
        </div>

        {/* Progress Section */}
        {sendingState.isActive && (
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-blue-900">{sendingState.step}</h4>
              <span className="text-sm text-blue-700">
                {sendingState.progress}%
              </span>
            </div>
            <Progress value={sendingState.progress} className="h-2" />

            {/* Live logs */}
            {sendingState.logs.length > 0 && (
              <div className="space-y-1">
                <h5 className="text-sm font-medium text-blue-800">
                  Progress Log:
                </h5>
                <div className="bg-white rounded border p-3 max-h-32 overflow-y-auto">
                  {sendingState.logs.map((log, index) => (
                    <div
                      key={index}
                      className="text-xs text-gray-600 font-mono"
                    >
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Send Button */}
        <div className="pt-4">
          <Button
            onClick={handleSendEmail}
            disabled={!isFormValid || sendingState.isActive}
            className="w-full h-12 text-lg font-semibold"
            size="lg"
          >
            {sendingState.isActive ? (
              <>
                <RefreshCw className="h-5 w-5 mr-3 animate-spin" />
                {sendingState.step}
              </>
            ) : emailSent ? (
              <>
                <CheckCircle className="h-5 w-5 mr-3" />
                Email Sent Successfully!
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-3" />
                Enhance with AI and Send
              </>
            )}
          </Button>

          {!sendingState.isActive && !emailSent && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Uses your saved template • AI enhancement when available •
              Real-time progress tracking
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
