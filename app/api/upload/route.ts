import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth/next";

// Initialize Groq client function that uses AI key manager
async function createGroqClient() {
  const { aiKeyManager } = await import("@/lib/ai-key-manager");
  const { getServerSession } = await import("next-auth/next");

  const session = await getServerSession();
  if (!session?.user?.email) {
    throw new Error("Authentication required");
  }

  // Get user ID
  const { query } = await import("@/lib/db");
  const userResult = await query("SELECT id FROM users WHERE email = $1", [
    session.user.email,
  ]);

  if (userResult.rows.length === 0) {
    throw new Error("User not found");
  }

  const userId = userResult.rows[0].id;
  const apiKey = await aiKeyManager.getBestAvailableKey(userId, "groq");

  if (!apiKey) {
    throw new Error("No Groq API keys available");
  }

  return new Groq({ apiKey: apiKey.api_key });
}

// Global session store (in production, use Redis or database)
declare global {
  var uploadSessions:
    | Map<
        string,
        {
          status: "processing" | "completed" | "failed";
          progress: number;
          message: string;
          totalContacts: number;
          processedContacts: number;
          startTime: number;
          result?: any;
          error?: string;
        }
      >
    | undefined;
}

// Initialize global session store
if (!global.uploadSessions) {
  global.uploadSessions = new Map();
}

// Function to update session progress
function updateSessionProgress(
  sessionId: string,
  update: Partial<{
    status: "processing" | "completed" | "failed";
    progress: number;
    message: string;
    totalContacts: number;
    processedContacts: number;
    startTime: number;
    result?: any;
    error?: string;
  }>
) {
  const session = global.uploadSessions!.get(sessionId);
  if (session) {
    global.uploadSessions!.set(sessionId, { ...session, ...update });
  }
}

// Function to batch process contacts with AI (much faster than individual calls)
async function batchEnrichContacts(
  contacts: any[],
  sessionId: string,
  userId: string
): Promise<any[]> {
  try {
    // Check if API keys are available
    const { aiKeyManager } = await import("@/lib/ai-key-manager");
    const bestKey = await aiKeyManager.getBestAvailableKey(userId);

    if (!bestKey || contacts.length === 0) {
      console.log(
        "⚠️ Skipping AI enrichment - no API keys available or no contacts"
      );
      return contacts.map((contact) => basicMapping(contact));
    }

    // Process in batches of 10 for optimal performance
    const batchSize = 10;
    const enrichedContacts = [];
    const totalBatches = Math.ceil(contacts.length / batchSize);

    updateSessionProgress(sessionId, {
      message: `Processing ${contacts.length} contacts with AI...`,
      progress: 20,
    });

    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      const currentBatch = Math.floor(i / batchSize) + 1;

      updateSessionProgress(sessionId, {
        message: `AI processing batch ${currentBatch}/${totalBatches}...`,
        progress: 20 + (currentBatch / totalBatches) * 60, // 20% to 80%
      });

      try {
        const batchPrompt = `
Analyze and enrich this batch of ${
          batch.length
        } contacts. For each contact, intelligently fill in missing information based on the email and company patterns.

Contacts to process:
${batch
  .map(
    (contact, index) => `
Contact ${index + 1}:
- Email: ${contact.email}
- Company: ${contact.company || contact.company_name || "Unknown"}
- Current Name: ${contact.name || "Not provided"}
- Current Role: ${
      contact.role || contact.position || contact.title || "Not provided"
    }
- Additional Info: ${JSON.stringify(contact)}
`
  )
  .join("\n")}

Rules for enrichment:
1. If email is like "careers@", "jobs@", "hr@", "recruiting@" - suggest role as "Recruiter" or "HR"
2. Extract likely names from email patterns when possible
3. For company emails, suggest appropriate roles based on company type
4. Keep existing non-null values unchanged
5. Make intelligent guesses based on email domains and patterns

Respond with a JSON array of ${
          batch.length
        } objects in the exact same order, each containing:
{
  "email": "original_email",
  "name": "enhanced_or_original_name",
  "company_name": "enhanced_or_original_company",
  "role": "enhanced_or_original_role",
  "recruiter_name": "enhanced_or_original_recruiter"
}`;

        const groq = await createGroqClient();
        const completion = await groq.chat.completions.create({
          messages: [{ role: "user", content: batchPrompt }],
          model: "llama3-8b-8192",
          temperature: 0.3,
          max_tokens: 2000,
        });

        const aiResponse = completion.choices[0]?.message?.content;
        if (aiResponse) {
          const aiEnrichments = JSON.parse(aiResponse);

          if (
            Array.isArray(aiEnrichments) &&
            aiEnrichments.length === batch.length
          ) {
            // Merge AI suggestions with original data
            batch.forEach((originalContact, index) => {
              const aiSuggestion = aiEnrichments[index];
              const enriched = {
                email: originalContact.email,
                name: aiSuggestion.name || originalContact.name || null,
                company_name:
                  aiSuggestion.company_name ||
                  originalContact.company ||
                  originalContact.company_name ||
                  null,
                role:
                  aiSuggestion.role ||
                  originalContact.role ||
                  originalContact.position ||
                  originalContact.title ||
                  null,
                recruiter_name:
                  aiSuggestion.recruiter_name ||
                  originalContact.recruiter_name ||
                  originalContact.recruiter ||
                  null,
                additional_info: originalContact,
              };
              enrichedContacts.push(enriched);
            });
          } else {
            // Fallback to basic mapping if AI response is malformed
            enrichedContacts.push(
              ...batch.map((contact) => basicMapping(contact))
            );
          }
        } else {
          // Fallback to basic mapping if no AI response
          enrichedContacts.push(
            ...batch.map((contact) => basicMapping(contact))
          );
        }
      } catch (aiError) {
        console.log(
          `AI enrichment failed for batch ${currentBatch}, using basic mapping:`,
          aiError
        );
        enrichedContacts.push(...batch.map((contact) => basicMapping(contact)));
      }

      // Small delay between batches to respect rate limits
      if (i + batchSize < contacts.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return enrichedContacts;
  } catch (error) {
    console.error("Error in batch enrichment:", error);
    return contacts.map((contact) => basicMapping(contact));
  }
}

// Basic mapping function without AI
function basicMapping(rawContact: any): any {
  return {
    email: rawContact.email,
    name: rawContact.name || null,
    company_name:
      rawContact.company_name ||
      rawContact.company ||
      rawContact.companyName ||
      null,
    role: rawContact.role || rawContact.position || rawContact.title || null,
    recruiter_name:
      rawContact.recruiter_name ||
      rawContact.recruiter ||
      rawContact.recruiterName ||
      null,
    additional_info: rawContact,
  };
}

// POST - Process uploaded files and extract contact data
export async function POST(request: NextRequest) {
  // Check authentication
  const session = await getServerSession();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user ID
  const userResult = await query("SELECT id FROM users WHERE email = $1", [
    session.user.email,
  ]);

  if (userResult.rows.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userId = userResult.rows[0].id;
  const startTime = Date.now();
  const sessionId = `upload_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    console.log(
      `🚀 Starting upload processing for ${files.length} file(s) with session ${sessionId}`
    );

    // Initialize session
    global.uploadSessions!.set(sessionId, {
      status: "processing",
      progress: 0,
      message: "Starting upload...",
      totalContacts: 0,
      processedContacts: 0,
      startTime: Date.now(),
    });

    const allContacts = [];

    // Step 1: Parse files (fast)
    updateSessionProgress(sessionId, {
      message: "Parsing uploaded files...",
      progress: 10,
    });

    for (const file of files) {
      const fileContent = await file.text();
      let contacts = [];

      try {
        if (file.name.endsWith(".json")) {
          const jsonData = JSON.parse(fileContent);
          if (Array.isArray(jsonData)) {
            contacts = jsonData;
          } else if (jsonData.contacts && Array.isArray(jsonData.contacts)) {
            contacts = jsonData.contacts;
          } else {
            contacts = [jsonData];
          }
        } else if (file.name.endsWith(".csv")) {
          const lines = fileContent.split("\n");
          const headers = lines[0]
            .split(",")
            .map((h) => h.trim().toLowerCase());

          for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
              const values = lines[i].split(",").map((v) => v.trim());
              const contact: any = {};

              headers.forEach((header, index) => {
                if (values[index]) {
                  if (header.includes("email")) {
                    contact.email = values[index];
                  } else if (
                    header.includes("name") &&
                    !header.includes("company")
                  ) {
                    contact.name = values[index];
                  } else if (header.includes("company")) {
                    contact.company_name = values[index];
                  } else if (
                    header.includes("role") ||
                    header.includes("position") ||
                    header.includes("title")
                  ) {
                    contact.role = values[index];
                  } else if (header.includes("recruiter")) {
                    contact.recruiter_name = values[index];
                  } else {
                    if (!contact.additional_info) contact.additional_info = {};
                    contact.additional_info[header] = values[index];
                  }
                }
              });

              if (contact.email) {
                contacts.push(contact);
              }
            }
          }
        } else if (file.name.endsWith(".txt")) {
          const lines = fileContent.split("\n");
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine) {
              try {
                const contact = JSON.parse(trimmedLine);
                if (contact.email) {
                  contacts.push(contact);
                }
              } catch {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (emailRegex.test(trimmedLine)) {
                  contacts.push({ email: trimmedLine });
                }
              }
            }
          }
        }

        allContacts.push(...contacts);
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      }
    }

    const validContacts = allContacts.filter((contact) => contact.email);

    if (validContacts.length === 0) {
      updateSessionProgress(sessionId, {
        status: "failed",
        message: "No valid contacts found",
        error:
          "No valid contacts found in uploaded files. Make sure files contain email addresses.",
      });
      return NextResponse.json(
        {
          error:
            "No valid contacts found in uploaded files. Make sure files contain email addresses.",
        },
        { status: 400 }
      );
    }

    updateSessionProgress(sessionId, {
      totalContacts: validContacts.length,
      message: `Found ${validContacts.length} valid contacts. Starting AI enrichment...`,
      progress: 15,
    });

    console.log(`📁 Parsed ${validContacts.length} valid contacts from files`);

    // Step 2: Batch AI enrichment (much faster than individual calls)
    console.log(`🤖 Starting batch AI enrichment...`);
    const enrichedContacts = await batchEnrichContacts(
      validContacts,
      sessionId,
      userId
    );

    updateSessionProgress(sessionId, {
      message: "Saving to database...",
      progress: 85,
    });

    console.log(
      `✨ AI enrichment completed in ${(
        (Date.now() - startTime) /
        1000
      ).toFixed(1)}s`
    );

    // Step 3: Save to database
    console.log(`💾 Saving to database...`);
    const insertedContacts = [];

    for (const contact of enrichedContacts) {
      try {
        const result = await query(
          `INSERT INTO contacts (user_id, email, name, company_name, role, recruiter_name, additional_info) 
           VALUES ($1, $2, $3, $4, $5, $6, $7) 
           ON CONFLICT (user_id, email) DO UPDATE SET
           name = COALESCE(EXCLUDED.name, contacts.name),
           company_name = COALESCE(EXCLUDED.company_name, contacts.company_name),
           role = COALESCE(EXCLUDED.role, contacts.role),
           recruiter_name = COALESCE(EXCLUDED.recruiter_name, contacts.recruiter_name),
           additional_info = COALESCE(EXCLUDED.additional_info, contacts.additional_info),
           updated_at = CURRENT_TIMESTAMP
           RETURNING *`,
          [
            userId,
            contact.email,
            contact.name || null,
            contact.company_name || null,
            contact.role || null,
            contact.recruiter_name || null,
            contact.additional_info || {},
          ]
        );
        insertedContacts.push(result.rows[0]);
      } catch (error) {
        console.error("Error inserting contact:", contact.email, error);
      }
    }

    const saveResult = {
      message: `Successfully processed ${insertedContacts.length} contacts`,
      contacts: insertedContacts,
    };
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`🎉 Upload completed successfully in ${totalTime}s`);

    // Mark session as completed
    updateSessionProgress(sessionId, {
      status: "completed",
      progress: 100,
      message: `Successfully processed ${enrichedContacts.length} contacts in ${totalTime}s`,
      processedContacts: enrichedContacts.length,
      result: {
        message: `Successfully processed ${enrichedContacts.length} contacts from ${files.length} file(s) with AI enrichment in ${totalTime}s`,
        contacts: saveResult.contacts,
        totalProcessed: enrichedContacts.length,
        aiEnriched: enrichedContacts.length, // AI enrichment is now database-managed
        processingTime: `${totalTime}s`,
      },
    });

    return NextResponse.json({
      sessionId,
      message: `Upload started! Processing ${enrichedContacts.length} contacts in background.`,
      totalContacts: enrichedContacts.length,
      backgroundProcessing: true,
    });
  } catch (error) {
    console.error("Error processing upload:", error);
    updateSessionProgress(sessionId, {
      status: "failed",
      message: "Upload failed",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
    return NextResponse.json(
      { error: "Failed to process uploaded files" },
      { status: 500 }
    );
  }
}

// GET - Check upload progress
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "Session ID required" }, { status: 400 });
  }

  const session = global.uploadSessions!.get(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(session);
}
