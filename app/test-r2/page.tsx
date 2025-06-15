"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function TestR2Page() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const testR2Integration = async () => {
    setTesting(true);
    try {
      // Test storage quota endpoint
      const quotaResponse = await fetch("/api/storage/quota");
      const quotaData = await quotaResponse.json();

      // Test attachments endpoint
      const attachmentsResponse = await fetch("/api/attachments");
      const attachmentsData = await attachmentsResponse.json();

      setResults({
        quota: quotaData,
        attachments: attachmentsData,
        timestamp: new Date().toISOString(),
      });

      toast({
        title: "R2 Integration Test",
        description: "Test completed successfully!",
      });
    } catch (error) {
      console.error("R2 test failed:", error);
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>R2 Storage Integration Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testR2Integration} disabled={testing}>
            {testing ? "Testing..." : "Test R2 Integration"}
          </Button>

          {results && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Storage Quota:</h3>
                <pre className="bg-muted p-4 rounded text-sm overflow-auto">
                  {JSON.stringify(results.quota, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold">Attachments:</h3>
                <pre className="bg-muted p-4 rounded text-sm overflow-auto">
                  {JSON.stringify(results.attachments, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold">Test completed at:</h3>
                <p className="text-sm text-muted-foreground">
                  {results.timestamp}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
