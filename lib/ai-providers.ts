export type AIProvider = "openai" | "groq" | "anthropic" | "google";

export interface ProviderConfig {
  name: string;
  displayName: string;
  defaultModel: string;
  defaultDailyLimit: number;
  supportedModels: string[];
  rateLimitResetHours: number;
}

export const PROVIDER_CONFIGS: Record<AIProvider, ProviderConfig> = {
  openai: {
    name: "openai",
    displayName: "OpenAI",
    defaultModel: "gpt-4o",
    defaultDailyLimit: 10000,
    supportedModels: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    rateLimitResetHours: 24,
  },
  groq: {
    name: "groq",
    displayName: "Groq",
    defaultModel: "llama-3.1-70b-versatile",
    defaultDailyLimit: 14400,
    supportedModels: [
      "llama-3.1-70b-versatile",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
      "gemma2-9b-it",
    ],
    rateLimitResetHours: 1,
  },
  anthropic: {
    name: "anthropic",
    displayName: "Anthropic",
    defaultModel: "claude-3-5-sonnet-20241022",
    defaultDailyLimit: 5000,
    supportedModels: [
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
    ],
    rateLimitResetHours: 24,
  },
  google: {
    name: "google",
    displayName: "Google",
    defaultModel: "gemini-1.5-pro",
    defaultDailyLimit: 1500,
    supportedModels: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.0-pro"],
    rateLimitResetHours: 24,
  },
};

export interface AIApiKey {
  id: number;
  provider: AIProvider;
  key_name: string;
  api_key: string;
  model_preference?: string;
  is_active: boolean;
  enable_rotation: boolean;
  usage_count: number;
  daily_limit?: number;
  last_used_at?: string;
  daily_reset_at: string;
  rate_limit_hit_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AIUserPreferences {
  id: string;
  user_id: string;
  preferred_provider: AIProvider;
  enable_fallback: boolean;
  auto_rotate_keys: boolean;
  max_retries: number;
  created_at: string;
  updated_at: string;
}
