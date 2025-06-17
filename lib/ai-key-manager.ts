import { query } from "@/lib/db";
import OpenAI from "openai";
import Groq from "groq-sdk";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Supported AI providers
export type AIProvider = "openai" | "groq" | "anthropic" | "google";

export interface AIApiKey {
  id: number;
  user_id: string;
  provider: AIProvider;
  key_name: string;
  api_key: string;
  model_preference?: string;
  is_active: boolean;
  enable_rotation: boolean;
  usage_count: number;
  daily_limit?: number;
  last_used_at?: Date;
  daily_reset_at: Date;
  rate_limit_hit_at?: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AIUserPreferences {
  id: number;
  user_id: string;
  enable_global_rotation: boolean;
  preferred_provider: AIProvider;
  fallback_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ProviderConfig {
  name: string;
  displayName: string;
  defaultModel: string;
  defaultDailyLimit: number;
  supportedModels: string[];
  rateLimitResetHours: number;
}

// Provider configurations
export const PROVIDER_CONFIGS: Record<AIProvider, ProviderConfig> = {
  openai: {
    name: "openai",
    displayName: "OpenAI",
    defaultModel: "gpt-4o-mini",
    defaultDailyLimit: 10000,
    supportedModels: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    rateLimitResetHours: 1,
  },
  groq: {
    name: "groq",
    displayName: "Groq",
    defaultModel: "llama3-8b-8192",
    defaultDailyLimit: 14400,
    supportedModels: [
      "llama3-8b-8192",
      "llama3-70b-8192",
      "mixtral-8x7b-32768",
    ],
    rateLimitResetHours: 1,
  },
  anthropic: {
    name: "anthropic",
    displayName: "Anthropic Claude",
    defaultModel: "claude-3-5-haiku-20241022",
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
    displayName: "Google Gemini",
    defaultModel: "gemini-1.5-flash",
    defaultDailyLimit: 15000,
    supportedModels: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.0-pro"],
    rateLimitResetHours: 24,
  },
};

export interface AIEnhancementOptions {
  userId: string;
  prompt: string;
  preferredProvider?: AIProvider;
  maxTokens?: number;
  temperature?: number;
}

export interface AIEnhancementResult {
  success: boolean;
  response?: string;
  provider?: AIProvider;
  keyUsed?: string;
  tokensUsed?: number;
  error?: string;
  fallbackUsed?: boolean;
}

class MultiProviderAIManager {
  private keyCache: Map<string, AIApiKey[]> = new Map();
  private preferencesCache: Map<string, AIUserPreferences> = new Map();
  private cacheTimeout = 60000; // 1 minute
  private lastCacheUpdate: Map<string, number> = new Map();

  /**
   * Get user's AI preferences, creating defaults if they don't exist
   */
  async getUserPreferences(userId: string): Promise<AIUserPreferences> {
    const cacheKey = `prefs_${userId}`;
    const cached = this.preferencesCache.get(cacheKey);
    const lastUpdate = this.lastCacheUpdate.get(cacheKey) || 0;

    if (cached && Date.now() - lastUpdate < this.cacheTimeout) {
      return cached;
    }

    try {
      let result = await query(
        "SELECT * FROM ai_user_preferences WHERE user_id = $1",
        [userId]
      );

      if (result.rows.length === 0) {
        // Create default preferences
        await query(
          `INSERT INTO ai_user_preferences (user_id, enable_global_rotation, preferred_provider, fallback_enabled) 
           VALUES ($1, $2, $3, $4)`,
          [userId, false, "groq", true]
        );

        result = await query(
          "SELECT * FROM ai_user_preferences WHERE user_id = $1",
          [userId]
        );
      }

      const preferences = result.rows[0] as AIUserPreferences;
      this.preferencesCache.set(cacheKey, preferences);
      this.lastCacheUpdate.set(cacheKey, Date.now());

      return preferences;
    } catch (error) {
      console.error("Error getting user preferences:", error);
      return {
        id: 0,
        user_id: userId,
        enable_global_rotation: false,
        preferred_provider: "groq",
        fallback_enabled: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
    }
  }

  /**
   * Get available API keys for a user and provider
   */
  async getAvailableKeys(
    userId: string,
    provider?: AIProvider
  ): Promise<AIApiKey[]> {
    const cacheKey = `keys_${userId}_${provider || "all"}`;
    const cached = this.keyCache.get(cacheKey);
    const lastUpdate = this.lastCacheUpdate.get(cacheKey) || 0;

    if (cached && Date.now() - lastUpdate < this.cacheTimeout) {
      return cached;
    }

    try {
      let sql = `
        SELECT * FROM ai_api_keys 
        WHERE user_id = $1 AND is_active = true
      `;
      const params = [userId];

      if (provider) {
        sql += " AND provider = $2";
        params.push(provider);
      }

      sql += " ORDER BY usage_count ASC, last_used_at ASC NULLS FIRST";

      const result = await query(sql, params);
      const keys = result.rows as AIApiKey[];

      // Filter out rate-limited keys
      const availableKeys = keys.filter((key) => {
        if (!key.rate_limit_hit_at) return true;

        const config = PROVIDER_CONFIGS[key.provider as AIProvider];
        const hitTime = new Date(key.rate_limit_hit_at).getTime();
        const hoursAgo = (Date.now() - hitTime) / (1000 * 60 * 60);

        return hoursAgo >= config.rateLimitResetHours;
      });

      this.keyCache.set(cacheKey, availableKeys);
      this.lastCacheUpdate.set(cacheKey, Date.now());

      return availableKeys;
    } catch (error) {
      console.error("Error getting available keys:", error);
      return [];
    }
  }

  /**
   * Get the best available key for a user
   */
  async getBestAvailableKey(
    userId: string,
    preferredProvider?: AIProvider
  ): Promise<AIApiKey | null> {
    const preferences = await this.getUserPreferences(userId);
    const targetProvider = preferredProvider || preferences.preferred_provider;

    // Try preferred provider first
    let availableKeys = await this.getAvailableKeys(userId, targetProvider);

    if (preferences.enable_global_rotation) {
      availableKeys = availableKeys.filter((key) => key.enable_rotation);
    }

    if (availableKeys.length > 0) {
      return availableKeys[0];
    }

    // Fallback to other providers if enabled
    if (preferences.fallback_enabled) {
      const allProviders: AIProvider[] = [
        "openai",
        "groq",
        "anthropic",
        "google",
      ];

      for (const provider of allProviders) {
        if (provider === targetProvider) continue;

        let fallbackKeys = await this.getAvailableKeys(userId, provider);

        if (preferences.enable_global_rotation) {
          fallbackKeys = fallbackKeys.filter((key) => key.enable_rotation);
        }

        if (fallbackKeys.length > 0) {
          console.log(`🔄 Falling back to ${provider} provider`);
          return fallbackKeys[0];
        }
      }
    }

    return null;
  }

  /**
   * Record API key usage
   */
  async recordKeyUsage(
    keyId: number,
    success: boolean = true,
    tokensUsed: number = 1,
    errorType?: string
  ): Promise<void> {
    try {
      if (
        !success &&
        (errorType === "rate_limit_exceeded" || errorType?.includes("429"))
      ) {
        await query(
          `UPDATE ai_api_keys 
           SET rate_limit_hit_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [keyId]
        );
      } else if (success) {
        await query(
          `UPDATE ai_api_keys 
           SET usage_count = usage_count + $2, 
               last_used_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [keyId, tokensUsed]
        );
      }

      this.clearCache();
    } catch (error) {
      console.error("Error recording key usage:", error);
    }
  }

  /**
   * Reset daily usage for all keys
   */
  async resetDailyUsage(): Promise<void> {
    try {
      await query(`
        UPDATE ai_api_keys 
        SET usage_count = 0, 
            daily_reset_at = CURRENT_DATE,
            rate_limit_hit_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE daily_reset_at < CURRENT_DATE
      `);

      this.clearCache();
      console.log("Daily usage reset completed for all providers");
    } catch (error) {
      console.error("Error resetting daily usage:", error);
    }
  }

  /**
   * Get user key statistics
   */
  async getUserKeyStats(userId: string): Promise<any> {
    try {
      const result = await query(
        `
        SELECT 
          provider,
          COUNT(*) as total_keys,
          COUNT(CASE WHEN is_active THEN 1 END) as active_keys,
          COUNT(CASE WHEN enable_rotation THEN 1 END) as rotation_enabled_keys,
          SUM(usage_count) as total_usage,
          MAX(last_used_at) as last_used
        FROM ai_api_keys 
        WHERE user_id = $1
        GROUP BY provider
        ORDER BY provider
      `,
        [userId]
      );

      return result.rows;
    } catch (error) {
      console.error("Error getting user key stats:", error);
      return [];
    }
  }

  /**
   * Generate content using the best available AI provider
   */
  async generateContent(
    prompt: string,
    userId: string,
    options: {
      preferredProvider?: AIProvider;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<{
    success: boolean;
    content?: string;
    provider?: AIProvider;
    model?: string;
    error?: string;
  }> {
    const bestKey = await this.getBestAvailableKey(
      userId,
      options.preferredProvider
    );

    if (!bestKey) {
      const activeKeyCount = await this.getActiveKeyCount(userId);

      if (activeKeyCount === 0) {
        return {
          success: false,
          error:
            "No active API keys found. Please add and activate at least one API key to use AI features.",
        };
      } else {
        return {
          success: false,
          error:
            "All API keys are currently rate limited or unavailable. Please wait for rate limits to reset or add additional keys.",
        };
      }
    }

    const config = PROVIDER_CONFIGS[bestKey.provider];
    const model = bestKey.model_preference || config.defaultModel;

    try {
      let response: string;
      const maxTokens = options.maxTokens || 500;
      const temperature = options.temperature || 0.1;

      switch (bestKey.provider) {
        case "openai":
          response = await this.callOpenAI(
            bestKey.api_key,
            model,
            prompt,
            maxTokens,
            temperature
          );
          break;
        case "groq":
          response = await this.callGroq(
            bestKey.api_key,
            model,
            prompt,
            maxTokens,
            temperature
          );
          break;
        case "anthropic":
          response = await this.callAnthropic(
            bestKey.api_key,
            model,
            prompt,
            maxTokens,
            temperature
          );
          break;
        case "google":
          response = await this.callGoogle(
            bestKey.api_key,
            model,
            prompt,
            maxTokens,
            temperature
          );
          break;
        default:
          throw new Error(`Unsupported provider: ${bestKey.provider}`);
      }

      await this.recordKeyUsage(bestKey.id, true, 1);

      return {
        success: true,
        content: response,
        provider: bestKey.provider,
        model: model,
      };
    } catch (error) {
      console.error(`Error calling ${bestKey.provider}:`, error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (errorMessage.includes("rate_limit") || errorMessage.includes("429")) {
        await this.recordKeyUsage(bestKey.id, false, 0, "rate_limit_exceeded");
      }

      return {
        success: false,
        error: errorMessage,
        provider: bestKey.provider,
        model: model,
      };
    }
  }

  /**
   * Get count of active keys for a user
   */
  private async getActiveKeyCount(userId: string): Promise<number> {
    try {
      const result = await query(
        `SELECT COUNT(*) as count FROM ai_api_keys WHERE user_id = $1 AND is_active = true`,
        [userId]
      );
      return parseInt(result.rows[0]?.count || "0");
    } catch (error) {
      console.error("Error getting active key count:", error);
      return 0;
    }
  }

  /**
   * Make an AI request using the best available key
   */
  async makeAIRequest(
    options: AIEnhancementOptions
  ): Promise<AIEnhancementResult> {
    const {
      userId,
      prompt,
      preferredProvider,
      maxTokens = 500,
      temperature = 0.1,
    } = options;

    const bestKey = await this.getBestAvailableKey(userId, preferredProvider);

    if (!bestKey) {
      return {
        success: false,
        error: "No available API keys found",
      };
    }

    const config = PROVIDER_CONFIGS[bestKey.provider];
    const model = bestKey.model_preference || config.defaultModel;

    try {
      let response: string;
      let tokensUsed = 1;

      switch (bestKey.provider) {
        case "openai":
          response = await this.callOpenAI(
            bestKey.api_key,
            model,
            prompt,
            maxTokens,
            temperature
          );
          break;
        case "groq":
          response = await this.callGroq(
            bestKey.api_key,
            model,
            prompt,
            maxTokens,
            temperature
          );
          break;
        case "anthropic":
          response = await this.callAnthropic(
            bestKey.api_key,
            model,
            prompt,
            maxTokens,
            temperature
          );
          break;
        case "google":
          response = await this.callGoogle(
            bestKey.api_key,
            model,
            prompt,
            maxTokens,
            temperature
          );
          break;
        default:
          throw new Error(`Unsupported provider: ${bestKey.provider}`);
      }

      await this.recordKeyUsage(bestKey.id, true, tokensUsed);

      return {
        success: true,
        response,
        provider: bestKey.provider,
        keyUsed: this.maskApiKey(bestKey.api_key),
        tokensUsed,
        fallbackUsed:
          preferredProvider && preferredProvider !== bestKey.provider,
      };
    } catch (error) {
      console.error(`Error calling ${bestKey.provider}:`, error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (errorMessage.includes("rate_limit") || errorMessage.includes("429")) {
        await this.recordKeyUsage(bestKey.id, false, 0, "rate_limit_exceeded");
      }

      return {
        success: false,
        error: errorMessage,
        provider: bestKey.provider,
        keyUsed: this.maskApiKey(bestKey.api_key),
      };
    }
  }

  /**
   * Provider-specific API calls
   */
  private async callOpenAI(
    apiKey: string,
    model: string,
    prompt: string,
    maxTokens: number,
    temperature: number
  ): Promise<string> {
    const client = new OpenAI({ apiKey });

    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature,
    });

    return completion.choices[0]?.message?.content || "";
  }

  private async callGroq(
    apiKey: string,
    model: string,
    prompt: string,
    maxTokens: number,
    temperature: number
  ): Promise<string> {
    const client = new Groq({ apiKey });

    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature,
    });

    return completion.choices[0]?.message?.content || "";
  }

  private async callAnthropic(
    apiKey: string,
    model: string,
    prompt: string,
    maxTokens: number,
    temperature: number
  ): Promise<string> {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: "user", content: prompt }],
    });

    return message.content[0]?.type === "text" ? message.content[0].text : "";
  }

  private async callGoogle(
    apiKey: string,
    model: string,
    prompt: string,
    maxTokens: number,
    temperature: number
  ): Promise<string> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({
      model,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
      },
    });

    const result = await geminiModel.generateContent(prompt);
    return result.response.text();
  }

  /**
   * Utility methods
   */
  private maskApiKey(key: string): string {
    if (key.length <= 8) return "*".repeat(key.length);
    return key.slice(0, 4) + "*".repeat(key.length - 8) + key.slice(-4);
  }

  public clearCache(): void {
    this.keyCache.clear();
    this.preferencesCache.clear();
    this.lastCacheUpdate.clear();
  }
}

// Export singleton instance
export const aiKeyManager = new MultiProviderAIManager();

// Export getUserPreferences as a standalone function
export const getUserPreferences = (userId: string) =>
  aiKeyManager.getUserPreferences(userId);
