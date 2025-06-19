import { DashboardLayout } from "@/components/dashboard-layout";
import { EmailConfigWarning } from "@/components/email-config-warning";
import { FileUploadSection } from "@/components/file-upload-section";
import { DataSummary } from "@/components/data-summary";
import { ContactsViewer } from "@/components/contacts-viewer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, Upload, Zap, Target } from "lucide-react";

export default function BulkEmailSenderPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Bulk Email Sender
          </h1>
          <p className="text-muted-foreground">
            Upload contacts, select recipients, and send personalized emails to
            multiple contacts at once
          </p>
        </div>

        {/* How it Works Section */}
        <Card className="border-0 shadow-lg ring-1 ring-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              How Bulk Email Sending Works
            </CardTitle>
            <CardDescription>
              Follow these steps to send personalized emails to multiple
              contacts at once
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Upload className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">1. Upload Contact Data</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload your contact list in CSV, JSON, or TXT format.
                    Required field: email. Optional: name, company_name, role,
                    recruiter_name.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Target className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">2. Select Recipients</h3>
                  <p className="text-sm text-muted-foreground">
                    Use the checkboxes in the contacts table to select specific
                    recipients. You can also select attachments to include.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Zap className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">
                    3. AI Personalizes & Sends
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Our AI generates personalized content for each recipient
                    based on your template and their information.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <EmailConfigWarning />

        {/* Contact Management Section */}
        <div className="space-y-6">
          <FileUploadSection />
          <DataSummary />
          <ContactsViewer />
        </div>
      </div>
    </DashboardLayout>
  );
}
