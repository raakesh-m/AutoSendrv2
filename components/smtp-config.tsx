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
import { Switch } from "@/components/ui/switch";
import { Save, TestTube, Edit, Check, X, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function SmtpConfig() {
  const [config, setConfig] = useState({
    email: "",
    app_password: "",
    smtp_host: "smtp.gmail.com",
    smtp_port: "587",
    use_ssl: false,
  });
  const [originalConfig, setOriginalConfig] = useState({
    email: "",
    app_password: "",
    smtp_host: "smtp.gmail.com",
    smtp_port: "587",
    use_ssl: false,
  });
  const [emailProvider, setEmailProvider] = useState("gmail");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [isPasswordConfigured, setIsPasswordConfigured] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const emailProviders = {
    gmail: {
      name: "Gmail",
      smtp_host: "smtp.gmail.com",
      smtp_port: "587",
      use_ssl: false,
      instructions: "Use your Gmail address and create an App Password",
      helpUrl: "https://support.google.com/accounts/answer/185833",
    },
    other: {
      name: "Other Provider",
      smtp_host: "",
      smtp_port: "587",
      use_ssl: false,
      instructions: "Enter your email provider's SMTP settings",
      helpUrl: "",
    },
  };

  const handleProviderChange = (provider: string) => {
    if (provider === emailProvider) return; // No change

    setEmailProvider(provider);
    const providerConfig =
      emailProviders[provider as keyof typeof emailProviders];

    // Reset config for new provider
    const newConfig = {
      email: "",
      app_password: "",
      smtp_host: providerConfig.smtp_host,
      smtp_port: providerConfig.smtp_port,
      use_ssl: providerConfig.use_ssl,
    };

    setConfig(newConfig);
    setOriginalConfig(newConfig);
    setIsPasswordConfigured(false);
    setIsEditingPassword(false);
    setShowAdvanced(provider === "other");

    // Load config for the new provider
    loadConfigForProvider(provider);
  };

  const loadConfigForProvider = async (provider: string) => {
    try {
      const response = await fetch(`/api/smtp?provider=${provider}`);
      if (response.ok) {
        const data = await response.json();
        if (data.smtp_config) {
          const isConfigured =
            data.smtp_config.app_password === "***CONFIGURED***";
          setIsPasswordConfigured(isConfigured);

          const loadedConfig = {
            email: data.smtp_config.email || "",
            app_password: isConfigured
              ? ""
              : data.smtp_config.app_password || "",
            smtp_host:
              data.smtp_config.smtp_host ||
              emailProviders[provider as keyof typeof emailProviders].smtp_host,
            smtp_port:
              data.smtp_config.smtp_port?.toString() ||
              emailProviders[provider as keyof typeof emailProviders].smtp_port,
            use_ssl:
              data.smtp_config.use_ssl !== undefined
                ? data.smtp_config.use_ssl
                : emailProviders[provider as keyof typeof emailProviders]
                    .use_ssl,
          };

          setConfig(loadedConfig);
          setOriginalConfig(loadedConfig);
        } else {
          // No config found for this provider
          const providerConfig =
            emailProviders[provider as keyof typeof emailProviders];
          const defaultConfig = {
            email: "",
            app_password: "",
            smtp_host: providerConfig.smtp_host,
            smtp_port: providerConfig.smtp_port,
            use_ssl: providerConfig.use_ssl,
          };
          setConfig(defaultConfig);
          setOriginalConfig(defaultConfig);
          setIsPasswordConfigured(false);
        }
      }
    } catch (error) {
      console.error("Failed to load config for provider:", provider, error);
    }
  };

  // Load initial configuration
  useEffect(() => {
    const loadConfig = async () => {
      await loadConfigForProvider("gmail"); // Start with Gmail
      setLoading(false);
    };

    loadConfig();
  }, []);

  // Check if there are any changes
  const hasChanges = () => {
    return (
      config.email !== originalConfig.email ||
      config.app_password !== originalConfig.app_password ||
      config.smtp_host !== originalConfig.smtp_host ||
      config.smtp_port !== originalConfig.smtp_port ||
      config.use_ssl !== originalConfig.use_ssl
    );
  };

  // Check if save should be enabled
  const canSave = () => {
    if (!hasChanges()) return false;
    if (!config.email) return false;

    // If password is not configured and no new password provided
    if (!isPasswordConfigured && !config.app_password) return false;

    return true;
  };

  const handleSave = async () => {
    if (!canSave()) return;

    setSaving(true);
    try {
      const response = await fetch("/api/smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: config.email,
          app_password: config.app_password || undefined, // Don't send empty password if editing
          smtp_host: config.smtp_host,
          smtp_port: parseInt(config.smtp_port),
          use_ssl: config.use_ssl,
          provider_type: emailProvider,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save configuration");
      }

      setIsPasswordConfigured(true);
      setIsEditingPassword(false);

      // Update original config to current values (except password)
      const updatedOriginalConfig = {
        ...config,
        app_password: "", // Password is now saved, clear the input
      };
      setOriginalConfig(updatedOriginalConfig);
      setConfig((prev) => ({ ...prev, app_password: "" })); // Clear the password input

      toast({
        title: "Email Configuration Saved",
        description: `Your ${emailProvider} settings have been saved successfully.`,
      });
    } catch (error) {
      console.error("Error saving SMTP config:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to save configuration",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const response = await fetch("/api/smtp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_type: emailProvider,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Connection test failed");
      }

      toast({
        title: "Email Test Successful",
        description: `Connection to ${emailProvider} server established successfully.`,
      });
    } catch (error) {
      console.error("SMTP test failed:", error);
      toast({
        title: "Email Test Failed",
        description:
          error instanceof Error ? error.message : "Connection test failed",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleEditPassword = () => {
    setIsEditingPassword(true);
    setConfig((prev) => ({ ...prev, app_password: "" }));
  };

  const handleCancelEdit = () => {
    setIsEditingPassword(false);
    setConfig((prev) => ({
      ...prev,
      app_password: originalConfig.app_password,
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Setup</CardTitle>
          <CardDescription>Loading your email configuration...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
              <div className="h-10 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentProvider =
    emailProviders[emailProvider as keyof typeof emailProviders];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Setup</CardTitle>
        <CardDescription>
          Connect your email account to send job applications and campaigns.
          Your credentials are stored securely and privately.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Provider Selection */}
        <div className="space-y-3">
          <Label className="text-base font-medium">
            Choose Your Email Provider
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(emailProviders).map(([key, provider]) => (
              <Button
                key={key}
                variant={emailProvider === key ? "default" : "outline"}
                onClick={() => handleProviderChange(key)}
                className="h-auto p-4 text-center"
              >
                <div>
                  <div className="font-medium">{provider.name}</div>
                  {key === "gmail" && (
                    <div className="text-xs opacity-75">Most Popular</div>
                  )}
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Simple Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <div className="text-blue-600 dark:text-blue-400 text-lg">💡</div>
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                {currentProvider.name} Setup
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                {currentProvider.instructions}
              </p>
              {currentProvider.helpUrl && (
                <a
                  href={currentProvider.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  {emailProvider === "gmail"
                    ? "How to create Gmail App Password →"
                    : "Setup Instructions →"}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Email Configuration */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-base">
              Your Email Address
            </Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                value={config.email}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder={
                  emailProvider === "gmail"
                    ? "yourname@gmail.com"
                    : "your-email@provider.com"
                }
                className="text-base flex-1"
              />
              {config.email && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfig((prev) => ({ ...prev, email: "" }))}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="appPassword" className="text-base">
              {emailProvider === "gmail"
                ? "Gmail App Password"
                : "Email Password"}
            </Label>

            {isPasswordConfigured && !isEditingPassword ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-800 dark:text-green-200 flex-1">
                  Password configured securely
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditPassword}
                  className="h-8"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    id="appPassword"
                    type={showPassword ? "text" : "password"}
                    value={config.app_password}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        app_password: e.target.value,
                      }))
                    }
                    placeholder={
                      isEditingPassword
                        ? "Enter new password"
                        : `Enter your ${
                            emailProvider === "gmail"
                              ? "App Password"
                              : "password"
                          }`
                    }
                    className="text-base pr-20"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                      className="h-8 w-8 p-0"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    {isEditingPassword && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {isEditingPassword && (
                  <p className="text-sm text-muted-foreground">
                    Leave empty to keep current password unchanged
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Advanced Settings - Only for Other Provider */}
        {emailProvider === "other" && (
          <div className="space-y-4 border-t pt-4">
            <Label className="text-base font-medium">SMTP Settings</Label>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtpHost">SMTP Server</Label>
                <Input
                  id="smtpHost"
                  value={config.smtp_host}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      smtp_host: e.target.value,
                    }))
                  }
                  placeholder="smtp.example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPort">Port</Label>
                <Input
                  id="smtpPort"
                  value={config.smtp_port}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      smtp_port: e.target.value,
                    }))
                  }
                  placeholder="587"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="useSSL"
                  checked={config.use_ssl}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => ({ ...prev, use_ssl: checked }))
                  }
                />
                <Label htmlFor="useSSL">Use SSL/TLS (Port 465)</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Most providers use port 587 without this option. Only enable for
                port 465.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleSave}
            disabled={saving || !canSave()}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving
              ? "Saving..."
              : isEditingPassword
              ? "Update Settings"
              : "Save Settings"}
          </Button>
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={
              testing ||
              !config.email ||
              (!isPasswordConfigured && !config.app_password)
            }
            className="flex-1"
          >
            <TestTube className="h-4 w-4 mr-2" />
            {testing ? "Testing..." : "Test Connection"}
          </Button>
        </div>

        {/* Changes Indicator */}
        {hasChanges() && (
          <div className="text-center">
            <p className="text-sm text-orange-600 dark:text-orange-400">
              You have unsaved changes
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
