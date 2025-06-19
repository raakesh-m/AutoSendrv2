"use client";

import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Paperclip,
  File,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SendingState {
  isActive: boolean;
  step: string;
  progress: number;
  logs: string[];
}

interface Attachment {
  id: number;
  name: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  category: string;
  description?: string;
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
  const [selectedAttachments, setSelectedAttachments] = useState<number[]>([]);
  const [availableAttachments, setAvailableAttachments] = useState<
    Attachment[]
  >([]);
  const [showAttachmentsDialog, setShowAttachmentsDialog] = useState(false);
  const [loadingAttachments, setLoadingAttachments] = useState(true);
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

  const fetchAttachments = async () => {
    try {
      setLoadingAttachments(true);
      const response = await fetch("/api/attachments");
      if (!response.ok) throw new Error("Failed to fetch attachments");

      const data = await response.json();
      setAvailableAttachments(data.attachments || []);
    } catch (error) {
      console.error("Error fetching attachments:", error);
      toast({
        title: "Error",
        description: "Failed to fetch attachments",
        variant: "destructive",
      });
    } finally {
      setLoadingAttachments(false);
    }
  };

  useEffect(() => {
    fetchAttachments();
  }, []);

  const handleAttachmentSelect = (attachmentId: number, checked: boolean) => {
    if (checked) {
      setSelectedAttachments((prev) => [...prev, attachmentId]);
    } else {
      setSelectedAttachments((prev) =>
        prev.filter((id) => id !== attachmentId)
      );
    }
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

      // Send the email using unified system with selected attachments
      const response = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: formData.recipientEmail,
          companyName: formData.companyName,
          position: formData.position,
          recruiterName: formData.recruiterName,
          useAiCustomization: true, // Always use AI for single emails
          attachmentIds: selectedAttachments, // Include selected attachments
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
          setSelectedAttachments([]);
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

        {/* Attachments Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Attachments ({selectedAttachments.length} selected)
            </Label>
            {availableAttachments.length > 3 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAttachmentsDialog(true)}
                disabled={sendingState.isActive}
              >
                <File className="h-4 w-4 mr-2" />
                Show More ({availableAttachments.length - 3} more)
              </Button>
            )}
          </div>

          {loadingAttachments ? (
            <div className="flex items-center gap-2 p-4 border rounded-lg bg-muted/30">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">
                Loading attachments...
              </span>
            </div>
          ) : availableAttachments.length === 0 ? (
            <div className="text-center py-6 border rounded-lg bg-muted/30">
              <File className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm text-muted-foreground">
                No attachments available
              </p>
              <p className="text-xs text-muted-foreground">
                Upload files in{" "}
                <Link
                  href="/attachments"
                  className="text-blue-600 hover:underline"
                >
                  Attachments Settings
                </Link>
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Top 3 attachments shown directly */}
              <div className="space-y-2">
                {availableAttachments.slice(0, 3).map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedAttachments.includes(attachment.id)}
                      onCheckedChange={(checked) =>
                        handleAttachmentSelect(
                          attachment.id,
                          checked as boolean
                        )
                      }
                      disabled={sendingState.isActive}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <File className="h-4 w-4 text-blue-500" />
                        <span className="font-medium text-sm">
                          {attachment.name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {attachment.category}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {(attachment.file_size / 1024).toFixed(1)} KB •{" "}
                        {attachment.mime_type}
                      </div>
                      {attachment.description && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {attachment.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Selected attachments summary */}
              {selectedAttachments.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="flex flex-wrap gap-2">
                    {selectedAttachments.map((attachmentId) => {
                      const attachment = availableAttachments.find(
                        (att) => att.id === attachmentId
                      );
                      if (!attachment) return null;

                      return (
                        <Badge
                          key={attachmentId}
                          variant="secondary"
                          className="flex items-center gap-1 px-2 py-1"
                        >
                          <Paperclip className="h-3 w-3" />
                          <span className="text-xs">{attachment.name}</span>
                          <button
                            onClick={() =>
                              handleAttachmentSelect(attachmentId, false)
                            }
                            className="ml-1 hover:text-red-500"
                            disabled={sendingState.isActive}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Attachments Dialog - Only shows when there are more than 3 attachments */}
        <Dialog
          open={showAttachmentsDialog}
          onOpenChange={setShowAttachmentsDialog}
        >
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>All Attachments</DialogTitle>
              <DialogDescription>
                Choose which attachments to include with your email
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-3">
                {availableAttachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedAttachments.includes(attachment.id)}
                      onCheckedChange={(checked) =>
                        handleAttachmentSelect(
                          attachment.id,
                          checked as boolean
                        )
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <File className="h-4 w-4 text-blue-500" />
                        <span className="font-medium text-sm">
                          {attachment.name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {attachment.category}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {(attachment.file_size / 1024).toFixed(1)} KB •{" "}
                        {attachment.mime_type}
                      </div>
                      {attachment.description && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {attachment.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAttachmentsDialog(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
              Real-time progress tracking • {selectedAttachments.length}{" "}
              attachment(s) selected
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
