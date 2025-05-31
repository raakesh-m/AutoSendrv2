import { DashboardLayout } from "@/components/dashboard-layout";
import { AttachmentsManager } from "@/components/attachments-manager";
import { TemplateManager } from "@/components/template-manager";
import { AiRulesManager } from "@/components/ai-rules-manager";

export default function AttachmentsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Attachments & Templates
          </h1>
          <p className="text-muted-foreground">
            Manage your files, resumes, documents, email templates, and AI
            enhancement rules for campaigns
          </p>
        </div>

        <TemplateManager />
        <AiRulesManager />
        <AttachmentsManager />
      </div>
    </DashboardLayout>
  );
}
