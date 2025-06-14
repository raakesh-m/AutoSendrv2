"use client";

import { useSession } from "next-auth/react";

export function useAuth() {
  const { data: session, status } = useSession();

  return {
    user: session?.user,
    userId: session?.user?.id,
    isLoading: status === "loading",
    isAuthenticated: !!session,
    session,
  };
}
