import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { query } from "@/lib/db";
import type { NextAuthOptions } from "next-auth";

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          console.log("🔐 Attempting to sign in user:", user.email);

          // Check if user exists in our database
          const existingUser = await query(
            "SELECT id FROM users WHERE email = $1",
            [user.email]
          );

          if (existingUser.rows.length === 0) {
            console.log("👤 Creating new user:", user.email);
            // Create new user
            await query("INSERT INTO users (email, name) VALUES ($1, $2)", [
              user.email,
              user.name,
            ]);

            // Create default email template for new user
            const userResult = await query(
              "SELECT id FROM users WHERE email = $1",
              [user.email]
            );
            const userId = userResult.rows[0].id;

            await query(
              `INSERT INTO email_templates (user_id, name, subject, body, variables, is_default) 
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                userId,
                "Default Application Template",
                "Application for [Role] at [CompanyName]",
                `Hi [RecruiterName],

I hope you're doing well. I recently came across [CompanyName] and found the opportunity for a [Role] very interesting.

I'm reaching out to express my interest in the [Role] position. With experience in relevant domain/skills , I believe I can contribute meaningfully to your team.

I've attached my resume for your reference and would love to connect if the opportunity is still open in [CompanyName].

Thank you for your time,  
Your Name`,
                ["CompanyName", "RecruiterName", "Role"],
                true,
              ]
            );

            // Create default AI rules for new user
            await query(
              `INSERT INTO ai_rules (user_id, name, description, rules_text, is_active) 
               VALUES ($1, $2, $3, $4, $5)`,
              [
                userId,
                "Strict Template Rules",
                "Strict rules that only replace placeholders without altering template structure",
                `You are a template placeholder replacement assistant. Follow these rules EXACTLY:

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

CRITICAL: Your job is ONLY to replace placeholders. Do not enhance, improve, or modify anything else.`,
                true,
              ]
            );

            console.log("✅ New user setup completed successfully");
          } else {
            console.log("👋 Existing user signing in:", user.email);
          }
          return true;
        } catch (error) {
          console.error("❌ Error during signin process:", error);

          // Check if it's a connection timeout - allow signin anyway in this case
          if (
            error instanceof Error &&
            (error.message.includes("timeout") ||
              error.message.includes("fetch failed") ||
              error.message.includes("Connect Timeout"))
          ) {
            console.log(
              "⚠️ Database timeout during signin - allowing signin but user setup may be incomplete"
            );
            return true; // Allow signin even if database is temporarily unavailable
          }

          return false;
        }
      }
      return true;
    },
    async session({ session, token }) {
      // Add user ID to session
      if (session.user?.email) {
        const userResult = await query(
          "SELECT id FROM users WHERE email = $1",
          [session.user.email]
        );
        if (userResult.rows.length > 0) {
          (session.user as any).id = userResult.rows[0].id;
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      return token;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
