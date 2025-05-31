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
import { Save, TestTube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function SmtpConfig() {
  const [config, setConfig] = useState({
    email: "",
    app_password: "",
    smtp_host: "smtp.gmail.com",
    smtp_port: "587",
    use_ssl: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  // Load existing configuration on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch("/api/smtp");
        if (response.ok) {
          const data = await response.json();
          if (data.smtp_config) {
            setConfig({
              email: data.smtp_config.email || "",
              app_password:
                data.smtp_config.app_password === "***CONFIGURED***"
                  ? ""
                  : data.smtp_config.app_password || "",
              smtp_host: data.smtp_config.smtp_host || "smtp.gmail.com",
              smtp_port: data.smtp_config.smtp_port?.toString() || "587",
              use_ssl:
                data.smtp_config.use_ssl !== undefined
                  ? data.smtp_config.use_ssl
                  : true,
            });
          }
        }
      } catch (error) {
        console.error("Failed to load SMTP config:", error);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  const handleSave = async () => {
    if (!config.email || !config.app_password) {
      toast({
        title: "Missing Required Fields",
        description: "Email and app password are required.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: config.email,
          app_password: config.app_password,
          smtp_host: config.smtp_host,
          smtp_port: parseInt(config.smtp_port),
          use_ssl: config.use_ssl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save configuration");
      }

      toast({
        title: "SMTP Configuration Saved",
        description: "Your email settings have been saved successfully.",
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
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Connection test failed");
      }

      toast({
        title: "SMTP Test Successful",
        description: "Connection to SMTP server established successfully.",
      });
    } catch (error) {
      console.error("SMTP test failed:", error);
      toast({
        title: "SMTP Test Failed",
        description:
          error instanceof Error ? error.message : "Connection test failed",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SMTP Configuration</CardTitle>
          <CardDescription>Loading configuration...</CardDescription>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>SMTP Configuration</CardTitle>
        <CardDescription>
          Configure your Gmail settings for sending emails
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Gmail Address</Label>
          <Input
            id="email"
            type="email"
            value={config.email}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, email: e.target.value }))
            }
            placeholder="your-email@gmail.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="appPassword">Gmail App Password</Label>
          <Input
            id="appPassword"
            type="password"
            value={config.app_password}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, app_password: e.target.value }))
            }
            placeholder="Enter your Gmail app password"
          />
          <p className="text-xs text-muted-foreground">
            Use a Gmail app-specific password.
            <a
              href="https://support.google.com/accounts/answer/185833"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline ml-1"
            >
              Learn how to create one
            </a>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="smtpHost">SMTP Host</Label>
            <Input
              id="smtpHost"
              value={config.smtp_host}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, smtp_host: e.target.value }))
              }
              placeholder="smtp.gmail.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtpPort">SMTP Port</Label>
            <Input
              id="smtpPort"
              value={config.smtp_port}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, smtp_port: e.target.value }))
              }
              placeholder="587"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="useSSL"
            checked={config.use_ssl}
            onCheckedChange={(checked) =>
              setConfig((prev) => ({ ...prev, use_ssl: checked }))
            }
          />
          <Label htmlFor="useSSL">Use SSL/TLS (recommended)</Label>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Configuration"}
          </Button>
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testing || !config.email}
            className="flex-1"
          >
            <TestTube className="h-4 w-4 mr-2" />
            {testing ? "Testing..." : "Test Connection"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
