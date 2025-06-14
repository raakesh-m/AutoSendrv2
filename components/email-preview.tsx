"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Eye, Zap } from "lucide-react";

export function EmailPreview() {
  const sampleEmail = {
    subject: "Application for [Role] at [CompanyName]",
    body: `Hi [RecruiterName],

I hope you're doing well. I recently came across [CompanyName] and found the opportunity for a [Role] very interesting.

I'm reaching out to express my interest in the [Role] position. With experience in relevant domain/skills, I believe I can contribute meaningfully to your team.

I've attached my resume for your reference and would love to connect if the opportunity is still open in [CompanyName].

Thank you for your time,
Your Name`,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Eye className="h-5 w-5" />
          <span>Proven Template</span>
        </CardTitle>
        <CardDescription>
          Optimized template with smart personalization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border rounded-lg p-4 bg-muted/50">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Template-Based
              </Badge>
              <span className="text-xs text-muted-foreground">
                From template.md
              </span>
            </div>

            <div className="border-b pb-3">
              <div className="text-sm text-muted-foreground mb-1">Subject:</div>
              <div className="font-medium text-sm">{sampleEmail.subject}</div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground mb-2">Body:</div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed max-h-60 overflow-y-auto">
                {sampleEmail.body}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Efficient Processing:
          </h4>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                1
              </div>
              <div>
                Replace [CompanyName], [Role], [RecruiterName] with your input
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">
                2
              </div>
              <div>
                Minimal AI enhancement for grammar smoothing (when available)
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
                3
              </div>
              <div>Send personalized email immediately</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <h5 className="font-medium text-xs text-green-800 mb-1">
              Single Emails
            </h5>
            <p className="text-xs text-green-700">
              AI enhancement attempts for every email
            </p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h5 className="font-medium text-xs text-blue-800 mb-1">
              Bulk Emails
            </h5>
            <p className="text-xs text-blue-700">
              AI required - emails skipped if AI fails
            </p>
          </div>
        </div>

        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs text-amber-800">
            <strong>Quality First:</strong> Only AI-enhanced emails are sent. If
            AI enhancement fails due to rate limits or errors, those emails are
            skipped to maintain quality standards.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
