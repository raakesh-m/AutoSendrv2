import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Function to intelligently map and enrich contact data using AI
async function enrichContactData(rawContact: any): Promise<any> {
  try {
    // Basic field mapping first
    const mappedContact: any = {
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
      additional_info: {},
    };

    // Store original fields in additional_info
    Object.keys(rawContact).forEach((key) => {
      if (
        ![
          "email",
          "name",
          "company_name",
          "company",
          "companyName",
          "role",
          "position",
          "title",
          "recruiter_name",
          "recruiter",
          "recruiterName",
        ].includes(key)
      ) {
        mappedContact.additional_info[key] = rawContact[key];
      }
    });

    // If we have Groq API key and missing key fields, use AI to enrich
    if (
      process.env.GROQ_API_KEY &&
      (!mappedContact.name ||
        !mappedContact.role ||
        !mappedContact.recruiter_name)
    ) {
      try {
        const enrichmentPrompt = `
Analyze this contact data and intelligently fill in missing information:

Email: ${mappedContact.email}
Company: ${mappedContact.company_name || "Unknown"}
Current Name: ${mappedContact.name || "Not provided"}
Current Role: ${mappedContact.role || "Not provided"}
Current Recruiter Name: ${mappedContact.recruiter_name || "Not provided"}
Additional Info: ${JSON.stringify(mappedContact.additional_info)}

Please provide a JSON response with intelligent guesses for missing fields. Rules:
1. If email is like "careers@", "jobs@", "hr@", "recruiting@" - suggest role as "Recruiter" or "HR"
2. If email has specific name patterns, extract likely recruiter name
3. For company emails, suggest appropriate roles based on company type
4. Keep existing non-null values unchanged
5. Only return the enhanced contact object

Example response:
{
  "name": "John Smith",
  "role": "Senior Frontend Developer", 
  "recruiter_name": "HR Team"
}`;

        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "user",
              content: enrichmentPrompt,
            },
          ],
          model: "llama3-8b-8192",
          temperature: 0.3,
        });

        const aiResponse = completion.choices[0]?.message?.content;
        if (aiResponse) {
          const aiEnrichment = JSON.parse(aiResponse);

          // Apply AI suggestions only for missing fields
          if (!mappedContact.name && aiEnrichment.name) {
            mappedContact.name = aiEnrichment.name;
          }
          if (!mappedContact.role && aiEnrichment.role) {
            mappedContact.role = aiEnrichment.role;
          }
          if (!mappedContact.recruiter_name && aiEnrichment.recruiter_name) {
            mappedContact.recruiter_name = aiEnrichment.recruiter_name;
          }
        }
      } catch (aiError) {
        console.log(
          "AI enrichment failed, continuing with basic mapping:",
          aiError
        );
      }
    }

    return mappedContact;
  } catch (error) {
    console.error("Error enriching contact data:", error);
    // Return basic mapping if enrichment fails
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
}

// POST - Process uploaded files and extract contact data
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const processedContacts = [];

    for (const file of files) {
      const fileContent = await file.text();
      let contacts = [];

      try {
        if (file.name.endsWith(".json")) {
          // Process JSON file
          const jsonData = JSON.parse(fileContent);

          if (Array.isArray(jsonData)) {
            contacts = jsonData;
          } else if (jsonData.contacts && Array.isArray(jsonData.contacts)) {
            contacts = jsonData.contacts;
          } else {
            contacts = [jsonData];
          }

          // Enrich each contact with AI
          const enrichedContacts = [];
          for (const contact of contacts) {
            if (contact.email) {
              const enriched = await enrichContactData(contact);
              enrichedContacts.push(enriched);
            }
          }
          contacts = enrichedContacts;
        } else if (file.name.endsWith(".csv")) {
          // Process CSV file
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
                  // Map common header variations to standard fields
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
          // Process TXT file - assume one email per line or JSON-like format
          const lines = fileContent.split("\n");

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine) {
              // Try to parse as JSON first
              try {
                const contact = JSON.parse(trimmedLine);
                if (contact.email) {
                  const enriched = await enrichContactData(contact);
                  contacts.push(enriched);
                }
              } catch {
                // If not JSON, check if it's an email
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (emailRegex.test(trimmedLine)) {
                  const enriched = await enrichContactData({
                    email: trimmedLine,
                  });
                  contacts.push(enriched);
                }
              }
            }
          }
        }

        processedContacts.push(...contacts);
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      }
    }

    // Validate that we have at least some contacts with emails
    const validContacts = processedContacts.filter((contact) => contact.email);

    if (validContacts.length === 0) {
      return NextResponse.json(
        {
          error:
            "No valid contacts found in uploaded files. Make sure files contain email addresses.",
        },
        { status: 400 }
      );
    }

    // Save to database
    const saveResponse = await fetch(`${request.nextUrl.origin}/api/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contacts: validContacts }),
    });

    if (!saveResponse.ok) {
      throw new Error("Failed to save contacts to database");
    }

    const saveResult = await saveResponse.json();

    return NextResponse.json({
      message: `Successfully processed ${validContacts.length} contacts from ${files.length} file(s) with AI enrichment`,
      contacts: saveResult.contacts,
      totalProcessed: validContacts.length,
      aiEnriched: process.env.GROQ_API_KEY ? validContacts.length : 0,
    });
  } catch (error) {
    console.error("Error processing upload:", error);
    return NextResponse.json(
      { error: "Failed to process uploaded files" },
      { status: 500 }
    );
  }
}
