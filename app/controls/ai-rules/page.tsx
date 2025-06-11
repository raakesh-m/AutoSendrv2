import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { AiRulesManager } from "@/components/ai-rules-manager";

export default function AiRulesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link href="/controls">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
          </Link>
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            AI Enhancement Rules
          </h1>
          <p className="text-muted-foreground">
            Configure how AI enhances your emails during single sends and bulk
            campaigns
          </p>
        </div>

        <AiRulesManager />
      </div>
    </DashboardLayout>
  );
}
