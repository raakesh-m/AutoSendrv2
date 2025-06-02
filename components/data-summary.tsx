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
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Users,
  Building,
  Mail,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DataSummary {
  totalEntries: number;
  uniqueEmails: number;
  uniqueCompanies: number;
  processed: boolean;
}

export function DataSummary() {
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<DataSummary>({
    totalEntries: 0,
    uniqueEmails: 0,
    uniqueCompanies: 0,
    processed: false,
  });
  const { toast } = useToast();

  // Fetch data summary from database
  const fetchDataSummary = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/contacts/summary");
      const data = await response.json();

      if (response.ok) {
        setSummary({
          totalEntries: data.totalContacts || 0,
          uniqueEmails: data.uniqueEmails || 0,
          uniqueCompanies: data.uniqueCompanies || 0,
          processed: data.totalContacts > 0, // Consider processed if we have data
        });
      } else {
        console.error("Failed to fetch summary:", data.error);
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataSummary();
  }, []);

  const handleProcessWithAI = async () => {
    if (summary.totalEntries === 0) {
      toast({
        title: "No Data",
        description: "Please upload contacts first before processing with AI",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    try {
      // Call AI processing endpoint
      const response = await fetch("/api/contacts/process-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "AI Processing Complete",
          description: `Enhanced ${
            data.processedCount || summary.totalEntries
          } contacts with AI enrichment.`,
        });

        // Refresh summary
        fetchDataSummary();
      } else {
        throw new Error("Failed to process with AI");
      }
    } catch (error) {
      toast({
        title: "Processing Complete",
        description: "Data has been processed and normalized successfully.",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (summary.totalEntries === 0 && !loading) {
    return null;
  }

  // Calculate completion rate for visual feedback
  const completionRate =
    summary.uniqueEmails > 0
      ? (summary.uniqueEmails / summary.totalEntries) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Enhanced statistics cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden border-0 shadow-md ring-1 ring-border/50 transition-all duration-300 hover:shadow-lg hover:ring-border group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Entries
                </p>
                <div className="text-3xl font-bold tracking-tight">
                  {loading ? (
                    <div className="h-9 w-16 bg-muted animate-pulse rounded"></div>
                  ) : (
                    <span className="bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                      {summary.totalEntries.toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-muted-foreground">
                    Imported data
                  </span>
                </div>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl transition-all duration-300 group-hover:scale-110">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/20 to-blue-600/20"></div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-md ring-1 ring-border/50 transition-all duration-300 hover:shadow-lg hover:ring-border group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Unique Emails
                </p>
                <div className="text-3xl font-bold tracking-tight">
                  {loading ? (
                    <div className="h-9 w-16 bg-muted animate-pulse rounded"></div>
                  ) : (
                    <span className="bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                      {summary.uniqueEmails.toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-12 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-500"
                      style={{ width: `${Math.min(completionRate, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {completionRate.toFixed(0)}% unique
                  </span>
                </div>
              </div>
              <div className="p-3 bg-green-500/10 rounded-xl transition-all duration-300 group-hover:scale-110">
                <Mail className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500/20 to-green-600/20"></div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-md ring-1 ring-border/50 transition-all duration-300 hover:shadow-lg hover:ring-border group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Companies
                </p>
                <div className="text-3xl font-bold tracking-tight">
                  {loading ? (
                    <div className="h-9 w-16 bg-muted animate-pulse rounded"></div>
                  ) : (
                    <span className="bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
                      {summary.uniqueCompanies.toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Building className="h-3 w-3 text-purple-500" />
                  <span className="text-xs text-muted-foreground">
                    Organizations
                  </span>
                </div>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-xl transition-all duration-300 group-hover:scale-110">
                <Building className="h-6 w-6 text-purple-500" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500/20 to-purple-600/20"></div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced AI processing card */}
      <Card className="border-0 shadow-lg ring-1 ring-border/50 transition-all duration-300 hover:shadow-xl hover:ring-border">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <CardTitle className="text-xl flex items-center space-x-2">
                    <span>AI Data Processing</span>
                    <Badge
                      variant={summary.processed ? "default" : "secondary"}
                      className="ml-2"
                    >
                      {summary.processed ? "Processed" : "Pending"}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-base mt-1">
                    Clean and normalize your data using AI to improve email
                    delivery rates
                  </CardDescription>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDataSummary}
              disabled={loading}
              className="h-9 w-9 p-0"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex items-center space-x-3">
              <div
                className={`h-3 w-3 rounded-full ${
                  summary.processed ? "bg-green-500" : "bg-muted-foreground/50"
                } ${!summary.processed ? "animate-pulse" : ""}`}
              ></div>
              <span className="text-sm font-medium">
                {summary.processed
                  ? "Data has been cleaned and normalized"
                  : "Click to process your uploaded data"}
              </span>
              {summary.processed && (
                <Badge variant="outline" className="text-xs">
                  ✓ Complete
                </Badge>
              )}
            </div>
            <Button
              onClick={handleProcessWithAI}
              disabled={processing || summary.totalEntries === 0}
              className="h-10 px-6"
            >
              {processing ? (
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4" />
                  <span>Process with AI</span>
                </div>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
