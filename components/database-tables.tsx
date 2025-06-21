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
import {
  Search,
  Trash2,
  Download,
  RefreshCw,
  Eye,
  FileText,
  Users,
  Mail,
  Server,
  Paperclip,
  Plus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

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

interface SmtpConfig {
  id: string;
  email: string;
  smtp_host: string;
  smtp_port: number;
  use_ssl: boolean;
  provider_type: string;
  created_at: string;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  is_default: boolean;
  created_at: string;
}

interface Attachment {
  id: string;
  name: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

export function DatabaseTables() {
  const [searchTerms, setSearchTerms] = useState({
    contacts: "",
    templates: "",
    smtpCredentials: "",
    attachments: "",
  });
  const [loading, setLoading] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [data, setData] = useState({
    contacts: [] as Contact[],
    templates: [] as Template[],
    smtpConfigs: [] as SmtpConfig[],
    attachments: [] as Attachment[],
  });
  const { toast } = useToast();

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [contactsRes, templatesRes, smtpRes, attachmentsRes] =
        await Promise.all([
          fetch("/api/contacts"),
          fetch("/api/templates"),
          fetch("/api/smtp?all=true"),
          fetch("/api/attachments"),
        ]);

      const [contactsData, templatesData, smtpData, attachmentsData] =
        await Promise.all([
          contactsRes.json(),
          templatesRes.json(),
          smtpRes.json(),
          attachmentsRes.json(),
        ]);

      setData({
        contacts: contactsData.contacts || [],
        templates: templatesData.templates || [],
        smtpConfigs: smtpData.smtp_configs || [],
        attachments: attachmentsData.attachments || [],
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
        case "templates":
          endpoint = `/api/templates?id=${id}`;
          break;
        case "smtpCredentials":
          endpoint = `/api/smtp?id=${id}`;
          break;
        case "attachments":
          endpoint = `/api/attachments?id=${id}`;
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
        case "templates":
          endpoint = "/api/templates";
          dataArray = data.templates;
          break;
        case "smtpCredentials":
          endpoint = "/api/smtp";
          dataArray = data.smtpConfigs;
          break;
        case "attachments":
          endpoint = "/api/attachments";
          dataArray = data.attachments;
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
      case "templates":
        csvData = convertToCSV(data.templates, [
          "id",
          "name",
          "subject",
          "is_default",
          "created_at",
        ]);
        filename = "templates.csv";
        break;
      case "smtpCredentials":
        csvData = convertToCSV(data.smtpConfigs, [
          "id",
          "email",
          "smtp_host",
          "smtp_port",
          "provider_type",
        ]);
        filename = "smtp_configs.csv";
        break;
      case "attachments":
        csvData = convertToCSV(data.attachments, [
          "id",
          "name",
          "original_name",
          "file_size",
          "mime_type",
          "category",
        ]);
        filename = "attachments.csv";
        break;
    }

    downloadCSV(csvData, filename);
    toast({
      title: "Export Started",
      description: `${filename} will be downloaded shortly`,
    });
  };

  const convertToCSV = (data: any[], fields: string[]) => {
    const headers = fields.join(",");
    const rows = data.map((item) =>
      fields.map((field) => `"${item[field] || ""}"`).join(",")
    );
    return [headers, ...rows].join("\n");
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter functions
  const filteredContacts = data.contacts.filter(
    (contact) =>
      contact.email
        ?.toLowerCase()
        .includes(searchTerms.contacts.toLowerCase()) ||
      contact.name
        ?.toLowerCase()
        .includes(searchTerms.contacts.toLowerCase()) ||
      contact.company_name
        ?.toLowerCase()
        .includes(searchTerms.contacts.toLowerCase())
  );

  const filteredTemplates = data.templates.filter(
    (template) =>
      template.name
        ?.toLowerCase()
        .includes(searchTerms.templates.toLowerCase()) ||
      template.subject
        ?.toLowerCase()
        .includes(searchTerms.templates.toLowerCase())
  );

  const filteredSmtpConfigs = data.smtpConfigs.filter(
    (config) =>
      config.email
        ?.toLowerCase()
        .includes(searchTerms.smtpCredentials.toLowerCase()) ||
      config.provider_type
        ?.toLowerCase()
        .includes(searchTerms.smtpCredentials.toLowerCase())
  );

  const filteredAttachments = data.attachments.filter(
    (attachment) =>
      attachment.name
        ?.toLowerCase()
        .includes(searchTerms.attachments.toLowerCase()) ||
      attachment.original_name
        ?.toLowerCase()
        .includes(searchTerms.attachments.toLowerCase()) ||
      attachment.category
        ?.toLowerCase()
        .includes(searchTerms.attachments.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">
                Contacts
              </p>
              <p className="text-2xl font-bold">{data.contacts.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <FileText className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">
                Templates
              </p>
              <p className="text-2xl font-bold">{data.templates.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <Server className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">
                SMTP Configs
              </p>
              <p className="text-2xl font-bold">{data.smtpConfigs.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <Paperclip className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">
                Attachments
              </p>
              <p className="text-2xl font-bold">{data.attachments.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="contacts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="contacts" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Contacts
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger
            value="smtpCredentials"
            className="flex items-center gap-2"
          >
            <Server className="h-4 w-4" />
            SMTP
          </TabsTrigger>
          <TabsTrigger value="attachments" className="flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            Attachments
          </TabsTrigger>
        </TabsList>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Contact Database</CardTitle>
                  <CardDescription>
                    Manage your contact list and view contact details
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => fetchData()}
                    variant="outline"
                    size="sm"
                    disabled={loading}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                    />
                  </Button>
                  <Button
                    onClick={() => handleExport("contacts")}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete All Contacts</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all contacts. This action
                          cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteAll("contacts")}
                          className="bg-destructive text-destructive-foreground"
                        >
                          Delete All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  value={searchTerms.contacts}
                  onChange={(e) => handleSearch("contacts", e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">
                        {contact.email}
                      </TableCell>
                      <TableCell>{contact.name || "-"}</TableCell>
                      <TableCell>{contact.company_name || "-"}</TableCell>
                      <TableCell>{contact.role || "-"}</TableCell>
                      <TableCell>{contact.created_at}</TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete("contacts", contact.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredContacts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No contacts found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Email Templates</CardTitle>
                  <CardDescription>
                    Manage your email templates for campaigns
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Link href="/templates">
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Manage Templates
                    </Button>
                  </Link>
                  <Button
                    onClick={() => fetchData()}
                    variant="outline"
                    size="sm"
                    disabled={loading}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                    />
                  </Button>
                  <Button
                    onClick={() => handleExport("templates")}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Delete All Templates
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all templates. This
                          action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteAll("templates")}
                          className="bg-destructive text-destructive-foreground"
                        >
                          Delete All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerms.templates}
                  onChange={(e) => handleSearch("templates", e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead>Body Length</TableHead>
                    <TableHead>Variables</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">
                        {template.name}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {template.subject}
                      </TableCell>
                      <TableCell>
                        {template.is_default ? (
                          <Badge variant="default">Default</Badge>
                        ) : (
                          <Badge variant="secondary">Custom</Badge>
                        )}
                      </TableCell>
                      <TableCell>{template.body?.length || 0} chars</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {template.variables?.length || 0} vars
                        </Badge>
                      </TableCell>
                      <TableCell>{template.created_at}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Link href={`/templates?id=${template.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="destructive"
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
                  ))}
                </TableBody>
              </Table>
              {filteredTemplates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No templates found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMTP Tab */}
        <TabsContent value="smtpCredentials" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>SMTP Configurations</CardTitle>
                  <CardDescription>
                    Manage your email sending configurations
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Link href="/email-setup">
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Configure SMTP
                    </Button>
                  </Link>
                  <Button
                    onClick={() => fetchData()}
                    variant="outline"
                    size="sm"
                    disabled={loading}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                    />
                  </Button>
                  <Button
                    onClick={() => handleExport("smtpCredentials")}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search SMTP configs..."
                  value={searchTerms.smtpCredentials}
                  onChange={(e) =>
                    handleSearch("smtpCredentials", e.target.value)
                  }
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Host</TableHead>
                    <TableHead>Port</TableHead>
                    <TableHead>SSL</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSmtpConfigs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">
                        {config.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{config.provider_type}</Badge>
                      </TableCell>
                      <TableCell>{config.smtp_host}</TableCell>
                      <TableCell>{config.smtp_port}</TableCell>
                      <TableCell>
                        {config.use_ssl ? (
                          <Badge variant="default">SSL</Badge>
                        ) : (
                          <Badge variant="secondary">No SSL</Badge>
                        )}
                      </TableCell>
                      <TableCell>{config.created_at}</TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            handleDelete("smtpCredentials", config.id)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredSmtpConfigs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No SMTP configurations found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attachments Tab */}
        <TabsContent value="attachments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>File Attachments</CardTitle>
                  <CardDescription>
                    Manage your uploaded files and attachments
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Link href="/attachments">
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Manage Files
                    </Button>
                  </Link>
                  <Button
                    onClick={() => fetchData()}
                    variant="outline"
                    size="sm"
                    disabled={loading}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                    />
                  </Button>
                  <Button
                    onClick={() => handleExport("attachments")}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search attachments..."
                  value={searchTerms.attachments}
                  onChange={(e) => handleSearch("attachments", e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Original Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttachments.map((attachment) => (
                    <TableRow key={attachment.id}>
                      <TableCell className="font-medium">
                        {attachment.name}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {attachment.original_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{attachment.mime_type}</Badge>
                      </TableCell>
                      <TableCell>
                        {formatFileSize(attachment.file_size)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{attachment.category}</Badge>
                      </TableCell>
                      <TableCell>
                        {attachment.is_active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>{attachment.created_at}</TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            handleDelete("attachments", attachment.id)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredAttachments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No attachments found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
