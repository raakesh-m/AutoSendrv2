import { aiKeyManager } from "@/lib/ai-key-manager";
import { query } from "@/lib/db";

interface EnhancementOptions {
  subject: string;
  body: string;
  companyName: string;
  position?: string;
  recruiterName?: string;
  useAi?: boolean;
  userId: string; // Made required since we need it for AI calls
}

interface EnhancementResult {
  subject: string;
  body: string;
  aiEnhanced: boolean;
  message?: string;
  error?: string;
}

// Get active AI rules from database for a specific user
async function getActiveAiRules(userId: string): Promise<string> {
  try {
    const result = await query(
      `
      SELECT rules_text 
      FROM ai_rules 
      WHERE user_id = $1 AND is_active = true 
      ORDER BY created_at DESC 
      LIMIT 1
    `,
      [userId]
    );

    if (result.rows.length === 0) {
      // Return the same default rules as the API endpoints
      return `You are a template placeholder replacement assistant. Follow these rules EXACTLY:

Do not alter the structure or layout of the template in any way.
Only replace the placeholders: [CompanyName], [RecruiterName], and [Role].
Do not add new content such as achievements, skills, compliments, or projects.
Do not remove any line, word, or punctuation from the original template.
If [RecruiterName] is missing or empty, replace the greeting line with:
       → "Hi [CompanyName] team,"
If [CompanyName] is also missing, replace greeting line with:
       → "Hi there,"
If [Role] is missing or empty, use the generic phrase:
       → "this position"
Preserve all original line breaks, spacing, and punctuation exactly as provided.
Maintain capitalization consistency between inserted values and surrounding text.
Do not change or add to the sender signature or closing lines.
Do not include any extra text, comments, or instructions in the final output.

CRITICAL: Your job is ONLY to replace placeholders. Do not enhance, improve, or modify anything else.`;
    }

    return result.rows[0].rules_text;
  } catch (error) {
    console.error("Error fetching AI rules:", error);
    // Return the same default rules as the API endpoints on error
    return `You are a template placeholder replacement assistant. Follow these rules EXACTLY:

Do not alter the structure or layout of the template in any way.
Only replace the placeholders: [CompanyName], [RecruiterName], and [Role].
Do not add new content such as achievements, skills, compliments, or projects.
Do not remove any line, word, or punctuation from the original template.
If [RecruiterName] is missing or empty, replace the greeting line with:
       → "Hi [CompanyName] team,"
If [CompanyName] is also missing, replace greeting line with:
       → "Hi there,"
If [Role] is missing or empty, use the generic phrase:
       → "this position"
Preserve all original line breaks, spacing, and punctuation exactly as provided.
Maintain capitalization consistency between inserted values and surrounding text.
Do not change or add to the sender signature or closing lines.
Do not include any extra text, comments, or instructions in the final output.

CRITICAL: Your job is ONLY to replace placeholders. Do not enhance, improve, or modify anything else.`;
  }
}

// Enhanced email processing function with multi-provider AI support
export async function enhanceEmail(
  options: EnhancementOptions
): Promise<EnhancementResult> {
  const {
    subject,
    body,
    companyName,
    position,
    recruiterName,
    useAi = false,
    userId,
  } = options;

  // If AI is disabled, return original content
  if (!useAi) {
    return {
      subject,
      body,
      aiEnhanced: false,
      message: "AI enhancement disabled",
    };
  }

  try {
    // Get active AI rules for this specific user
    const aiRules = await getActiveAiRules(userId);

    // Create the enhancement prompt
    const prompt = `${aiRules}

Company: ${companyName}
Position: ${position || "Software Developer"}
Recruiter: ${recruiterName || "there"}

Email to enhance:
Subject: ${subject}
Body: ${body}

Please enhance this email following the rules above. Return the result in this exact format:
Subject: [enhanced subject]
Body: [enhanced body]`;

    // Use the new AI key manager to make the request
    const result = await aiKeyManager.makeAIRequest({
      userId,
      prompt,
      maxTokens: 500,
      temperature: 0.1,
    });

    if (!result.success) {
      return {
        subject,
        body,
        aiEnhanced: false,
        error: result.error || "AI enhancement failed",
        message: result.error || "AI temporarily unavailable",
      };
    }

    const aiResponse = result.response;

    if (!aiResponse) {
      throw new Error("No response from AI");
    }

    // Parse the AI response
    const subjectMatch = aiResponse.match(/Subject:\s*(.+)/);
    const bodyMatch = aiResponse.match(/Body:\s*([\s\S]+)/);

    let enhancedSubject = subject;
    let enhancedBody = body;

    if (subjectMatch) {
      enhancedSubject = subjectMatch[1].trim();
    }

    if (bodyMatch) {
      enhancedBody = bodyMatch[1].trim();
    }

    return {
      subject: enhancedSubject,
      body: enhancedBody,
      aiEnhanced: true,
      message: `Email enhanced successfully using ${result.provider}`,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error enhancing email:", errorMessage);

    return {
      subject,
      body,
      aiEnhanced: false,
      error: "AI enhancement failed",
      message: errorMessage,
    };
  }
}
