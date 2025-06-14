"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Settings,
  Key,
  Brain,
  Database,
  FileText,
  Paperclip,
  Mail,
  ArrowRight,
} from "lucide-react";

export default function SettingsPage() {
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

  const settingsCards = [
    {
      title: "Email Setup",
      description:
        "Configure your personal email credentials for sending campaigns",
      icon: Mail,
      href: "/email-setup",
      color: "blue",
      priority: true,
    },
    {
      title: "Templates",
      description: "Create and edit your email templates and subject lines",
      icon: FileText,
      href: "/templates",
      color: "purple",
    },
    {
      title: "AI Rules",
      description:
        "Configure AI enhancement behavior and personalization rules",
      icon: Brain,
      href: "/ai-rules",
      color: "orange",
    },
    {
      title: "Attachments",
      description: "Upload and manage files like resumes and cover letters",
      icon: Paperclip,
      href: "/attachments",
      color: "amber",
    },
    {
      title: "API Keys",
      description: "Manage your Groq API keys for AI enhancement",
      icon: Key,
      href: "/api-keys",
      color: "green",
    },
  ];

  const systemCards = [
    {
      title: "Database Management",
      description: "View and manage your contact database",
      icon: Database,
      href: "/database",
      color: "gray",
    },
  ];

  const getColorClasses = (color: string, priority?: boolean) => {
    const colors = {
      blue: {
        border: "border-blue-200 dark:border-blue-800",
        bg: priority ? "bg-blue-50 dark:bg-blue-900/20" : "",
        icon: "text-blue-600",
        hover: "hover:border-blue-300 dark:hover:border-blue-700",
      },
      purple: {
        border: "border-purple-200 dark:border-purple-800",
        bg: "",
        icon: "text-purple-600",
        hover: "hover:border-purple-300 dark:hover:border-purple-700",
      },
      orange: {
        border: "border-orange-200 dark:border-orange-800",
        bg: "",
        icon: "text-orange-600",
        hover: "hover:border-orange-300 dark:hover:border-orange-700",
      },
      amber: {
        border: "border-amber-200 dark:border-amber-800",
        bg: "",
        icon: "text-amber-600",
        hover: "hover:border-amber-300 dark:hover:border-amber-700",
      },
      green: {
        border: "border-green-200 dark:border-green-800",
        bg: "",
        icon: "text-green-600",
        hover: "hover:border-green-300 dark:hover:border-green-700",
      },
      gray: {
        border: "border-gray-200 dark:border-gray-800",
        bg: "",
        icon: "text-gray-600",
        hover: "hover:border-gray-300 dark:hover:border-gray-700",
      },
    };
    return colors[color as keyof typeof colors] || colors.gray;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <Settings className="h-8 w-8 text-gray-600" />
            <h1 className="text-3xl font-bold tracking-tight">
              Settings & Controls
            </h1>
          </div>
          <p className="text-muted-foreground">
            Manage your AutoSendr configuration, templates, AI settings, and
            more
          </p>
        </div>

        {/* Personal Settings Notice */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Key className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">
              Personal Settings
            </h3>
          </div>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Each user has their own email credentials and API keys. Configure
            your personal settings using the sections below.
          </p>
        </div>

        {/* Main Settings */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {settingsCards.map((card) => {
              const colors = getColorClasses(card.color, card.priority);
              return (
                <Link key={card.title} href={card.href}>
                  <Card
                    className={`${colors.border} ${colors.bg} ${colors.hover} hover:shadow-lg transition-all duration-200 cursor-pointer h-full`}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between text-base">
                        <div className="flex items-center space-x-2">
                          <card.icon className={`h-5 w-5 ${colors.icon}`} />
                          <span>{card.title}</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground">
                        {card.description}
                      </p>
                      {card.priority && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                            Required for sending
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* System Management */}
        <div>
          <h2 className="text-xl font-semibold mb-4">System</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemCards.map((card) => {
              const colors = getColorClasses(card.color);
              return (
                <Link key={card.title} href={card.href}>
                  <Card
                    className={`${colors.border} ${colors.hover} hover:shadow-lg transition-all duration-200 cursor-pointer h-full`}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between text-base">
                        <div className="flex items-center space-x-2">
                          <card.icon className={`h-5 w-5 ${colors.icon}`} />
                          <span>{card.title}</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground">
                        {card.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
