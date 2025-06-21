import { DashboardLayout } from "@/components/dashboard-layout";
import { EmailTesterForm } from "@/components/email-tester-form";
import { EmailConfigWarning } from "@/components/email-config-warning";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TestTube, User, Sparkles, Send } from "lucide-react";

export default function SingleEmailSenderPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Single Email Sender
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Send personalized job application emails to individual recipients
            using your custom template
          </p>
        </div>

        {/* How it Works Section */}
        <Card className="border-0 shadow-lg ring-1 ring-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5 text-primary" />
              How Single Email Sending Works
            </CardTitle>
            <CardDescription>
              Perfect for testing your email templates or sending one-off
              personalized emails
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">
                    1. Enter Recipient Details
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Manually enter the recipient's email, name, company, and
                    role. This information will be used for personalization.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Sparkles className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">
                    2. AI Personalizes Content
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your email template and AI rules are used to generate a
                    personalized email tailored to the specific recipient.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Send className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">3. Preview & Send</h3>
                  <p className="text-sm text-muted-foreground">
                    Review the personalized email content, attach files if
                    needed, and send it directly to the recipient.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <EmailConfigWarning />

        <div className="w-full">
          <EmailTesterForm />
        </div>
      </div>
    </DashboardLayout>
  );
}
