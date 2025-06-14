"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HealthCheck() {
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testDatabase = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/test-db");
      const data = await response.json();
      setDbStatus(data);
    } catch (error) {
      setDbStatus({
        status: "error",
        message: "Failed to reach API",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">System Health Check</h1>

      <Card>
        <CardHeader>
          <CardTitle>Database Connection Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testDatabase} disabled={loading}>
            {loading ? "Testing..." : "Test Database Connection"}
          </Button>

          {dbStatus && (
            <div
              className={`p-4 rounded-lg ${
                dbStatus.status === "success"
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <h3 className="font-semibold mb-2">
                Status:{" "}
                {dbStatus.status === "success" ? "✅ Connected" : "❌ Failed"}
              </h3>
              <p className="text-sm">Message: {dbStatus.message}</p>
              {dbStatus.error && (
                <p className="text-sm text-red-600 mt-2">
                  Error: {dbStatus.error}
                </p>
              )}
              {dbStatus.data && (
                <pre className="text-xs mt-2 bg-gray-100 p-2 rounded">
                  {JSON.stringify(dbStatus.data, null, 2)}
                </pre>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Timestamp: {dbStatus.timestamp}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Troubleshooting Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>Check if your internet connection is stable</li>
            <li>
              Verify that your Neon database is not suspended (check Neon
              dashboard)
            </li>
            <li>Confirm DATABASE_URL in .env is correct and up-to-date</li>
            <li>Try restarting the development server</li>
            <li>Check Neon status page for any outages</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
