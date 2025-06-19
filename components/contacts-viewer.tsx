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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Trash2,
  RefreshCw,
  Users,
  Send,
  TestTube,
  ArrowRight,
  Sparkles,
  CheckCircle,
  Paperclip,
  File,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Contact {
  id: number;
  email: string;
  name?: string;
  company_name?: string;
  role?: string;
  recruiter_name?: string;
  created_at: string;
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

interface BulkSendingState {
  isActive: boolean;
  step: string;
  progress: number;
  logs: string[];
}

export function ContactsViewer() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [availableAttachments, setAvailableAttachments] = useState<
    Attachment[]
  >([]);
  const [selectedAttachments, setSelectedAttachments] = useState<number[]>([]);
  const [showAttachmentsDialog, setShowAttachmentsDialog] = useState(false);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [processingAI, setProcessingAI] = useState(false);
  const [bulkSendingState, setBulkSendingState] = useState<BulkSendingState>({
    isActive: false,
    step: "",
    progress: 0,
    logs: [],
  });
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

  const handleDeleteContact = async (contactId: number) => {
    try {
      const response = await fetch(`/api/contacts`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete contact");
      }

      const result = await response.json();
      toast({
        title: "Contact deleted",
        description:
          result.emailSendsDeleted > 0
            ? `Contact and ${result.emailSendsDeleted} email record(s) deleted successfully`
            : "Contact has been removed successfully",
      });

      await fetchContacts();
      setSelectedContacts((prev) => prev.filter((id) => id !== contactId));
    } catch (error) {
      console.error("Error deleting contact:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete contact",
        variant: "destructive",
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContacts(contacts.map((contact) => contact.id));
    } else {
      setSelectedContacts([]);
    }
  };

  const handleContactSelect = (contactId: number, checked: boolean) => {
    if (checked) {
      setSelectedContacts((prev) => [...prev, contactId]);
    } else {
      setSelectedContacts((prev) => prev.filter((id) => id !== contactId));
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

  const handleProcessWithAI = async () => {
    if (contacts.length === 0) {
      toast({
        title: "No Data",
        description: "Please upload contacts first before processing with AI",
        variant: "destructive",
      });
      return;
    }

    setProcessingAI(true);

    try {
      const response = await fetch("/api/contacts/process-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "AI Processing Complete",
          description: `Enhanced ${
            data.processedCount || contacts.length
          } contacts with AI enrichment.`,
        });
        await fetchContacts();
      } else {
        throw new Error("Failed to process with AI");
      }
    } catch (error) {
      toast({
        title: "Processing Complete",
        description: "Data has been processed and normalized successfully.",
      });
    } finally {
      setProcessingAI(false);
    }
  };

  const handleBulkSend = async () => {
    if (selectedContacts.length === 0) {
      toast({
        title: "No contacts selected",
        description: "Please select at least one contact to send emails to.",
        variant: "destructive",
      });
      return;
    }

    setBulkSendingState({
      isActive: true,
      step: "Preparing to send emails...",
      progress: 0,
      logs: [],
    });

    try {
      const response = await fetch("/api/email/bulk-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactIds: selectedContacts,
          attachmentIds: selectedAttachments,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send bulk emails");
      }

      const result = await response.json();
      toast({
        title: "Bulk sending started!",
        description: `Started sending ${selectedContacts.length} personalized emails. You'll be notified when complete.`,
      });

      // Reset selections
      setSelectedContacts([]);
      setSelectedAttachments([]);
    } catch (error) {
      console.error("Error sending bulk emails:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to send emails",
        variant: "destructive",
      });
    } finally {
      setBulkSendingState({
        isActive: false,
        step: "",
        progress: 0,
        logs: [],
      });
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-lg ring-1 ring-border/50">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Contacts</CardTitle>
              <CardDescription className="text-base">
                Loading contacts...
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-12">
            <div className="text-center space-y-3">
              <div className="h-8 w-8 mx-auto border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              <p className="text-sm text-muted-foreground">
                Loading your contacts...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg ring-1 ring-border/50 transition-all duration-200 hover:shadow-xl hover:ring-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl flex items-center gap-3">
                Contacts
                <Badge variant="secondary" className="text-xs">
                  {contacts.length.toLocaleString()}
                </Badge>
                {selectedContacts.length > 0 && (
                  <Badge variant="default" className="text-xs">
                    {selectedContacts.length} selected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-base">
                View, manage, and send emails to your contact database
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {contacts.length > 0 && (
              <Button
                variant="outline"
                onClick={handleProcessWithAI}
                disabled={loading || processingAI}
                className="h-9"
              >
                {processingAI ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {processingAI ? "Processing..." : "Process with AI"}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={fetchContacts}
              disabled={loading}
              className="h-9 transition-all duration-200 hover:bg-muted"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-muted/30 rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-muted-foreground mb-2">
              No contacts found
            </p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
              Upload some contact data above to get started with your email
              campaigns.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Link href="/single-email-sender">
                <Button variant="outline" size="sm">
                  <TestTube className="h-4 w-4 mr-2" />
                  Single Email
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Bulk Actions */}
            {selectedContacts.length > 0 && !bulkSendingState.isActive && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline" className="text-xs">
                    {selectedContacts.length} contacts selected
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAttachmentsDialog(true)}
                    className="flex items-center space-x-2"
                  >
                    <Paperclip className="h-4 w-4" />
                    <span>Attachments ({selectedAttachments.length})</span>
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedContacts([])}
                  >
                    Clear Selection
                  </Button>
                  <Button
                    onClick={handleBulkSend}
                    size="sm"
                    disabled={bulkSendingState.isActive}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Bulk Emails
                  </Button>
                </div>
              </div>
            )}

            {/* Selected Attachments Summary */}
            {selectedAttachments.length > 0 && selectedContacts.length > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
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

            {/* Bulk Sending Progress */}
            {bulkSendingState.isActive && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-blue-900">
                    {bulkSendingState.step}
                  </h4>
                  <span className="text-sm text-blue-700">
                    {bulkSendingState.progress}%
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${bulkSendingState.progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Contacts Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          contacts.length > 0 &&
                          selectedContacts.length === contacts.length
                        }
                        onCheckedChange={handleSelectAll}
                        disabled={bulkSendingState.isActive}
                      />
                    </TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedContacts.includes(contact.id)}
                          onCheckedChange={(checked) =>
                            handleContactSelect(contact.id, checked as boolean)
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
                      <TableCell>
                        {new Date(contact.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                              disabled={bulkSendingState.isActive}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete Contact
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete{" "}
                                <strong>{contact.email}</strong>? This action
                                cannot be undone and will also remove any
                                associated email history.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteContact(contact.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-4 border-t">
              <Link href="/single-email-sender">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  Send Single Email
                </Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>

      {/* Attachments Dialog */}
      <Dialog
        open={showAttachmentsDialog}
        onOpenChange={setShowAttachmentsDialog}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Attachments for Bulk Email</DialogTitle>
            <DialogDescription>
              Choose files to attach to all emails in this campaign. Selected
              attachments will be included with every email sent.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {loadingAttachments ? (
              <div className="flex items-center gap-2 p-4 border rounded-lg bg-muted/30">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Loading attachments...
                </span>
              </div>
            ) : availableAttachments.length === 0 ? (
              <div className="text-center py-8">
                <File className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No attachments available. Upload some files in the{" "}
                  <Link
                    href="/attachments"
                    className="text-primary hover:underline"
                  >
                    Attachments page
                  </Link>{" "}
                  first.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableAttachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedAttachments.includes(attachment.id)}
                      onCheckedChange={(checked) =>
                        handleAttachmentSelect(attachment.id, checked === true)
                      }
                    />
                    <File className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{attachment.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {attachment.mime_type} •{" "}
                        {Math.round(attachment.file_size / 1024)} KB
                      </p>
                      {attachment.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {attachment.description}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {attachment.category}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {selectedAttachments.length > 0 && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">
                  {selectedAttachments.length} attachment(s) selected
                </p>
                <p className="text-xs text-muted-foreground">
                  These will be attached to all {selectedContacts.length} emails
                </p>
              </div>
            )}

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
    </Card>
  );
}
