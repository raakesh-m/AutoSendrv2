"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Key,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";

interface ApiKey {
  id: number;
  key_name: string;
  api_key: string;
  is_active: boolean;
  usage_count: number;
  last_used_at: string | null;
  daily_reset_at: string;
  rate_limit_hit_at: string | null;
  notes: string | null;
  created_at: string;
}

export default function ApiKeysPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    key_name: "",
    api_key: "",
    notes: "",
  });

  useEffect(() => {
    if (status === "loading") return; // Still loading
    if (!session) {
      router.push("/auth/signin");
      return;
    }
    fetchApiKeys();
  }, [session, status, router]);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch("/api/groq-keys");
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.keys || []);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch API keys",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (submitting) {
      return;
    }

    if (!formData.key_name.trim() || !formData.api_key.trim()) {
      toast({
        title: "Error",
        description: "Key name and API key are required",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const url = editingKey
        ? `/api/groq-keys/${editingKey.id}`
        : "/api/groq-keys";
      const method = editingKey ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `API key ${
            editingKey ? "updated" : "added"
          } successfully`,
        });

        setFormData({ key_name: "", api_key: "", notes: "" });
        setShowAddDialog(false);
        setEditingKey(null);
        fetchApiKeys();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to save API key",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save API key",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (key: ApiKey) => {
    setEditingKey(key);
    setFormData({
      key_name: key.key_name,
      api_key: key.api_key,
      notes: key.notes || "",
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/groq-keys/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "API key deleted successfully",
        });
        fetchApiKeys();
      } else {
        // Get the specific error message from the API response
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to delete API key",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete API key",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (key: ApiKey) => {
    try {
      const response = await fetch(`/api/groq-keys/${key.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key_name: key.key_name,
          api_key: key.api_key,
          notes: key.notes,
          is_active: !key.is_active,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `API key ${key.is_active ? "deactivated" : "activated"}`,
        });
        fetchApiKeys();
      } else {
        // Get the specific error message from the API response
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to update API key status",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update API key status",
        variant: "destructive",
      });
    }
  };

  const toggleKeyVisibility = (id: number) => {
    setVisibleKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const maskApiKey = (key: string) => {
    return key.slice(0, 8) + "..." + key.slice(-4);
  };

  const getStatusBadge = (key: ApiKey) => {
    if (!key.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    if (key.rate_limit_hit_at) {
      const hitTime = new Date(key.rate_limit_hit_at);
      const now = new Date();
      const hoursSinceHit =
        (now.getTime() - hitTime.getTime()) / (1000 * 60 * 60);

      if (hoursSinceHit < 24) {
        return <Badge variant="destructive">Rate Limited</Badge>;
      }
    }
    return <Badge variant="default">Active</Badge>;
  };

  const resetDialog = () => {
    setFormData({ key_name: "", api_key: "", notes: "" });
    setEditingKey(null);
    setShowAddDialog(false);
    setSubmitting(false);
  };

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading API keys...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!session) {
    return null; // Redirecting
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <Key className="h-8 w-8 text-green-600" />
            <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          </div>
          <p className="text-muted-foreground">
            Manage your Groq API keys for AI-powered email enhancement and
            personalization.
          </p>
        </div>

        {/* API Keys Info */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-green-600 dark:text-green-400 text-lg">🔑</div>
            <div>
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                Secure API Key Management
              </h3>
              <p className="text-sm text-green-800 dark:text-green-200">
                Your API keys are encrypted and stored securely. Each user
                manages their own keys privately. Get your Groq API key from the
                Groq Console to enable AI features.
              </p>
            </div>
          </div>
        </div>

        {/* Add API Key Button */}
        <div className="flex justify-end">
          <Dialog
            open={showAddDialog}
            onOpenChange={(open) => {
              if (!open) resetDialog();
              setShowAddDialog(open);
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add API Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingKey ? "Edit API Key" : "Add New API Key"}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="key_name">Key Name</Label>
                  <Input
                    id="key_name"
                    value={formData.key_name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        key_name: e.target.value,
                      }))
                    }
                    placeholder="e.g., Primary Key, Backup Key 1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="api_key">API Key</Label>
                  <Input
                    id="api_key"
                    type="password"
                    value={formData.api_key}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        api_key: e.target.value,
                      }))
                    }
                    placeholder="gsk_..."
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    placeholder="Optional notes about this key..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetDialog}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        {editingKey ? "Updating..." : "Adding..."}
                      </>
                    ) : (
                      `${editingKey ? "Update" : "Add"} Key`
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Key className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Total Keys</p>
                  <p className="text-2xl font-bold">{apiKeys.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Active Keys</p>
                  <p className="text-2xl font-bold">
                    {apiKeys.filter((k) => k.is_active).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium">Daily Limit</p>
                  <p className="text-2xl font-bold">
                    {apiKeys.filter((k) => k.is_active).length * 14400}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* API Keys Table */}
        <Card>
          <CardHeader>
            <CardTitle>Your API Keys</CardTitle>
          </CardHeader>
          <CardContent>
            {apiKeys.length === 0 ? (
              <div className="text-center py-8">
                <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No API Keys Found</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first Groq API key to start using AI enhancement
                </p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Key
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>API Key</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">
                        {key.key_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <code className="text-sm">
                            {visibleKeys.has(key.id)
                              ? key.api_key
                              : maskApiKey(key.api_key)}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleKeyVisibility(key.id)}
                          >
                            {visibleKeys.has(key.id) ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(key)}</TableCell>
                      <TableCell>{key.usage_count}</TableCell>
                      <TableCell>
                        {key.last_used_at
                          ? new Date(key.last_used_at).toLocaleString()
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(key)}
                          >
                            {key.is_active ? (
                              <XCircle className="h-4 w-4" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(key)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete API Key
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "
                                  {key.key_name}
                                  "? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(key.id)}
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
            )}
          </CardContent>
        </Card>

        {/* Rate Limits Info */}
        <Card>
          <CardHeader>
            <CardTitle>Rate Limit Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Per Key Limits (Free Tier)</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• 30 requests per minute</li>
                  <li>• 14,400 requests per day</li>
                  <li>• 18,000 tokens per minute</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Your Current Capacity</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>
                    • {apiKeys.filter((k) => k.is_active).length * 30} requests
                    per minute
                  </li>
                  <li>
                    • {apiKeys.filter((k) => k.is_active).length * 14400}{" "}
                    requests per day
                  </li>
                  <li>• Automatic key rotation when limits are hit</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
