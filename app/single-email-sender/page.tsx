import { DashboardLayout } from "@/components/dashboard-layout";
import { EmailTesterForm } from "@/components/email-tester-form";

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

        <div className="max-w-2xl">
          <EmailTesterForm />
        </div>
      </div>
    </DashboardLayout>
  );
}
