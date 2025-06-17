import { aiKeyManager } from "./ai-key-manager";

export interface EmailGenerationOptions {
  subject?: string;
  tone?: "professional" | "casual" | "friendly" | "formal";
  length?: "short" | "medium" | "long";
  includePersonalization?: boolean;
  callToAction?: string;
  additionalContext?: string;
}

export interface EmailGenerationResult {
  subject: string;
  body: string;
  provider: string;
  model: string;
  success: boolean;
  error?: string;
}

/**
 * Generate email content using AI (server-side only)
 */
export async function generateEmailWithAI(
  userId: string,
  recipientName: string,
  recipientCompany: string,
  recipientRole: string,
  campaignContext: string,
  options: EmailGenerationOptions = {}
): Promise<EmailGenerationResult> {
  const prompt = buildEmailPrompt(
    recipientName,
    recipientCompany,
    recipientRole,
    campaignContext,
    options
  );

  try {
    const result = await aiKeyManager.generateContent(prompt, userId);

    if (result.success && result.content) {
      const emailContent = parseEmailContent(result.content);
      return {
        subject: emailContent.subject || options.subject || "Follow up",
        body: emailContent.body,
        provider: result.provider || "unknown",
        model: result.model || "unknown",
        success: true,
      };
    }

    return {
      subject: options.subject || "Follow up",
      body: getFallbackEmailContent(recipientName, recipientCompany),
      provider: "fallback",
      model: "template",
      success: false,
      error: result.error || "Unknown error",
    };
  } catch (error) {
    console.error("Email generation failed:", error);

    return {
      subject: options.subject || "Follow up",
      body: getFallbackEmailContent(recipientName, recipientCompany),
      provider: "fallback",
      model: "template",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generate subject line variations (server-side only)
 */
export async function generateSubjectVariations(
  userId: string,
  originalSubject: string,
  count: number = 3
): Promise<string[]> {
  const prompt = `Generate ${count} alternative subject lines for this email subject: "${originalSubject}"

Requirements:
- Keep the same tone and intent
- Make them engaging and professional
- Vary the approach (question, benefit, curiosity, etc.)
- Keep them concise (under 60 characters)

Return only the subject lines, one per line, without numbering or bullets.`;

  try {
    const result = await aiKeyManager.generateContent(prompt, userId);

    if (result.success && result.content) {
      return result.content
        .trim()
        .split("\n")
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0)
        .slice(0, count);
    }

    throw new Error("Failed to generate subject variations");
  } catch (error) {
    console.error("Subject variation generation failed:", error);

    // Return simple variations as fallback
    return [
      `Re: ${originalSubject}`,
      `Quick question about ${originalSubject.toLowerCase()}`,
      `Following up: ${originalSubject}`,
    ].slice(0, count);
  }
}

/**
 * Analyze email performance and suggest improvements (server-side only)
 */
export async function analyzeEmailPerformance(
  userId: string,
  emailContent: string,
  openRate: number,
  responseRate: number
): Promise<string[]> {
  const prompt = `Analyze this email's performance and suggest improvements:

Email Content:
${emailContent}

Performance Metrics:
- Open Rate: ${openRate}%
- Response Rate: ${responseRate}%

Provide 3-5 specific, actionable suggestions to improve the email's performance. Focus on:
- Subject line optimization
- Content structure and flow
- Call-to-action effectiveness
- Personalization opportunities
- Timing and frequency considerations

Return suggestions as a numbered list.`;

  try {
    const result = await aiKeyManager.generateContent(prompt, userId);

    if (result.success && result.content) {
      return result.content
        .trim()
        .split("\n")
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0 && /^\d+\./.test(line));
    }

    throw new Error("Failed to analyze email performance");
  } catch (error) {
    console.error("Email analysis failed:", error);

    // Return generic suggestions as fallback
    return [
      "1. Test different subject lines to improve open rates",
      "2. Add more personalization based on recipient research",
      "3. Strengthen the call-to-action with specific next steps",
      "4. Consider shortening the email for better engagement",
      "5. Follow up with a different angle if no response",
    ];
  }
}

// Helper functions
function buildEmailPrompt(
  recipientName: string,
  recipientCompany: string,
  recipientRole: string,
  campaignContext: string,
  options: EmailGenerationOptions
): string {
  const tone = options.tone || "professional";
  const length = options.length || "medium";
  const personalization = options.includePersonalization !== false;

  let prompt = `Generate a ${tone} ${length} email for a cold outreach campaign.

Recipient Details:
- Name: ${recipientName}
- Company: ${recipientCompany}
- Role: ${recipientRole}

Campaign Context: ${campaignContext}

Requirements:
- Tone: ${tone}
- Length: ${length}
- ${
    personalization
      ? "Include personalization based on recipient details"
      : "Keep generic"
  }
- ${
    options.callToAction
      ? `Include this call to action: ${options.callToAction}`
      : "Include a clear call to action"
  }
- Make it engaging and professional
- Avoid being too salesy or pushy

${
  options.additionalContext
    ? `Additional Context: ${options.additionalContext}`
    : ""
}

Format the response as:
Subject: [email subject]
Body: [email body]

The email should be ready to send without any placeholders.`;

  return prompt;
}

function parseEmailContent(content: string): {
  subject?: string;
  body: string;
} {
  const lines = content.trim().split("\n");
  let subject: string | undefined;
  let body: string;

  // Look for subject line
  const subjectLine = lines.find(
    (line) =>
      line.toLowerCase().startsWith("subject:") ||
      line.toLowerCase().startsWith("subject line:")
  );

  if (subjectLine) {
    subject = subjectLine.replace(/^subject:?\s*/i, "").trim();
    // Remove subject line and any empty lines after it
    const subjectIndex = lines.indexOf(subjectLine);
    const bodyLines = lines.slice(subjectIndex + 1).filter((line, index) => {
      // Skip empty lines at the beginning
      if (index === 0 && line.trim() === "") return false;
      return true;
    });
    body = bodyLines.join("\n").trim();
  } else {
    // No subject found, use entire content as body
    body = content.trim();
  }

  // Look for body marker
  const bodyMarker = body.toLowerCase().indexOf("body:");
  if (bodyMarker !== -1) {
    body = body.substring(bodyMarker + 5).trim();
  }

  return { subject, body };
}

function getFallbackEmailContent(
  recipientName: string,
  recipientCompany: string
): string {
  return `Hi ${recipientName},

I hope this email finds you well. I came across ${recipientCompany} and was impressed by your work in the industry.

I'd love to connect and discuss how we might be able to collaborate or support your goals.

Would you be open to a brief conversation this week?

Best regards`;
}
