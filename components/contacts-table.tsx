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
      <Card>
        <CardHeader>
          <CardTitle>Contacts</CardTitle>
          <CardDescription>Loading contacts...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Contacts ({contacts.length})
            </CardTitle>
            <CardDescription>
              Manage your contact database and send bulk email campaigns
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={fetchContacts}
              disabled={loading || bulkSendingState.isActive}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No contacts found. Upload some contact data to get started.
            </p>
          </div>
        ) : (
          <>
            {/* Campaign Status */}
            {campaignCompleted && (
              <Alert className="mb-6 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Bulk email campaign completed successfully!{" "}
                  {bulkSendingState.sent} emails sent, {bulkSendingState.failed}{" "}
                  failed.
                  {bulkSendingState.aiEnhanced > 0 &&
                    ` ${bulkSendingState.aiEnhanced} emails were AI-enhanced.`}
                </AlertDescription>
              </Alert>
            )}

            {/* Real-time Bulk Send Progress */}
            {bulkSendingState.isActive && (
              <div className="mb-6 p-6 bg-blue-50 rounded-lg border border-blue-200">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-blue-900">
                      📧 Bulk Email Campaign in Progress
                    </h3>
                    <Badge variant="secondary">
                      {bulkSendingState.sent + bulkSendingState.failed}/
                      {bulkSendingState.total}
                    </Badge>
                  </div>

                  <Progress value={bulkSendingState.progress} className="h-3" />

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Sent: {bulkSendingState.sent}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span>Failed: {bulkSendingState.failed}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span>{bulkSendingState.estimatedTimeRemaining}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-purple-600" />
                      <span>AI Enhanced: {bulkSendingState.aiEnhanced}</span>
                    </div>
                  </div>

                  <div className="text-sm text-blue-700">
                    <strong>Current:</strong> {bulkSendingState.currentEmail}
                  </div>

                  {/* Real-time logs */}
                  {bulkSendingState.logs.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-blue-800">
                        Live Activity:
                      </h4>
                      <div className="bg-white rounded border p-3 max-h-32 overflow-y-auto">
                        {bulkSendingState.logs.map((log, index) => (
                          <div
                            key={index}
                            className="text-xs text-gray-600 font-mono mb-1"
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

            {/* Selection and Send Controls */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex items-center space-x-2">
                <Button
                  onClick={handleSendEmails}
                  disabled={
                    selectedContacts.length === 0 || bulkSendingState.isActive
                  }
                  className="flex items-center gap-2"
                >
                  {bulkSendingState.isActive ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Sending Campaign...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      Send to {selectedContacts.length} contacts
                    </>
                  )}
                </Button>

                {selectedContacts.length > 0 && !bulkSendingState.isActive && (
                  <Badge variant="outline">
                    {selectedContacts.length} selected
                  </Badge>
                )}
              </div>

              {selectedContacts.length > 5 && !bulkSendingState.isActive && (
                <Alert className="flex-1">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Large campaign detected. Only first 5 emails will use AI
                    enhancement to avoid rate limits.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Contacts Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedContacts.length === contacts.length}
                        onCheckedChange={handleSelectAll}
                        disabled={bulkSendingState.isActive}
                      />
                    </TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Recruiter</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="w-12">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedContacts.includes(contact.id)}
                          onCheckedChange={(checked) =>
                            handleSelectContact(contact.id, checked === true)
                          }
                          disabled={bulkSendingState.isActive}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {contact.email}
                      </TableCell>
                      <TableCell>{contact.name || "-"}</TableCell>
                      <TableCell>{contact.company_name || "-"}</TableCell>
                      <TableCell>
                        {contact.role ? (
                          <Badge variant="outline">{contact.role}</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{contact.recruiter_name || "-"}</TableCell>
                      <TableCell>
                        {new Date(contact.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteContact(contact.id)}
                          disabled={bulkSendingState.isActive}
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
