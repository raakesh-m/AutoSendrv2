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
  Trash2,
  Edit,
  Eye,
  EyeOff,
  RotateCcw,
  Settings,
  Key,
  Zap,
  Clock,
  Shield,
  CheckCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import { PROVIDER_CONFIGS, type AIProvider } from "@/lib/ai-key-manager";

interface AIApiKey {
  id: number;
  provider: AIProvider;
  key_name: string;
  api_key: string;
  model_preference?: string;
  is_active: boolean;
  enable_rotation: boolean;
  usage_count: number;
  daily_limit?: number;
  last_used_at?: string;
  daily_reset_at: string;
  rate_limit_hit_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface AIUserPreferences {
  id: number;
  user_id: string;
  enable_global_rotation: boolean;
  preferred_provider: AIProvider;
  fallback_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface KeyStats {
  provider: string;
  total_keys: number;
  active_keys: number;
  rotation_enabled_keys: number;
  total_usage: number;
  last_used: string | null;
}

export function AIKeysManager() {
  const [keys, setKeys] = useState<AIApiKey[]>([]);
  const [preferences, setPreferences] = useState<AIUserPreferences | null>(
    null
  );
  const [keyStats, setKeyStats] = useState<KeyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingKey, setEditingKey] = useState<AIApiKey | null>(null);
  const [showPasswords, setShowPasswords] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  // Form state
  const [newKey, setNewKey] = useState({
    provider: "groq" as AIProvider,
    key_name: "",
    api_key: "",
    model_preference: "",
    enable_rotation: false,
    notes: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [keysResponse, prefsResponse] = await Promise.all([
        fetch("/api/ai-keys"),
        fetch("/api/ai-preferences"),
      ]);

      if (!keysResponse.ok || !prefsResponse.ok) {
        throw new Error("Failed to fetch data");
      }

      const keysData = await keysResponse.json();
      const prefsData = await prefsResponse.json();

      setKeys(keysData.keys || []);
      setPreferences(prefsData.preferences);
      setKeyStats(prefsData.keyStats || []);
    } catch (error) {
      console.error("Error fetching AI keys data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch AI keys data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddKey = async () => {
    if (!newKey.provider || !newKey.key_name || !newKey.api_key) {
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
        body: JSON.stringify(newKey),
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
      setNewKey({
        provider: "groq" as AIProvider,
        key_name: "",
        api_key: "",
        model_preference: "",
        enable_rotation: false,
        notes: "",
      });
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
    return key.slice(0, 4) + "*".repeat(key.length - 8) + key.slice(-4);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Global Settings */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI API Keys</h2>
          <p className="text-muted-foreground">
            Manage your AI provider API keys and rotation settings
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
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
                <Label htmlFor="provider">Provider</Label>
                <Select
                  value={newKey.provider}
                  onValueChange={(value: AIProvider) =>
                    setNewKey({
                      ...newKey,
                      provider: value,
                      model_preference: "",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROVIDER_CONFIGS).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center space-x-2">
                          <span>{config.displayName}</span>
                          <Badge variant="secondary" className="text-xs">
                            {config.defaultModel}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="key_name">Key Name</Label>
                <Input
                  id="key_name"
                  value={newKey.key_name}
                  onChange={(e) =>
                    setNewKey({ ...newKey, key_name: e.target.value })
                  }
                  placeholder="e.g., My OpenAI Key"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="api_key">API Key</Label>
                <Input
                  id="api_key"
                  type="password"
                  value={newKey.api_key}
                  onChange={(e) =>
                    setNewKey({ ...newKey, api_key: e.target.value })
                  }
                  placeholder="Enter your API key"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model_preference">
                  Preferred Model (Optional)
                </Label>
                <Select
                  value={newKey.model_preference}
                  onValueChange={(value) =>
                    setNewKey({ ...newKey, model_preference: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select model (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_CONFIGS[newKey.provider]?.supportedModels.map(
                      (model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="enable_rotation"
                  checked={newKey.enable_rotation}
                  onCheckedChange={(checked) =>
                    setNewKey({ ...newKey, enable_rotation: checked })
                  }
                />
                <Label htmlFor="enable_rotation">Enable for rotation</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={newKey.notes}
                  onChange={(e) =>
                    setNewKey({ ...newKey, notes: e.target.value })
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

      {/* Global Preferences Card */}
      {preferences && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Global AI Settings</span>
            </CardTitle>
            <CardDescription>
              Configure global settings for AI key rotation and provider
              preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="global_rotation"
                  checked={preferences.enable_global_rotation}
                  onCheckedChange={(checked) =>
                    handleUpdatePreferences({ enable_global_rotation: checked })
                  }
                />
                <Label
                  htmlFor="global_rotation"
                  className="flex items-center space-x-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Enable Global Rotation</span>
                </Label>
              </div>

              <div className="space-y-2">
                <Label>Preferred Provider</Label>
                <Select
                  value={preferences.preferred_provider}
                  onValueChange={(value: AIProvider) =>
                    handleUpdatePreferences({ preferred_provider: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROVIDER_CONFIGS).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="fallback_enabled"
                  checked={preferences.fallback_enabled}
                  onCheckedChange={(checked) =>
                    handleUpdatePreferences({ fallback_enabled: checked })
                  }
                />
                <Label
                  htmlFor="fallback_enabled"
                  className="flex items-center space-x-2"
                >
                  <Shield className="h-4 w-4" />
                  <span>Enable Fallback</span>
                </Label>
              </div>
            </div>

            {preferences.enable_global_rotation && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-1">Global Rotation Enabled</p>
                    <p>
                      Only keys with "Enable for rotation" will be used. Keys
                      will be rotated automatically based on usage and rate
                      limits.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Usage Statistics */}
      {keyStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>Usage Statistics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {keyStats.map((stat) => {
                const config = PROVIDER_CONFIGS[stat.provider as AIProvider];
                return (
                  <div
                    key={stat.provider}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{config?.displayName}</span>
                      <Badge variant="outline">{stat.total_keys} keys</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Active: {stat.active_keys}</div>
                      <div>Rotation: {stat.rotation_enabled_keys}</div>
                      <div>Usage: {stat.total_usage}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
            <div className="text-center py-8">
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
                  <TableHead>Provider</TableHead>
                  <TableHead>Key Name</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usage</TableHead>
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
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {config.displayName}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {key.model_preference || config.defaultModel}
                          </Badge>
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
                          {key.is_active ? (
                            <Badge variant="outline" className="text-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                          {key.enable_rotation && (
                            <Badge variant="outline" className="text-blue-600">
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Rotation
                            </Badge>
                          )}
                          {isLimited && (
                            <Badge variant="destructive">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Limited
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            {key.usage_count} / {key.daily_limit || "N/A"}
                          </div>
                          {key.daily_limit && (
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${
                                  usagePercent > 80
                                    ? "bg-red-500"
                                    : usagePercent > 60
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                                }`}
                                style={{
                                  width: `${Math.min(usagePercent, 100)}%`,
                                }}
                              ></div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {key.last_used_at ? (
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span className="text-sm">
                              {new Date(key.last_used_at).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Never
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleUpdateKey(key.id, {
                                is_active: !key.is_active,
                              })
                            }
                          >
                            {key.is_active ? "Disable" : "Enable"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleUpdateKey(key.id, {
                                enable_rotation: !key.enable_rotation,
                              })
                            }
                          >
                            <RotateCcw className="h-4 w-4" />
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
                        </div>
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
  );
}
