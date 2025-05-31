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
import { Switch } from "@/components/ui/switch";
import { Edit, Save, RefreshCw, Brain, AlertCircle, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AiRules {
  id: number;
  name: string;
  description?: string;
  rules_text: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function AiRulesManager() {
  const [rules, setRules] = useState<AiRules[]>([]);
  const [activeRule, setActiveRule] = useState<AiRules | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    rules_text: "",
    is_active: true,
  });
  const { toast } = useToast();

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/ai-rules");
      if (!response.ok) throw new Error("Failed to fetch AI rules");

      const data = await response.json();
      setRules(data.rules || []);

      // Find the active rule
      const active = data.rules?.find((rule: AiRules) => rule.is_active);
      if (active) {
        setActiveRule(active);
        setEditForm({
          name: active.name,
          description: active.description || "",
          rules_text: active.rules_text,
          is_active: active.is_active,
        });
      }
    } catch (error) {
      console.error("Error fetching AI rules:", error);
      toast({
        title: "Error",
        description: "Failed to fetch AI rules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    if (activeRule) {
      setEditForm({
        name: activeRule.name,
        description: activeRule.description || "",
        rules_text: activeRule.rules_text,
        is_active: activeRule.is_active,
      });
    }
    setEditing(false);
  };

  const handleSave = async () => {
    if (!activeRule) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/ai-rules?id=${activeRule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description,
          rules_text: editForm.rules_text,
          is_active: editForm.is_active,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save AI rules");
      }

      const result = await response.json();
      setActiveRule(result.rules);
      setEditing(false);

      toast({
        title: "AI Rules Saved! ✅",
        description:
          "Your AI enhancement rules have been updated successfully.",
      });

      // Refresh the rules list
      fetchRules();
    } catch (error) {
      console.error("Error saving AI rules:", error);
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

  const handleActivateRule = async (ruleId: number) => {
    try {
      // First, deactivate all rules
      await Promise.all(
        rules.map(async (rule) => {
          if (rule.is_active && rule.id !== ruleId) {
            await fetch(`/api/ai-rules?id=${rule.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...rule,
                is_active: false,
              }),
            });
          }
        })
      );

      // Then activate the selected rule
      const ruleToActivate = rules.find((rule) => rule.id === ruleId);
      if (ruleToActivate) {
        const response = await fetch(`/api/ai-rules?id=${ruleId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...ruleToActivate,
            is_active: true,
          }),
        });

        if (!response.ok) throw new Error("Failed to activate rule");

        toast({
          title: "Rule Activated",
          description: `"${ruleToActivate.name}" is now the active AI rule`,
        });

        fetchRules();
      }
    } catch (error) {
      console.error("Error activating rule:", error);
      toast({
        title: "Error",
        description: "Failed to activate AI rule",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Enhancement Rules</CardTitle>
          <CardDescription>Loading AI rules...</CardDescription>
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
    <div className="space-y-6">
      {/* Active Rule Editor */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5" />
                <span>AI Enhancement Rules</span>
              </CardTitle>
              <CardDescription>
                Control how AI enhances your emails. These rules ensure
                consistent behavior across single and bulk emails.
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              {!editing ? (
                <Button
                  onClick={handleEdit}
                  variant="outline"
                  disabled={!activeRule}
                >
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
          {activeRule ? (
            <>
              {/* Rule Name */}
              <div className="space-y-2">
                <Label htmlFor="rule-name">Rule Name</Label>
                {editing ? (
                  <Input
                    id="rule-name"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Enter rule name"
                  />
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{activeRule.name}</span>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                )}
              </div>

              {/* Rule Description */}
              <div className="space-y-2">
                <Label htmlFor="rule-description">Description</Label>
                {editing ? (
                  <Input
                    id="rule-description"
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Brief description of this rule set"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {activeRule.description || "No description provided"}
                  </p>
                )}
              </div>

              {/* Rule Text */}
              <div className="space-y-2">
                <Label htmlFor="rule-text">AI Instructions</Label>
                {editing ? (
                  <Textarea
                    id="rule-text"
                    value={editForm.rules_text}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        rules_text: e.target.value,
                      }))
                    }
                    placeholder="Enter detailed AI instructions..."
                    rows={12}
                    className="font-mono text-sm"
                  />
                ) : (
                  <div className="p-3 bg-muted rounded-lg">
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {activeRule.rules_text}
                    </pre>
                  </div>
                )}
              </div>

              {/* Active Status */}
              {editing && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="rule-active"
                    checked={editForm.is_active}
                    onCheckedChange={(checked) =>
                      setEditForm((prev) => ({ ...prev, is_active: checked }))
                    }
                  />
                  <Label htmlFor="rule-active">Active Rule</Label>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              <AlertCircle className="h-6 w-6 mr-2" />
              <span>No active AI rules found</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Rules List */}
      {rules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All AI Rules</CardTitle>
            <CardDescription>
              Manage and switch between different AI rule sets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-3 border rounded-lg ${
                    rule.is_active
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{rule.name}</span>
                        {rule.is_active && (
                          <Badge variant="default" className="text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                      {rule.description && (
                        <p className="text-sm text-muted-foreground">
                          {rule.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Updated: {rule.updated_at}
                      </p>
                    </div>
                    {!rule.is_active && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleActivateRule(rule.id)}
                      >
                        Activate
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Brain className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">How AI Rules Work</p>
              <p className="text-sm text-muted-foreground">
                AI rules control how your emails are enhanced in both single
                email sender and bulk campaigns. The active rule set defines
                what the AI can and cannot do when improving your email
                templates. This ensures consistent behavior and prevents
                unwanted changes to your content.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
