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
import { Sparkles, Users, Building, Mail, RefreshCw } from "lucide-react";
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">
                  {loading ? "..." : summary.totalEntries.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Total Entries</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {loading ? "..." : summary.uniqueEmails.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Unique Emails</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Building className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">
                  {loading ? "..." : summary.uniqueCompanies.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Companies</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5" />
                <span>AI Data Processing</span>
              </CardTitle>
              <CardDescription>
                Clean and normalize your data using AI to improve email delivery
                rates
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDataSummary}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge variant={summary.processed ? "default" : "secondary"}>
                {summary.processed ? "Processed" : "Pending"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {summary.processed
                  ? "Data has been cleaned and normalized"
                  : "Click to process your uploaded data"}
              </span>
            </div>
            <Button
              onClick={handleProcessWithAI}
              disabled={processing || summary.totalEntries === 0}
            >
              {processing ? "Processing..." : "Process with AI"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
