"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { EmailConfigWarning } from "@/components/email-config-warning";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  TestTube,
  Mail,
  Key,
  FileText,
  Sparkles,
  Users,
  Settings,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return; // Still loading
    if (!session) {
      router.push("/auth/signin");
      return;
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null; // Redirecting
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Welcome to AutoSendr
              </h1>
              <p className="text-lg text-muted-foreground mt-2 max-w-2xl">
                Welcome back, {session.user?.name || session.user?.email}! Your
                AI-powered email automation platform for personalized outreach
                at scale.
              </p>
            </div>
            <div className="hidden sm:flex items-center space-x-2">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-muted-foreground">
                System Active
              </span>
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-border via-border/50 to-transparent"></div>
        </div>

        <EmailConfigWarning />

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/single-email-sender">
            <Button
              variant="outline"
              className="w-full h-16 text-left justify-start hover:bg-muted/50 transition-all duration-200"
            >
              <TestTube className="h-6 w-6 mr-3 text-blue-500" />
              <div>
                <div className="font-semibold">Single Email Sender</div>
                <div className="text-sm text-muted-foreground">
                  Send personalized emails to individual recipients
                </div>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
            </Button>
          </Link>
          <Link href="/bulk-email-sender">
            <Button
              variant="outline"
              className="w-full h-16 text-left justify-start hover:bg-muted/50 transition-all duration-200"
            >
              <Send className="h-6 w-6 mr-3 text-green-500" />
              <div>
                <div className="font-semibold">Bulk Email Sender</div>
                <div className="text-sm text-muted-foreground">
                  Send campaigns to multiple contacts at once
                </div>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
            </Button>
          </Link>
        </div>

        {/* How AutoSendr Works */}
        <Card className="border-0 shadow-lg ring-1 ring-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              How AutoSendr Works
            </CardTitle>
            <CardDescription>
              Our AI-powered platform automates and personalizes your email
              outreach process
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center space-y-3">
                <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold">Upload Contacts</h3>
                <p className="text-sm text-muted-foreground">
                  Import your contact lists in CSV, JSON, or TXT format with
                  email addresses and contact information.
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold">Create Templates</h3>
                <p className="text-sm text-muted-foreground">
                  Design email templates that will be personalized for each
                  recipient using AI.
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="mx-auto w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold">AI Personalization</h3>
                <p className="text-sm text-muted-foreground">
                  Our AI generates unique, personalized content for each
                  recipient based on their information.
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="mx-auto w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-xl flex items-center justify-center">
                  <Send className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="font-semibold">Automated Sending</h3>
                <p className="text-sm text-muted-foreground">
                  Send personalized emails automatically through your Gmail
                  account with tracking.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Setup Requirements */}
        <Card className="border-0 shadow-lg ring-1 ring-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" />
              Setup Requirements
            </CardTitle>
            <CardDescription>
              Configure these settings to start using AutoSendr effectively
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Gmail Setup */}
              <div className="flex items-start space-x-4 p-4 bg-muted/30 rounded-lg">
                <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                  <Mail className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">Gmail Configuration</h3>
                    <Badge variant="destructive" className="text-xs">
                      Required
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Configure your Gmail account to send emails through
                    AutoSendr. You'll need to enable 2-factor authentication and
                    generate an app password.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Enable 2-Factor Authentication on your Google account
                    </div>
                    <div className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Generate an App Password for AutoSendr
                    </div>
                    <div className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Configure your email settings in AutoSendr
                    </div>
                  </div>
                  <Link href="/email-setup">
                    <Button variant="outline" size="sm" className="mt-3">
                      <Settings className="h-4 w-4 mr-2" />
                      Configure Gmail
                    </Button>
                  </Link>
                </div>
              </div>

              {/* AI API Keys */}
              <div className="flex items-start space-x-4 p-4 bg-muted/30 rounded-lg">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Key className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">AI API Keys</h3>
                    <Badge variant="secondary" className="text-xs">
                      Required for AI
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Add API keys for AI providers (OpenAI, Anthropic, Groq, or
                    Google AI) to enable personalized email generation.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <AlertCircle className="h-4 w-4 text-orange-500 mr-2" />
                      At least one AI provider is required
                    </div>
                    <div className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Supports OpenAI, Anthropic, Groq, and Google AI
                    </div>
                    <div className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Automatic fallback between providers
                    </div>
                  </div>
                  <Link href="/ai-keys">
                    <Button variant="outline" size="sm" className="mt-3">
                      <Key className="h-4 w-4 mr-2" />
                      Manage AI Keys
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Templates & AI Rules */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-4 p-4 bg-muted/30 rounded-lg">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Email Templates</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Create reusable email templates that will be personalized
                      by AI for each recipient.
                    </p>
                    <Link href="/templates">
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        Manage Templates
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-muted/30 rounded-lg">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <Sparkles className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">AI Rules</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Define rules and guidelines for how AI should personalize
                      your emails.
                    </p>
                    <Link href="/ai-rules">
                      <Button variant="outline" size="sm">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Configure AI Rules
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="border-0 shadow-lg ring-1 ring-border/50 bg-muted/20">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Privacy & Security</h3>
                <p className="text-sm text-muted-foreground">
                  Your data is secure with AutoSendr. We use your own Gmail
                  account and API keys, ensuring your credentials and contact
                  data remain under your control. All email sending happens
                  directly through your Gmail account.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
