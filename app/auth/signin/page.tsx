"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AutoSendrLogo } from "@/components/autosendr-logo";
import { Mail } from "lucide-react";

export default function SignIn() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push("/");
    }
  }, [session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AutoSendrLogo size="lg" />
          </div>
          <CardTitle className="text-2xl">Welcome to AutoSendr</CardTitle>
          <CardDescription>
            Sign in to manage your email campaigns and AI-powered outreach
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full"
            size="lg"
          >
            <Mail className="mr-2 h-5 w-5" />
            Sign in with Google
          </Button>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Your data is secure and private. We only use your email to create
            your account.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
