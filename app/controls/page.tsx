"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/dashboard-layout";
import { TemplateManager } from "@/components/template-manager";
import { AiRulesManager } from "@/components/ai-rules-manager";
import { AttachmentsManager } from "@/components/attachments-manager";
import {
  Settings,
  Key,
  Brain,
  Database,
  FileText,
  Paperclip,
} from "lucide-react";

export default function ControlsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Settings & Controls
          </h1>
          <p className="text-muted-foreground">
            Manage your AutoSendr configuration, templates, AI settings, and API
            keys
          </p>
        </div>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-base">
                <Key className="h-4 w-4 text-blue-600" />
                <span>API Keys</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground mb-3">
                Manage multiple Groq API keys for unlimited AI enhancement
              </p>
              <Link href="/controls/api-keys">
                <Button size="sm" className="w-full">
                  Manage Keys
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-base">
                <FileText className="h-4 w-4 text-green-600" />
                <span>Templates</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground mb-3">
                Edit your email templates and subject lines
              </p>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => {
                  document
                    .getElementById("template-section")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Edit Template
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-base">
                <Brain className="h-4 w-4 text-purple-600" />
                <span>AI Rules</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground mb-3">
                Configure AI enhancement behavior and rules
              </p>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => {
                  document
                    .getElementById("ai-rules-section")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                AI Settings
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-base">
                <Paperclip className="h-4 w-4 text-orange-600" />
                <span>Attachments</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground mb-3">
                Upload and manage files for email campaigns
              </p>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => {
                  document
                    .getElementById("attachments-section")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Manage Files
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Template Management */}
        <div id="template-section">
          <TemplateManager />
        </div>

        {/* AI Rules Management */}
        <div id="ai-rules-section">
          <AiRulesManager />
        </div>

        {/* Attachments Management */}
        <div id="attachments-section">
          <AttachmentsManager />
        </div>

        {/* External Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-gray-600" />
              <span>System Management</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/database">
                <Button variant="outline" className="w-full justify-start">
                  <Database className="h-4 w-4 mr-2" />
                  Database Management
                </Button>
              </Link>
              <Link href="/controls/api-keys">
                <Button variant="outline" className="w-full justify-start">
                  <Key className="h-4 w-4 mr-2" />
                  Advanced API Key Settings
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
