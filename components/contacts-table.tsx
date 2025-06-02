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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Sparkles,
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

export function ContactsTable() {
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

  useEffect(() => {
    fetchContacts();
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

  const handleSendEmails = async () => {
    if (selectedContacts.length === 0) {
      toast({
        title: "No contacts selected",
        description: "Please select contacts to send emails to",
        variant: "destructive",
      });
      return;
    }

    // Generate session ID for real-time tracking
    const sessionId = `campaign_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Set up Server-Sent Events for real-time progress
    const newEventSource = new EventSource(
      `/api/email/send/progress?sessionId=${sessionId}`
    );
    setEventSource(newEventSource);

    // Initialize sending state
    setBulkSendingState({
      isActive: true,
      progress: 0,
      currentEmail: "Starting campaign...",
      sent: 0,
      failed: 0,
      total: selectedContacts.length,
      logs: [],
      estimatedTimeRemaining: "Calculating...",
      aiEnhanced: 0,
    });
    setCampaignCompleted(false);

    // Listen for real-time updates
    newEventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "connected") {
          console.log("Connected to progress stream");
          return;
        }

        if (data.type === "progress" || data.type === "completed") {
          setBulkSendingState({
            isActive: !data.completed,
            progress: data.progress,
            currentEmail: data.currentEmail,
            sent: data.sent,
            failed: data.failed,
            total: data.total,
            logs: data.logs || [],
            estimatedTimeRemaining: data.estimatedTimeRemaining,
            aiEnhanced: data.aiEnhanced,
          });

          if (data.completed) {
            setCampaignCompleted(true);
            setSelectedContacts([]);

            toast({
              title: "📧 Bulk Campaign Completed!",
              description: `${data.sent} emails sent, ${data.failed} failed, ${data.aiEnhanced} AI-enhanced.`,
            });

            // Auto-reset after 10 seconds
            setTimeout(() => {
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
              newEventSource.close();
              setEventSource(null);
            }, 10000);
          }
        }
      } catch (error) {
        console.error("Error parsing SSE data:", error);
      }
    };

    newEventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
      newEventSource.close();
      setEventSource(null);
    };

    try {
      // Start the actual email sending process
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactIds: selectedContacts,
          useAiCustomization: true,
          sessionId: sessionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send emails");
      }

      // The response is handled by SSE, but we can still log it
      const result = await response.json();
      console.log("Campaign completed:", result);
    } catch (error) {
      console.error("Error sending emails:", error);

      setBulkSendingState((prev) => ({
        ...prev,
        isActive: false,
        currentEmail: "Campaign failed",
      }));

      toast({
        title: "Error sending emails",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });

      // Clean up event source on error
      if (newEventSource) {
        newEventSource.close();
        setEventSource(null);
      }

      setTimeout(() => {
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
      }, 3000);
    }
  };

  const handleDeleteContact = async (contactId: number) => {
    try {
      const response = await fetch(`/api/contacts?id=${contactId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete contact");

      toast({
        title: "Contact deleted",
        description: "Contact has been removed successfully",
      });

      fetchContacts(); // Refresh the list
    } catch (error) {
      console.error("Error deleting contact:", error);
      toast({
        title: "Error",
        description: "Failed to delete contact",
        variant: "destructive",
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
              </CardTitle>
              <CardDescription className="text-base">
                Manage your contact database and send bulk email campaigns
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={fetchContacts}
              disabled={loading || bulkSendingState.isActive}
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
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Upload some contact data to get started with your email campaigns.
            </p>
          </div>
        ) : (
          <>
            {/* Enhanced Campaign Status */}
            {campaignCompleted && (
              <Alert className="mb-6 border-green-500/20 bg-green-500/5 ring-1 ring-green-500/20">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 font-medium">
                  🎉 Bulk email campaign completed successfully!{" "}
                  <span className="font-semibold">{bulkSendingState.sent}</span>{" "}
                  emails sent,
                  <span className="font-semibold">
                    {" "}
                    {bulkSendingState.failed}
                  </span>{" "}
                  failed.
                  {bulkSendingState.aiEnhanced > 0 &&
                    ` ${bulkSendingState.aiEnhanced} emails were AI-enhanced.`}
                </AlertDescription>
              </Alert>
            )}

            {/* Enhanced Real-time Bulk Send Progress */}
            {bulkSendingState.isActive && (
              <div className="mb-6 p-6 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 rounded-xl border border-blue-200/50 shadow-sm">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Mail className="h-5 w-5 text-blue-600 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-blue-900 text-lg">
                          Bulk Email Campaign in Progress
                        </h3>
                        <p className="text-sm text-blue-700">
                          Sending personalized emails to your contacts
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-blue-100 text-blue-800 font-mono"
                    >
                      {bulkSendingState.sent + bulkSendingState.failed}/
                      {bulkSendingState.total}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-blue-800">
                        Progress
                      </span>
                      <span className="font-mono text-blue-700">
                        {Math.round(bulkSendingState.progress)}%
                      </span>
                    </div>
                    <Progress
                      value={bulkSendingState.progress}
                      className="h-3 bg-blue-100"
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center space-x-2 p-3 bg-white/50 rounded-lg border border-white/80">
                      <div className="p-1.5 bg-green-500/10 rounded-md">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Sent</p>
                        <p className="font-semibold text-green-700">
                          {bulkSendingState.sent}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 p-3 bg-white/50 rounded-lg border border-white/80">
                      <div className="p-1.5 bg-red-500/10 rounded-md">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Failed</p>
                        <p className="font-semibold text-red-700">
                          {bulkSendingState.failed}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 p-3 bg-white/50 rounded-lg border border-white/80">
                      <div className="p-1.5 bg-blue-500/10 rounded-md">
                        <Clock className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">ETA</p>
                        <p className="font-semibold text-blue-700 text-sm">
                          {bulkSendingState.estimatedTimeRemaining}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 p-3 bg-white/50 rounded-lg border border-white/80">
                      <div className="p-1.5 bg-purple-500/10 rounded-md">
                        <Sparkles className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          AI Enhanced
                        </p>
                        <p className="font-semibold text-purple-700">
                          {bulkSendingState.aiEnhanced}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-white/50 rounded-lg border border-white/80">
                    <p className="text-sm font-medium text-blue-800 mb-1">
                      Currently Processing:
                    </p>
                    <p className="text-sm text-blue-700 font-mono break-all">
                      {bulkSendingState.currentEmail}
                    </p>
                  </div>

                  {/* Enhanced Real-time logs */}
                  {bulkSendingState.logs.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-blue-800">
                        Live Activity Log:
                      </h4>
                      <div className="bg-white/80 rounded-lg border border-white/80 p-4 max-h-32 overflow-y-auto">
                        <div className="space-y-1">
                          {bulkSendingState.logs.map((log, index) => (
                            <div
                              key={index}
                              className="text-xs text-gray-600 font-mono leading-relaxed"
                            >
                              {log}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Enhanced Selection and Send Controls */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    onClick={handleSendEmails}
                    disabled={
                      selectedContacts.length === 0 || bulkSendingState.isActive
                    }
                    className="h-10 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
                    size="lg"
                  >
                    {bulkSendingState.isActive ? (
                      <div className="flex items-center space-x-2">
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Sending Campaign...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4" />
                        <span>
                          Send {selectedContacts.length} AI-Personalized Email
                          {selectedContacts.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </Button>

                  {selectedContacts.length > 0 &&
                    !bulkSendingState.isActive && (
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {selectedContacts.length} selected
                        </Badge>
                      </div>
                    )}
                </div>
              </div>

              {selectedContacts.length > 5 && !bulkSendingState.isActive && (
                <Alert className="border-amber-200/50 bg-amber-50/50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <strong>Large campaign detected.</strong> Only the first 5
                    emails will use AI enhancement to avoid rate limits.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Enhanced Contacts Table */}
            <div className="rounded-xl border border-border/50 overflow-hidden bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 bg-muted/30">
                    <TableHead className="w-12 text-center">
                      <Checkbox
                        checked={selectedContacts.length === contacts.length}
                        onCheckedChange={handleSelectAll}
                        disabled={bulkSendingState.isActive}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Company</TableHead>
                    <TableHead className="font-semibold">Role</TableHead>
                    <TableHead className="font-semibold">Recruiter</TableHead>
                    <TableHead className="font-semibold">Added</TableHead>
                    <TableHead className="w-16 text-center font-semibold">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact, index) => (
                    <TableRow
                      key={contact.id}
                      className={`
                        border-border/30 transition-all duration-200 hover:bg-muted/20
                        ${
                          selectedContacts.includes(contact.id)
                            ? "bg-primary/5 border-primary/20"
                            : ""
                        }
                        ${index % 2 === 0 ? "bg-muted/5" : ""}
                      `}
                    >
                      <TableCell className="text-center">
                        <Checkbox
                          checked={selectedContacts.includes(contact.id)}
                          onCheckedChange={(checked) =>
                            handleSelectContact(contact.id, checked === true)
                          }
                          disabled={bulkSendingState.isActive}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center space-x-2">
                          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                          <span className="font-mono text-sm">
                            {contact.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            contact.name
                              ? "text-foreground"
                              : "text-muted-foreground italic"
                          }
                        >
                          {contact.name || "No name"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            contact.company_name
                              ? "text-foreground"
                              : "text-muted-foreground italic"
                          }
                        >
                          {contact.company_name || "No company"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {contact.role ? (
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-200"
                          >
                            {contact.role}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground italic text-sm">
                            No role
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            contact.recruiter_name
                              ? "text-foreground"
                              : "text-muted-foreground italic"
                          }
                        >
                          {contact.recruiter_name || "No recruiter"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <time className="text-sm text-muted-foreground font-mono">
                            {new Date(contact.created_at).toLocaleDateString()}
                          </time>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteContact(contact.id)}
                          disabled={bulkSendingState.isActive}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
