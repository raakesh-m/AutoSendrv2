"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Settings,
  Key,
  RotateCcw,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle,
  AlertCircle,
  Edit,
  Shield,
  Info,
  Zap,
  Clock,
  Power,
  PowerOff,
} from "lucide-react";
import {
  PROVIDER_CONFIGS,
  type AIProvider,
  type AIApiKey,
} from "@/lib/ai-providers";

interface AIUserPreferences {
  id: number;
  user_id: string;
  enable_global_rotation: boolean;
  preferred_provider: AIProvider;
  fallback_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export default function AIKeysPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [keys, setKeys] = useState<AIApiKey[]>([]);
  const [preferences, setPreferences] = useState<AIUserPreferences | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingKey, setEditingKey] = useState<AIApiKey | null>(null);
  const [showPasswords, setShowPasswords] = useState<Set<number>>(new Set());

  // Form state for new/edit key
  const [keyForm, setKeyForm] = useState({
    provider: "groq" as AIProvider,
    key_name: "",
    api_key: "",
    model_preference: "",
    enable_rotation: false,
    notes: "",
  });

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }
    fetchData();
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [keysResponse, prefsResponse] = await Promise.all([
        fetch("/api/ai-keys"),
        fetch("/api/ai-preferences"),
      ]);

      if (keysResponse.ok) {
        const keysData = await keysResponse.json();
        setKeys(keysData.keys || []);
      }

      if (prefsResponse.ok) {
        const prefsData = await prefsResponse.json();
        setPreferences(prefsData.preferences);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch AI keys data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setKeyForm({
      provider: "groq" as AIProvider,
      key_name: "",
      api_key: "",
      model_preference: "",
      enable_rotation: false,
      notes: "",
    });
    setEditingKey(null);
  };

  const handleAddKey = async () => {
    if (!keyForm.provider || !keyForm.key_name || !keyForm.api_key) {
      toast({
        title: "Error",
        description: "Provider, key name, and API key are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/ai-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(keyForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add key");
      }

      toast({
        title: "Success",
        description: "AI API key added successfully",
      });

      setShowAddDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add key",
        variant: "destructive",
      });
    }
  };

  const handleUpdateKey = async (keyId: number, updates: Partial<AIApiKey>) => {
    try {
      const response = await fetch(`/api/ai-keys/${keyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update key");
      }

      toast({
        title: "Success",
        description: "AI API key updated successfully",
      });

      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update key",
        variant: "destructive",
      });
    }
  };

  const handleDeleteKey = async (keyId: number) => {
    try {
      const response = await fetch(`/api/ai-keys/${keyId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete key");
      }

      toast({
        title: "Success",
        description: "AI API key deleted successfully",
      });

      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete key",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePreferences = async (
    updates: Partial<AIUserPreferences>
  ) => {
    try {
      const response = await fetch("/api/ai-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update preferences");
      }

      toast({
        title: "Success",
        description: "AI preferences updated successfully",
      });

      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update preferences",
        variant: "destructive",
      });
    }
  };

  const togglePasswordVisibility = (keyId: number) => {
    const newShowPasswords = new Set(showPasswords);
    if (newShowPasswords.has(keyId)) {
      newShowPasswords.delete(keyId);
    } else {
      newShowPasswords.add(keyId);
    }
    setShowPasswords(newShowPasswords);
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return "*".repeat(key.length);
    return key.slice(0, 4) + "*".repeat(8) + key.slice(-4);
  };

  const getUsagePercentage = (usage: number, limit?: number) => {
    if (!limit) return 0;
    return Math.round((usage / limit) * 100);
  };

  const isRateLimited = (rateLimitHitAt?: string, provider?: AIProvider) => {
    if (!rateLimitHitAt || !provider) return false;
    const hitTime = new Date(rateLimitHitAt).getTime();
    const config = PROVIDER_CONFIGS[provider];
    const hoursAgo = (Date.now() - hitTime) / (1000 * 60 * 60);
    return hoursAgo < config.rateLimitResetHours;
  };

  const getActiveKeysCount = () => keys.filter((key) => key.is_active).length;

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const activeKeysCount = getActiveKeysCount();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI API Keys</h1>
            <p className="text-muted-foreground mt-1">
              Manage your AI provider API keys with intelligent rotation and
              fallback support
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  activeKeysCount > 0 ? "bg-green-500" : "bg-red-500"
                } animate-pulse`}
              ></div>
              <span className="text-sm text-muted-foreground">
                {activeKeysCount} Active Key{activeKeysCount !== 1 ? "s" : ""}
              </span>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add API Key
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New AI API Key</DialogTitle>
                  <DialogDescription>
                    Add a new API key for any supported AI provider
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="provider">Provider *</Label>
                    <Select
                      value={keyForm.provider}
                      onValueChange={(value: AIProvider) =>
                        setKeyForm({
                          ...keyForm,
                          provider: value,
                          model_preference: "",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PROVIDER_CONFIGS).map(
                          ([key, config]) => (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center space-x-2">
                                <span>{config.displayName}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {config.defaultModel}
                                </Badge>
                              </div>
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="key_name">Key Name *</Label>
                    <Input
                      id="key_name"
                      value={keyForm.key_name}
                      onChange={(e) =>
                        setKeyForm({ ...keyForm, key_name: e.target.value })
                      }
                      placeholder="e.g., My OpenAI Key"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="api_key">API Key *</Label>
                    <Input
                      id="api_key"
                      type="password"
                      value={keyForm.api_key}
                      onChange={(e) =>
                        setKeyForm({ ...keyForm, api_key: e.target.value })
                      }
                      placeholder="Enter your API key"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model_preference">Preferred Model</Label>
                    <Select
                      value={keyForm.model_preference}
                      onValueChange={(value) =>
                        setKeyForm({ ...keyForm, model_preference: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={`Default: ${
                            PROVIDER_CONFIGS[keyForm.provider]?.defaultModel
                          }`}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDER_CONFIGS[
                          keyForm.provider
                        ]?.supportedModels.map((model) => (
                          <SelectItem key={model} value={model}>
                            <div className="flex items-center space-x-2">
                              <span>{model}</span>
                              {model ===
                                PROVIDER_CONFIGS[keyForm.provider]
                                  .defaultModel && (
                                <Badge variant="outline" className="text-xs">
                                  Recommended
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={keyForm.notes}
                      onChange={(e) =>
                        setKeyForm({ ...keyForm, notes: e.target.value })
                      }
                      placeholder="Add any notes about this key"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleAddKey}>Add Key</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Warning for no active keys */}
        {activeKeysCount === 0 && (
          <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                    No Active API Keys
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    You need at least one active API key to use AI features in
                    AutoSendr. Add a key from any supported provider to get
                    started.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Quick Actions</span>
            </CardTitle>
            <CardDescription>
              Quickly enable or disable all API keys
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => {
                  keys.forEach((key) => {
                    if (!key.is_active) {
                      handleUpdateKey(key.id, { is_active: true });
                    }
                  });
                }}
                disabled={
                  keys.length === 0 || keys.every((key) => key.is_active)
                }
              >
                <Power className="h-4 w-4 mr-2" />
                Enable All Keys
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  keys.forEach((key) => {
                    if (key.is_active) {
                      handleUpdateKey(key.id, { is_active: false });
                    }
                  });
                }}
                disabled={
                  keys.length === 0 || keys.every((key) => !key.is_active)
                }
              >
                <PowerOff className="h-4 w-4 mr-2" />
                Disable All Keys
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Keys Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Key className="h-5 w-5" />
              <span>API Keys ({keys.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {keys.length === 0 ? (
              <div className="text-center py-12">
                <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No API Keys</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first AI API key to get started with multi-provider
                  support
                </p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add API Key
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider & Model</TableHead>
                    <TableHead>Key Name</TableHead>
                    <TableHead>API Key</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Usage Count</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.map((key) => {
                    const config = PROVIDER_CONFIGS[key.provider];
                    const usagePercent = getUsagePercentage(
                      key.usage_count,
                      key.daily_limit
                    );
                    const isLimited = isRateLimited(
                      key.rate_limit_hit_at,
                      key.provider
                    );

                    return (
                      <TableRow key={key.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {config.displayName}
                            </div>
                            <Select
                              value={
                                key.model_preference || config.defaultModel
                              }
                              onValueChange={(value) =>
                                handleUpdateKey(key.id, {
                                  model_preference: value,
                                })
                              }
                            >
                              <SelectTrigger className="w-full h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {config.supportedModels.map((model) => (
                                  <SelectItem key={model} value={model}>
                                    <div className="flex items-center space-x-2">
                                      <span>{model}</span>
                                      {model === config.defaultModel && (
                                        <Badge
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          Recommended
                                        </Badge>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {key.key_name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <code className="text-sm">
                              {showPasswords.has(key.id)
                                ? key.api_key
                                : maskApiKey(key.api_key)}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => togglePasswordVisibility(key.id)}
                            >
                              {showPasswords.has(key.id) ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={key.is_active}
                              onCheckedChange={(checked) =>
                                handleUpdateKey(key.id, { is_active: checked })
                              }
                            />
                            {isLimited && (
                              <Badge variant="destructive">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Limited
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {key.usage_count}
                          </div>
                        </TableCell>
                        <TableCell>
                          {key.last_used_at ? (
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span className="text-sm">
                                {new Date(
                                  key.last_used_at
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Never
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                title="Delete key"
                              >
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
                                  {key.key_name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteKey(key.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
