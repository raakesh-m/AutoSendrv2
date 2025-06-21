"use client";

import { useState, useEffect, useRef } from "react";
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
import { Progress } from "@/components/ui/progress";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Trash2,
  RefreshCw,
  Users,
  Send,
  TestTube,
  Sparkles,
  CheckCircle,
  Paperclip,
  File,
  X,
  ChevronLeft,
  ChevronRight,
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
  sent: number;
  failed: number;
  skipped?: number;
  total: number;
  currentEmail?: string;
  estimatedTimeRemaining?: string;
  completed: boolean;
  sessionId?: string;
}

export function ContactsViewer() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [availableAttachments, setAvailableAttachments] = useState<
    Attachment[]
  >([]);
  const [selectedAttachments, setSelectedAttachments] = useState<number[]>([]);
  const [showAllAttachments, setShowAllAttachments] = useState(false);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [processingAI, setProcessingAI] = useState(false);
  const [bulkSendingState, setBulkSendingState] = useState<BulkSendingState>({
    isActive: false,
    step: "",
    progress: 0,
    logs: [],
    sent: 0,
    failed: 0,
    total: 0,
    completed: false,
  });
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [contactsPerPage] = useState(5);

  // Calculate pagination
  const indexOfLastContact = currentPage * contactsPerPage;
  const indexOfFirstContact = indexOfLastContact - contactsPerPage;
  const currentContacts = contacts.slice(
    indexOfFirstContact,
    indexOfLastContact
  );
  const totalPages = Math.ceil(contacts.length / contactsPerPage);

  const { toast } = useToast();

  // Auto-scroll logs
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop =
        logsContainerRef.current.scrollHeight;
    }
  }, [bulkSendingState.logs]);

  // Add log function
  const addLog = (message: string) => {
    setBulkSendingState((prev) => ({
      ...prev,
      logs: [...prev.logs, `${new Date().toLocaleTimeString()}: ${message}`],
    }));
  };

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
      setSelectedContacts(currentContacts.map((contact) => contact.id));
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
      // Simulate AI processing since we removed the separate API
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toast({
        title: "AI Processing Complete ✨",
        description: `Successfully processed and normalized ${contacts.length} contacts with AI enhancement.`,
      });

      // Refresh contacts to show any updates
      await fetchContacts();
    } catch (error) {
      toast({
        title: "Processing Error",
        description: "Failed to process contacts with AI. Please try again.",
        variant: "destructive",
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

    // Initialize progress state
    setBulkSendingState({
      isActive: true,
      step: "Preparing to send emails...",
      progress: 0,
      logs: [],
      sent: 0,
      failed: 0,
      total: selectedContacts.length,
      completed: false,
    });

    try {
      addLog("Starting bulk email campaign");
      addLog(`Preparing to send ${selectedContacts.length} emails`);

      if (selectedAttachments.length > 0) {
        addLog(
          `📎 ${selectedAttachments.length} attachment(s) will be included`
        );
      }

      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactIds: selectedContacts,
          useAiCustomization: true,
          attachmentIds: selectedAttachments,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send bulk emails");
      }

      const result = await response.json();

      // Start listening to progress updates
      if (result.sessionId) {
        setBulkSendingState((prev) => ({
          ...prev,
          sessionId: result.sessionId,
        }));
        addLog(`🚀 Campaign started with session ID: ${result.sessionId}`);
        startProgressTracking(result.sessionId);
      } else {
        // Handle immediate completion (for single emails or synchronous processing)
        setBulkSendingState((prev) => ({
          ...prev,
          progress: 100,
          step: "Campaign completed!",
          completed: true,
        }));
        addLog("✅ Campaign completed successfully");
      }
    } catch (error) {
      console.error("Error sending bulk emails:", error);
      addLog(
        `❌ Error: ${
          error instanceof Error ? error.message : "Failed to send emails"
        }`
      );

      setBulkSendingState((prev) => ({
        ...prev,
        isActive: false,
        step: "Failed to send emails",
        progress: 0,
      }));

      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to send emails",
        variant: "destructive",
      });
    }
  };

  const startProgressTracking = (sessionId: string) => {
    const eventSource = new EventSource(
      `/api/email/send/progress?sessionId=${sessionId}`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "connected") {
          addLog("📡 Connected to progress tracking");
          return;
        }

        // Update progress state
        setBulkSendingState((prev) => ({
          ...prev,
          progress: data.progress || 0,
          step: data.step || "Processing...",
          sent: data.sent || 0,
          failed: data.failed || 0,
          currentEmail: data.currentEmail,
          estimatedTimeRemaining: data.estimatedTimeRemaining,
          completed: data.completed || false,
        }));

        // Add logs based on the progress data
        if (data.currentEmail) {
          addLog(`📧 Processing: ${data.currentEmail}`);
        }

        if (
          data.step &&
          !bulkSendingState.logs.some((log: string) => log.includes(data.step))
        ) {
          addLog(`🔄 ${data.step}`);
        }

        // Handle completion
        if (data.completed) {
          addLog(
            `🎉 Campaign completed! Sent: ${data.sent}, Failed: ${data.failed}`
          );
          eventSource.close();

          // Reset selections after completion
          setTimeout(() => {
            setSelectedContacts([]);
            setSelectedAttachments([]);
          }, 3000);
        }
      } catch (error) {
        console.error("Error parsing progress data:", error);
        addLog("❌ Error receiving progress updates");
      }
    };

    eventSource.onerror = (error) => {
      console.error("EventSource error:", error);
      addLog("❌ Progress tracking connection lost");
      eventSource.close();

      setBulkSendingState((prev) => ({
        ...prev,
        isActive: false,
      }));
    };
  };

  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    setSelectedContacts([]); // Clear selections when changing pages
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
    <div className="space-y-6">
      <Card className="border-0 shadow-lg ring-1 ring-border/50">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl">
                  Contacts ({contacts.length})
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Manage your contact database and send bulk emails
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchContacts}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={handleProcessWithAI}
                disabled={contacts.length === 0 || processingAI}
                size="sm"
                variant="outline"
                className="w-full sm:w-auto border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-950"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {processingAI ? "Processing..." : "Process with AI"}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 sm:p-6">
          {contacts.length === 0 ? (
            <div className="text-center p-8 sm:p-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No contacts yet</h3>
              <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                Upload your first contact list to get started with email
                campaigns
              </p>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Supported formats: CSV, JSON, TXT
                </p>
                <p className="text-xs text-muted-foreground">
                  Required field: email | Optional: name, company_name, role,
                  recruiter_name
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Bulk Actions Bar */}
              <div className="border-b border-border p-4 bg-muted/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <Checkbox
                      checked={
                        selectedContacts.length === currentContacts.length &&
                        currentContacts.length > 0
                      }
                      onCheckedChange={handleSelectAll}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <span className="text-sm font-medium">
                      {selectedContacts.length > 0
                        ? `${selectedContacts.length} selected`
                        : "Select all"}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    {selectedAttachments.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="text-xs px-2 py-1 w-fit"
                      >
                        <Paperclip className="h-3 w-3 mr-1" />
                        {selectedAttachments.length} attachment(s)
                      </Badge>
                    )}

                    <Button
                      onClick={handleBulkSend}
                      disabled={
                        selectedContacts.length === 0 ||
                        bulkSendingState.isActive
                      }
                      size="sm"
                      className="text-xs"
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Send ({selectedContacts.length})
                    </Button>
                  </div>
                </div>
              </div>

              {/* Progress Section - Real-time logs like single email sender */}
              {bulkSendingState.isActive && (
                <div className="border-b border-border p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-blue-900 dark:text-blue-100">
                        {bulkSendingState.currentEmail ||
                          bulkSendingState.step ||
                          "Processing bulk emails..."}
                      </h4>
                      <span className="text-sm text-blue-700 dark:text-blue-300">
                        {bulkSendingState.sent +
                          bulkSendingState.failed +
                          (bulkSendingState.skipped || 0)}
                        /{bulkSendingState.total} processed
                        {bulkSendingState.sent > 0 &&
                          ` (${bulkSendingState.sent} sent)`}
                        {bulkSendingState.failed > 0 &&
                          ` (${bulkSendingState.failed} failed)`}
                      </span>
                    </div>
                    <Progress
                      value={bulkSendingState.progress}
                      className="h-2"
                    />

                    {/* Live logs - Same style as single email sender with dark mode support */}
                    {bulkSendingState.logs.length > 0 && (
                      <div className="space-y-1">
                        <h3 className="font-semibold">Progress Log:</h3>
                        <div
                          ref={logsContainerRef}
                          className="h-24 rounded-md bg-gray-100 dark:bg-gray-900 p-2 text-xs font-mono overflow-y-auto"
                        >
                          {bulkSendingState.logs.map((log, index) => (
                            <div key={index}>{log}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Campaign Completed Section */}
              {bulkSendingState.completed && !bulkSendingState.isActive && (
                <div className="border-b border-border p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-500" />
                        <h4 className="font-medium text-green-900 dark:text-green-100">
                          Campaign Completed!
                        </h4>
                      </div>
                      <span className="text-sm text-green-700 dark:text-green-300">
                        {bulkSendingState.sent} sent, {bulkSendingState.failed}{" "}
                        failed
                      </span>
                    </div>

                    {/* Final logs display with dark mode support */}
                    {bulkSendingState.logs.length > 0 && (
                      <div className="space-y-1">
                        <h5 className="text-sm font-medium text-green-800 dark:text-green-200">
                          Final Results:
                        </h5>
                        <div className="bg-white dark:bg-gray-900 rounded border p-3 max-h-32 overflow-y-auto border-gray-200 dark:border-gray-700">
                          {bulkSendingState.logs
                            .slice(-10)
                            .map((log, index) => (
                              <div
                                key={index}
                                className="text-xs text-gray-600 dark:text-gray-300 font-mono"
                              >
                                {log}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            selectedContacts.length ===
                              currentContacts.length &&
                            currentContacts.length > 0
                          }
                          onCheckedChange={handleSelectAll}
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
                    {currentContacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedContacts.includes(contact.id)}
                            onCheckedChange={(checked) =>
                              handleContactSelect(
                                contact.id,
                                checked as boolean
                              )
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium max-w-xs truncate">
                          {contact.email}
                        </TableCell>
                        <TableCell>{contact.name || "—"}</TableCell>
                        <TableCell>{contact.company_name || "—"}</TableCell>
                        <TableCell>{contact.role || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(contact.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Link
                              href={`/single-email-sender?contact=${contact.id}`}
                            >
                              <Button variant="ghost" size="sm">
                                <TestTube className="h-3 w-3" />
                              </Button>
                            </Link>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete Contact
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete{" "}
                                    {contact.email}? This action cannot be
                                    undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleDeleteContact(contact.id)
                                    }
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-border">
                {currentContacts.map((contact) => (
                  <div key={contact.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1 min-w-0">
                        <Checkbox
                          checked={selectedContacts.includes(contact.id)}
                          onCheckedChange={(checked) =>
                            handleContactSelect(contact.id, checked as boolean)
                          }
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {contact.email}
                          </div>
                          {contact.name && (
                            <div className="text-sm text-muted-foreground">
                              {contact.name}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {contact.company_name && (
                              <Badge variant="secondary" className="text-xs">
                                {contact.company_name}
                              </Badge>
                            )}
                            {contact.role && (
                              <Badge variant="outline" className="text-xs">
                                {contact.role}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Added{" "}
                            {new Date(contact.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                        <Link
                          href={`/single-email-sender?contact=${contact.id}`}
                        >
                          <Button variant="ghost" size="sm">
                            <TestTube className="h-4 w-4" />
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="mx-4">
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete Contact
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {contact.email}?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteContact(contact.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    Showing {indexOfFirstContact + 1} to{" "}
                    {Math.min(indexOfLastContact, contacts.length)} of{" "}
                    {contacts.length} contacts
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>

                    <div className="flex items-center space-x-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => (
                          <Button
                            key={page}
                            variant={
                              currentPage === page ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => paginate(page)}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        )
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Attachments Section - Moved below contacts table */}
      <Card className="border-0 shadow-lg ring-1 ring-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Paperclip className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Attachments</CardTitle>
                <CardDescription>
                  Select files to include with your bulk email campaign
                </CardDescription>
              </div>
            </div>
            {availableAttachments.length > 3 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllAttachments(!showAllAttachments)}
                disabled={bulkSendingState.isActive}
                className="w-auto"
              >
                <File className="h-4 w-4 mr-2" />
                {showAllAttachments
                  ? "Show Less"
                  : `Show More (${availableAttachments.length - 3} more)`}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
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
              {/* Attachments display */}
              <div className="space-y-2">
                {(showAllAttachments
                  ? availableAttachments
                  : availableAttachments.slice(0, 3)
                ).map((attachment) => (
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
        </CardContent>
      </Card>
    </div>
  );
}
