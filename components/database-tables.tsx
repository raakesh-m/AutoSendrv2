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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Search, Trash2, Edit, Download, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Contact {
  id: string;
  email: string;
  name?: string;
  company_name?: string;
  role?: string;
  recruiter_name?: string;
  additional_info?: any;
  created_at: string;
}

interface EmailSend {
  id: string;
  recipient: string;
  recipient_name?: string;
  company_name?: string;
  subject: string;
  status: string;
  sent_at?: string;
  error_message?: string;
}

interface SmtpConfig {
  id: string;
  email: string;
  smtp_host: string;
  smtp_port: number;
  use_ssl: boolean;
  created_at: string;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  created_at: string;
}

export function DatabaseTables() {
  const [searchTerms, setSearchTerms] = useState({
    contacts: "",
    emailLogs: "",
    smtpCredentials: "",
    templates: "",
  });
  const [loading, setLoading] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [data, setData] = useState({
    contacts: [] as Contact[],
    emailSends: [] as EmailSend[],
    smtpConfigs: [] as SmtpConfig[],
    templates: [] as Template[],
  });
  const { toast } = useToast();

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [contactsRes, emailSendsRes, smtpRes, templatesRes] =
        await Promise.all([
          fetch("/api/contacts"),
          fetch("/api/email-sends"),
          fetch("/api/smtp?all=true"),
          fetch("/api/templates"),
        ]);

      const [contactsData, emailSendsData, smtpData, templatesData] =
        await Promise.all([
          contactsRes.json(),
          emailSendsRes.json(),
          smtpRes.json(),
          templatesRes.json(),
        ]);

      setData({
        contacts: contactsData.contacts || [],
        emailSends: emailSendsData.emailSends || [],
        smtpConfigs: smtpData.smtp_configs || [],
        templates: templatesData.templates || [],
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch data from database",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = (table: string, term: string) => {
    setSearchTerms((prev) => ({ ...prev, [table]: term }));
  };

  const handleDelete = async (table: string, id: string) => {
    try {
      let endpoint = "";
      switch (table) {
        case "contacts":
          endpoint = `/api/contacts?id=${id}`;
          break;
        case "emailLogs":
          endpoint = `/api/email-sends?id=${id}`;
          break;
        case "smtpCredentials":
          endpoint = `/api/smtp?id=${id}`;
          break;
        case "templates":
          endpoint = `/api/templates?id=${id}`;
          break;
      }

      const response = await fetch(endpoint, { method: "DELETE" });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Item deleted from ${table}`,
        });
        fetchData(); // Refresh data
      } else {
        throw new Error("Failed to delete");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete item from ${table}`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteAll = async (table: string) => {
    setDeletingAll(true);
    try {
      let endpoint = "";
      let dataArray: any[] = [];

      switch (table) {
        case "contacts":
          endpoint = "/api/contacts";
          dataArray = data.contacts;
          break;
        case "emailLogs":
          endpoint = "/api/email-sends";
          dataArray = data.emailSends;
          break;
        case "smtpCredentials":
          endpoint = "/api/smtp";
          dataArray = data.smtpConfigs;
          break;
        case "templates":
          endpoint = "/api/templates";
          dataArray = data.templates;
          break;
      }

      // Delete all items
      const deletePromises = dataArray.map((item) =>
        fetch(`${endpoint}?id=${item.id}`, { method: "DELETE" })
      );

      await Promise.all(deletePromises);

      toast({
        title: "Success",
        description: `All items deleted from ${table}`,
      });
      fetchData(); // Refresh data
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete all items from ${table}`,
        variant: "destructive",
      });
    } finally {
      setDeletingAll(false);
    }
  };

  const handleExport = (table: string) => {
    let csvData = "";
    let filename = "";

    switch (table) {
      case "contacts":
        csvData = convertToCSV(data.contacts, [
          "id",
          "email",
          "name",
          "company_name",
          "role",
          "recruiter_name",
        ]);
        filename = "contacts.csv";
        break;
      case "emailLogs":
        csvData = convertToCSV(data.emailSends, [
          "id",
          "recipient",
          "subject",
          "status",
          "sent_at",
        ]);
        filename = "email_logs.csv";
        break;
      case "smtpCredentials":
        csvData = convertToCSV(data.smtpConfigs, [
          "id",
          "email",
          "smtp_host",
          "smtp_port",
        ]);
        filename = "smtp_configs.csv";
        break;
      case "templates":
        csvData = convertToCSV(data.templates, [
          "id",
          "name",
          "subject",
          "created_at",
        ]);
        filename = "templates.csv";
        break;
    }

    downloadCSV(csvData, filename);
    toast({
      title: "Export Started",
      description: `Exporting ${table} data to CSV...`,
    });
  };

  const convertToCSV = (data: any[], fields: string[]) => {
    const headers = fields.join(",");
    const rows = data.map((item) =>
      fields
        .map((field) => {
          const value = item[field] || "";
          return typeof value === "string" && value.includes(",")
            ? `"${value}"`
            : value;
        })
        .join(",")
    );
    return [headers, ...rows].join("\n");
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return (
          <Badge variant="default" className="bg-green-500">
            Sent
          </Badge>
        );
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredContacts = data.contacts.filter(
    (contact) =>
      contact.email
        .toLowerCase()
        .includes(searchTerms.contacts.toLowerCase()) ||
      (contact.name &&
        contact.name
          .toLowerCase()
          .includes(searchTerms.contacts.toLowerCase())) ||
      (contact.company_name &&
        contact.company_name
          .toLowerCase()
          .includes(searchTerms.contacts.toLowerCase()))
  );

  const filteredEmailSends = data.emailSends.filter(
    (email) =>
      email.recipient
        .toLowerCase()
        .includes(searchTerms.emailLogs.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchTerms.emailLogs.toLowerCase())
  );

  const filteredSmtpConfigs = data.smtpConfigs.filter(
    (smtp) =>
      smtp.email
        .toLowerCase()
        .includes(searchTerms.smtpCredentials.toLowerCase()) ||
      smtp.smtp_host
        .toLowerCase()
        .includes(searchTerms.smtpCredentials.toLowerCase())
  );

  const filteredTemplates = data.templates.filter(
    (template) =>
      template.name
        .toLowerCase()
        .includes(searchTerms.templates.toLowerCase()) ||
      template.subject
        .toLowerCase()
        .includes(searchTerms.templates.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Database Management</CardTitle>
            <CardDescription>
              View and manage all your backend data
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="contacts" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="contacts">
              Contacts ({data.contacts.length})
            </TabsTrigger>
            <TabsTrigger value="emailLogs">
              Email Logs ({data.emailSends.length})
            </TabsTrigger>
            <TabsTrigger value="smtpCredentials">
              SMTP Config ({data.smtpConfigs.length})
            </TabsTrigger>
            <TabsTrigger value="templates">
              Templates ({data.templates.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  value={searchTerms.contacts}
                  onChange={(e) => handleSearch("contacts", e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleExport("contacts")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                {data.contacts.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={deletingAll}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete All
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete all
                          {data.contacts.length} contacts from the database.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteAll("contacts")}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Recruiter</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground"
                      >
                        {loading ? "Loading..." : "No contacts found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredContacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">
                          {contact.email}
                        </TableCell>
                        <TableCell>{contact.name || "-"}</TableCell>
                        <TableCell>{contact.company_name || "-"}</TableCell>
                        <TableCell>{contact.role || "-"}</TableCell>
                        <TableCell>{contact.recruiter_name || "-"}</TableCell>
                        <TableCell>
                          {new Date(contact.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDelete("contacts", contact.id)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="emailLogs" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search email logs..."
                  value={searchTerms.emailLogs}
                  onChange={(e) => handleSearch("emailLogs", e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleExport("emailLogs")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                {data.emailSends.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={deletingAll}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete All
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete all
                          {data.emailSends.length} email logs from the database.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteAll("emailLogs")}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmailSends.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground"
                      >
                        {loading ? "Loading..." : "No email logs found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmailSends.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{log.recipient}</div>
                            {log.recipient_name && (
                              <div className="text-sm text-muted-foreground">
                                {log.recipient_name}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{log.subject}</TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell>{log.sent_at || "-"}</TableCell>
                        <TableCell>
                          {log.error_message && (
                            <div
                              className="text-sm text-red-500 max-w-32 truncate"
                              title={log.error_message}
                            >
                              {log.error_message}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete("emailLogs", log.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="smtpCredentials" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search SMTP configs..."
                  value={searchTerms.smtpCredentials}
                  onChange={(e) =>
                    handleSearch("smtpCredentials", e.target.value)
                  }
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleExport("smtpCredentials")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                {data.smtpConfigs.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={deletingAll}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete All
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete all
                          {data.smtpConfigs.length} SMTP configurations from the
                          database.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteAll("smtpCredentials")}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>SMTP Host</TableHead>
                    <TableHead>Port</TableHead>
                    <TableHead>SSL</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSmtpConfigs.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground"
                      >
                        {loading
                          ? "Loading..."
                          : "No SMTP configurations found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSmtpConfigs.map((config) => (
                      <TableRow key={config.id}>
                        <TableCell className="font-medium">
                          {config.email}
                        </TableCell>
                        <TableCell>{config.smtp_host}</TableCell>
                        <TableCell>{config.smtp_port}</TableCell>
                        <TableCell>{config.use_ssl ? "Yes" : "No"}</TableCell>
                        <TableCell>
                          {new Date(config.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDelete("smtpCredentials", config.id)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerms.templates}
                  onChange={(e) => handleSearch("templates", e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleExport("templates")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                {data.templates.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={deletingAll}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete All
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete all
                          {data.templates.length} templates from the database.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteAll("templates")}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Variables</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground"
                      >
                        {loading ? "Loading..." : "No templates found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTemplates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">
                          {template.name}
                        </TableCell>
                        <TableCell className="max-w-64 truncate">
                          {template.subject}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {template.variables?.map((variable, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs"
                              >
                                {variable}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(template.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDelete("templates", template.id)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
