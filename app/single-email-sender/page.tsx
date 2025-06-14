import { DashboardLayout } from "@/components/dashboard-layout";
import { EmailTesterForm } from "@/components/email-tester-form";
import { EmailConfigWarning } from "@/components/email-config-warning";

export default function SingleEmailSenderPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Single Email Sender
          </h1>
          <p className="text-muted-foreground">
            Send personalized job application emails to individual recipients
            using your custom template
          </p>
        </div>

        <EmailConfigWarning />

        <div className="w-full">
          <EmailTesterForm />
        </div>
      </div>
    </DashboardLayout>
  );
}
