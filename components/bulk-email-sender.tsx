"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Mail,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Sparkles,
  Paperclip,
  File,
  X,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Contact {
  id: number;
  email: string;
  name?: string;
  company_name?: string;
  role?: string;
  recruiter_name?: string;
  created_at: string;
}

interface BulkSendingState {
  isActive: boolean;
  progress: number;
  currentEmail: string;
  sent: number;
  failed: number;
  total: number;
  logs: string[];
  estimatedTimeRemaining: string;
  aiEnhanced: number;
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

export function BulkEmailSender() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkSendingState, setBulkSendingState] = useState<BulkSendingState>({
    isActive: false,
    progress: 0,
    currentEmail: "",
    sent: 0,
    failed: 0,
    total: 0,
    logs: [],
    estimatedTimeRemaining: "",
    aiEnhanced: 0,
  });
  const [campaignCompleted, setCampaignCompleted] = useState(false);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [selectedAttachments, setSelectedAttachments] = useState<number[]>([]);
  const [availableAttachments, setAvailableAttachments] = useState<
    Attachment[]
  >([]);
  const [showAttachmentsDialog, setShowAttachmentsDialog] = useState(false);
  const [loadingAttachments, setLoadingAttachments] = useState(true);
  const { toast } = useToast();

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/contacts");
      if (!response.ok) throw new Error("Failed to fetch contacts");

      const data = await response.json();
      setContacts(data.contacts || []);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      toast({
        title: "Error",
        description: "Failed to fetch contacts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
    fetchContacts();
    fetchAttachments();
  }, []);

  // Cleanup event source on unmount
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  const handleSelectContact = (contactId: number, checked: boolean) => {
    if (checked) {
      setSelectedContacts((prev) => [...prev, contactId]);
    } else {
      setSelectedContacts((prev) => prev.filter((id) => id !== contactId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContacts(contacts.map((contact) => contact.id));
    } else {
      setSelectedContacts([]);
    }
  };

  const handleAttachmentSelect = (attachmentId: number, checked: boolean) => {
    if (checked) {
      setSelectedAttachments((prev) => [...prev, attachmentId]);
    } else {
      setSelectedAttachments((prev) =>
        prev.filter((id) => id !== attachmentId)
      );
    }
  };

  // Helper function to safely close EventSource
  const safeCloseEventSource = (
    eventSource: EventSource | null,
    context: string
  ) => {
    if (eventSource) {
      console.log(
        `Closing EventSource (${context}), current state:`,
        eventSource.readyState
      );
      if (eventSource.readyState !== EventSource.CLOSED) {
        try {
          eventSource.close();
          console.log(`EventSource closed successfully (${context})`);
        } catch (error) {
          // This is expected behavior - EventSource might already be closed
          console.log(`EventSource close handled (${context})`);
        }
      } else {
        console.log(`EventSource already closed (${context})`);
      }
    }
  };

  const handleSendEmails = async () => {
    if (selectedContacts.length === 0) {
      toast({
        title: "No contacts selected",
        description: "Please select at least one contact to send emails to.",
        variant: "destructive",
      });
      return;
    }

    console.log("🚀 Starting bulk email send...");

    // Initialize state
    setBulkSendingState({
      isActive: true,
      progress: 0,
      currentEmail: "",
      sent: 0,
      failed: 0,
      total: selectedContacts.length,
      logs: [],
      estimatedTimeRemaining: "Calculating...",
      aiEnhanced: 0,
    });
    setCampaignCompleted(false);

    // Generate session ID for this campaign
    const sessionId = `campaign_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    try {
      // Start bulk email send
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactIds: selectedContacts,
          useAiCustomization: true,
          sessionId: sessionId,
          attachmentIds: selectedAttachments,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start email campaign");
      }

      const data = await response.json();
      console.log("✅ Bulk email campaign started:", data);

      // Set up event source for progress tracking
      const eventSource = new EventSource(
        `/api/email/send/progress?sessionId=${sessionId}`
      );
      setEventSource(eventSource);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("📡 Progress update:", data);

        setBulkSendingState((prev) => ({
          ...prev,
          progress: data.progress,
          currentEmail: data.currentEmail,
          sent: data.sent,
          failed: data.failed,
          total: data.total,
          logs: data.logs || prev.logs,
          estimatedTimeRemaining: data.estimatedTimeRemaining || "",
          aiEnhanced: data.aiEnhanced || 0,
        }));

        // Check if campaign is completed
        if (data.progress >= 100 || data.completed) {
          console.log("🎉 Campaign completed!");
          setCampaignCompleted(true);
          setBulkSendingState((prev) => ({ ...prev, isActive: false }));
          safeCloseEventSource(eventSource, "completion");

          // Show completion toast
          toast({
            title: "Campaign Completed!",
            description: `Sent ${data.sent} emails successfully. ${
              data.failed > 0 ? `${data.failed} failed.` : ""
            }`,
            variant: data.failed > 0 ? "destructive" : "default",
          });
        }
      };

      eventSource.onerror = (error) => {
        console.error("❌ EventSource error:", error);
        safeCloseEventSource(eventSource, "error");
        setBulkSendingState((prev) => ({ ...prev, isActive: false }));

        toast({
          title: "Connection Lost",
          description: "Lost connection to email progress. Check the logs.",
          variant: "destructive",
        });
      };
    } catch (error) {
      console.error("❌ Error starting bulk email:", error);
      setBulkSendingState((prev) => ({ ...prev, isActive: false }));
      toast({
        title: "Send Failed",
        description:
          error instanceof Error ? error.message : "Failed to send emails",
        variant: "destructive",
      });
    }
  };

  const handleStopCampaign = () => {
    if (eventSource) {
      safeCloseEventSource(eventSource, "manual stop");
      setBulkSendingState((prev) => ({ ...prev, isActive: false }));
      toast({
        title: "Campaign Stopped",
        description: "Email campaign has been stopped.",
      });
    }
  };

  const resetCampaign = () => {
    setBulkSendingState({
      isActive: false,
      progress: 0,
      currentEmail: "",
      sent: 0,
      failed: 0,
      total: 0,
      logs: [],
      estimatedTimeRemaining: "",
      aiEnhanced: 0,
    });
    setCampaignCompleted(false);
    setSelectedContacts([]);
    setSelectedAttachments([]);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading contacts...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contact Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Contacts ({selectedContacts.length} selected)
          </CardTitle>
          <CardDescription>
            Choose contacts from your database to send personalized emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No contacts available</p>
              <p className="text-sm">Upload contacts in the Dashboard first</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={
                      selectedContacts.length === contacts.length &&
                      contacts.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                    disabled={bulkSendingState.isActive}
                  />
                  <span className="text-sm font-medium">Select All</span>
                </div>
                <Badge variant="outline">
                  {contacts.length} total contacts
                </Badge>
              </div>

              <div className="border rounded-lg max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedContacts.includes(contact.id)}
                            onCheckedChange={(checked) =>
                              handleSelectContact(
                                contact.id,
                                checked as boolean
                              )
                            }
                            disabled={bulkSendingState.isActive}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {contact.email}
                        </TableCell>
                        <TableCell>{contact.name || "—"}</TableCell>
                        <TableCell>{contact.company_name || "—"}</TableCell>
                        <TableCell>{contact.role || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attachments Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Attachments ({selectedAttachments.length} selected)
          </CardTitle>
          <CardDescription>
            Choose attachments to include with your emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Select which files to include with your emails
              </div>
              {availableAttachments.length > 3 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAttachmentsDialog(true)}
                  disabled={bulkSendingState.isActive}
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
                  Upload files in Attachments Settings first
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
                        disabled={bulkSendingState.isActive}
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
                              disabled={bulkSendingState.isActive}
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
        </CardContent>
      </Card>

      {/* Attachments Dialog - Only shows when there are more than 3 attachments */}
      <Dialog
        open={showAttachmentsDialog}
        onOpenChange={setShowAttachmentsDialog}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Attachments</DialogTitle>
            <DialogDescription>
              Choose which attachments to include with your bulk emails
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
                      handleAttachmentSelect(attachment.id, checked as boolean)
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

      {/* Real-time Progress Section - Same style as single email sender */}
      {bulkSendingState.isActive && (
        <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-blue-900">
              {bulkSendingState.currentEmail || "Processing bulk emails..."}
            </h4>
            <div className="flex items-center gap-3">
              <span className="text-sm text-blue-700">
                {bulkSendingState.sent + bulkSendingState.failed}/
                {bulkSendingState.total} processed
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleStopCampaign}
                className="bg-white"
              >
                Stop Campaign
              </Button>
            </div>
          </div>
          <Progress value={bulkSendingState.progress} className="h-2" />

          {/* Live logs - Same style as single email sender */}
          {bulkSendingState.logs.length > 0 && (
            <div className="space-y-1">
              <h5 className="text-sm font-medium text-blue-800">
                Progress Log:
              </h5>
              <div className="bg-white rounded border p-3 max-h-40 overflow-y-auto">
                {bulkSendingState.logs.slice(-20).map((log, index) => (
                  <div key={index} className="text-xs text-gray-600 font-mono">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Campaign Completed Section */}
      {campaignCompleted && (
        <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h4 className="font-medium text-green-900">
                Campaign Completed!
              </h4>
            </div>
            <Button
              onClick={resetCampaign}
              variant="outline"
              className="bg-white"
            >
              Start New Campaign
            </Button>
          </div>

          {/* Final logs display */}
          {bulkSendingState.logs.length > 0 && (
            <div className="space-y-1">
              <h5 className="text-sm font-medium text-green-800">
                Final Results:
              </h5>
              <div className="bg-white rounded border p-3 max-h-40 overflow-y-auto">
                {bulkSendingState.logs.slice(-10).map((log, index) => (
                  <div key={index} className="text-xs text-gray-600 font-mono">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Send Button */}
      {!bulkSendingState.isActive && !campaignCompleted && (
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={handleSendEmails}
              disabled={selectedContacts.length === 0}
              className="w-full h-12 text-lg font-semibold"
              size="lg"
            >
              <Sparkles className="h-5 w-5 mr-3" />
              Send {selectedContacts.length} Email
              {selectedContacts.length !== 1 ? "s" : ""} with AI Enhancement
            </Button>
            {selectedContacts.length > 0 && (
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Will send to {selectedContacts.length} contact
                {selectedContacts.length !== 1 ? "s" : ""} •
                {selectedAttachments.length} attachment
                {selectedAttachments.length !== 1 ? "s" : ""} • AI enhancement
                enabled
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
