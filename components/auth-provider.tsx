"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import type { Session } from "next-auth";
import { useState, useEffect } from "react";

interface AuthProviderProps {
  children: ReactNode;
  session?: Session | null;
}

export function AuthProvider({ children, session }: AuthProviderProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Prevent hydration mismatch by only rendering SessionProvider on client
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <SessionProvider
      session={session}
      refetchInterval={0}
      refetchOnWindowFocus={false}
      basePath="/api/auth"
    >
      {children}
    </SessionProvider>
  );
}
