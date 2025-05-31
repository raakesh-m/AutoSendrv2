import { DashboardLayout } from "@/components/dashboard-layout"
import { EmailTesterForm } from "@/components/email-tester-form"
import { EmailPreview } from "@/components/email-preview"

export default function EmailTesterPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Tester</h1>
          <p className="text-muted-foreground">Draft and preview personalized emails before sending</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <EmailTesterForm />
          <EmailPreview />
        </div>
      </div>
    </DashboardLayout>
  )
}
