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
import { Badge } from "@/components/ui/badge";
import { Edit, Save, RefreshCw, Mail, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Template {
  id: number;
  name: string;
  subject: string;
  body: string;
  variables: string[];
}

export function TemplateManager() {
  const [template, setTemplate] = useState<Template | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    subject: "",
    body: "",
  });
  const { toast } = useToast();

  const fetchDefaultTemplate = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/templates/default");
      if (!response.ok) throw new Error("Failed to fetch template");

      const data = await response.json();
      setTemplate(data.template);
      setEditForm({
        name: data.template.name,
        subject: data.template.subject,
        body: data.template.body,
      });
    } catch (error) {
      console.error("Error fetching template:", error);
      toast({
        title: "Error",
        description: "Failed to fetch email template",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefaultTemplate();
  }, []);

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    if (template) {
      setEditForm({
        name: template.name,
        subject: template.subject,
        body: template.body,
      });
    }
    setEditing(false);
  };

  const handleSave = async () => {
    if (!template) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/templates?id=${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          subject: editForm.subject,
          body: editForm.body,
          variables: ["Role", "CompanyName", "RecruiterName"], // Keep consistent variables
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save template");
      }

      const result = await response.json();
      setTemplate(result.template);
      setEditing(false);

      toast({
        title: "Template Saved! ✅",
        description: "Your email template has been updated successfully.",
      });
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: "Save Failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Template</CardTitle>
          <CardDescription>Loading template...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!template) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Template</CardTitle>
          <CardDescription>Failed to load template</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            <AlertCircle className="h-6 w-6 mr-2" />
            <span>Template not found</span>
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
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Email Template</span>
            </CardTitle>
            <CardDescription>
              Manage your default email template used in both email tester and
              bulk emails
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            {!editing ? (
              <Button onClick={handleEdit} variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            ) : (
              <>
                <Button onClick={handleCancel} variant="outline">
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save"}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Variables Info */}
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-sm text-blue-800 mb-2">
            Available Variables:
          </h4>
          <div className="flex flex-wrap gap-2">
            {template.variables.map((variable) => (
              <Badge key={variable} variant="secondary" className="text-xs">
                [{variable}]
              </Badge>
            ))}
          </div>
          <p className="text-xs text-blue-700 mt-2">
            These placeholders will be automatically replaced with contact
            information
          </p>
        </div>

        {/* Template Name */}
        <div className="space-y-2">
          <Label htmlFor="templateName">Template Name</Label>
          {editing ? (
            <Input
              id="templateName"
              value={editForm.name}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Enter template name"
            />
          ) : (
            <div className="p-3 bg-muted rounded-md">
              <span className="font-medium">{template.name}</span>
            </div>
          )}
        </div>

        {/* Email Subject */}
        <div className="space-y-2">
          <Label htmlFor="emailSubject">Email Subject</Label>
          {editing ? (
            <Input
              id="emailSubject"
              value={editForm.subject}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, subject: e.target.value }))
              }
              placeholder="Enter email subject"
            />
          ) : (
            <div className="p-3 bg-muted rounded-md">
              <span className="font-mono text-sm">{template.subject}</span>
            </div>
          )}
        </div>

        {/* Email Body */}
        <div className="space-y-2">
          <Label htmlFor="emailBody">Email Body</Label>
          {editing ? (
            <Textarea
              id="emailBody"
              value={editForm.body}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, body: e.target.value }))
              }
              placeholder="Enter email body"
              rows={15}
              className="font-mono text-sm"
            />
          ) : (
            <div className="p-4 bg-muted rounded-md max-h-80 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {template.body}
              </pre>
            </div>
          )}
        </div>

        {/* Usage Info */}
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <h4 className="font-medium text-sm text-green-800 mb-2">
            Template Usage:
          </h4>
          <ul className="text-xs text-green-700 space-y-1">
            <li>• Used in Email Tester for single test emails</li>
            <li>• Used in Bulk Email campaigns from dashboard</li>
            <li>• Personalized with contact information automatically</li>
            <li>• Enhanced with AI when available (rate-limit friendly)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
