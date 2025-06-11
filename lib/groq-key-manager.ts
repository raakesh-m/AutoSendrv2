import { query } from "@/lib/db";

interface ApiKeyInfo {
  id: number;
  key_name: string;
  api_key: string;
  is_active: boolean;
  usage_count: number;
  last_used_at: string | null;
  daily_reset_at: string;
  rate_limit_hit_at: string | null;
}

class GroqKeyManager {
  private keys: ApiKeyInfo[] = [];
  private currentKeyIndex = 0;
  private lastFetchTime = 0;
  private cacheTimeout = 60000; // 1 minute cache

  async getAvailableKey(): Promise<string | null> {
    await this.refreshKeysIfNeeded();

    if (this.keys.length === 0) {
      console.warn("No Groq API keys available in database");
      return process.env.GROQ_API_KEY || null;
    }

    // Filter active keys that haven't hit rate limits recently
    const availableKeys = this.keys.filter((key) => {
      if (!key.is_active) return false;

      // Check if rate limit hit within the last hour
      if (key.rate_limit_hit_at) {
        const hitTime = new Date(key.rate_limit_hit_at).getTime();
        const now = Date.now();
        const hoursSinceHit = (now - hitTime) / (1000 * 60 * 60);

        // If hit less than 1 hour ago, skip this key
        if (hoursSinceHit < 1) {
          return false;
        }
      }

      return true;
    });

    if (availableKeys.length === 0) {
      console.warn("🚫 All API keys are rate limited or inactive");
      console.log("   Rate limited keys will be available again in 1 hour");
      return null;
    }

    // Use round-robin selection
    const selectedKey =
      availableKeys[this.currentKeyIndex % availableKeys.length];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % availableKeys.length;

    // Enhanced logging with rotation info
    const keyProgress = `${selectedKey.usage_count}/14400`;
    const percentUsed = Math.round((selectedKey.usage_count / 14400) * 100);
    const nextKeyName =
      availableKeys.length > 1
        ? availableKeys[this.currentKeyIndex % availableKeys.length].key_name
        : "same key (only one available)";

    console.log(`🔑 Selected API Key: "${selectedKey.key_name}"`);
    console.log(`   📊 Usage today: ${keyProgress} (${percentUsed}%)`);
    console.log(`   🔄 Next key in rotation: "${nextKeyName}"`);
    console.log(
      `   🕐 Last used: ${
        selectedKey.last_used_at
          ? new Date(selectedKey.last_used_at).toLocaleTimeString()
          : "Never"
      }`
    );

    return selectedKey.api_key;
  }

  async recordKeyUsage(
    apiKey: string,
    success: boolean = true,
    errorType?: string
  ): Promise<void> {
    try {
      if (
        !success &&
        (errorType === "rate_limit_exceeded" || errorType?.includes("429"))
      ) {
        // Mark key as rate limited
        await query(
          `
          UPDATE groq_api_keys 
          SET rate_limit_hit_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE api_key = $1
        `,
          [apiKey]
        );

        console.log(`⚠️ API Key Rate Limited: ${this.maskKey(apiKey)}`);
        console.log(`   🔄 Rotating to next available key...`);
        console.log(
          `   ⏰ This key will be available again at ${new Date(
            Date.now() + 60 * 60 * 1000
          ).toLocaleTimeString()}`
        );
      } else if (success) {
        // Update usage count and last used time
        const result = await query(
          `
          UPDATE groq_api_keys 
          SET usage_count = usage_count + 1, 
              last_used_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE api_key = $1
          RETURNING key_name, usage_count
        `,
          [apiKey]
        );

        if (result.rows.length > 0) {
          const { key_name, usage_count } = result.rows[0];
          const percentUsed = Math.round((usage_count / 14400) * 100);

          // Log usage update with progress
          console.log(`✅ Key Usage Updated: "${key_name}"`);
          console.log(
            `   📈 New usage: ${usage_count}/14400 (${percentUsed}%)`
          );

          // Warn if approaching limit
          if (usage_count >= 13000) {
            // Within 1400 of limit
            const remaining = 14400 - usage_count;
            console.log(
              `   🟡 Warning: Only ${remaining} requests remaining for "${key_name}"`
            );
          }
        }
      }

      // Force refresh keys on next request to get updated stats
      this.lastFetchTime = 0;
    } catch (error) {
      console.error("Error recording key usage:", error);
    }
  }

  async resetDailyUsage(): Promise<void> {
    try {
      // Reset usage counts for all keys where the daily reset date has passed
      await query(`
        UPDATE groq_api_keys 
        SET usage_count = 0, 
            daily_reset_at = CURRENT_DATE,
            rate_limit_hit_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE daily_reset_at < CURRENT_DATE
      `);

      console.log("Daily usage reset completed for applicable keys");
      this.lastFetchTime = 0; // Force refresh
    } catch (error) {
      console.error("Error resetting daily usage:", error);
    }
  }

  async getKeyStats(): Promise<{
    totalKeys: number;
    activeKeys: number;
    rateLimitedKeys: number;
    totalDailyCapacity: number;
    usedToday: number;
  }> {
    await this.refreshKeysIfNeeded();

    const totalKeys = this.keys.length;
    const activeKeys = this.keys.filter((k) => k.is_active).length;

    const rateLimitedKeys = this.keys.filter((k) => {
      if (!k.rate_limit_hit_at) return false;
      const hitTime = new Date(k.rate_limit_hit_at).getTime();
      const hoursSinceHit = (Date.now() - hitTime) / (1000 * 60 * 60);
      return hoursSinceHit < 1;
    }).length;

    const totalDailyCapacity = activeKeys * 14400; // 14,400 per key per day
    const usedToday = this.keys.reduce((sum, key) => sum + key.usage_count, 0);

    return {
      totalKeys,
      activeKeys,
      rateLimitedKeys,
      totalDailyCapacity,
      usedToday,
    };
  }

  private async refreshKeysIfNeeded(): Promise<void> {
    const now = Date.now();
    if (now - this.lastFetchTime < this.cacheTimeout && this.keys.length > 0) {
      return; // Cache is still valid
    }

    try {
      const result = await query(`
        SELECT id, key_name, api_key, is_active, usage_count, 
               last_used_at, daily_reset_at, rate_limit_hit_at
        FROM groq_api_keys 
        WHERE is_active = true
        ORDER BY usage_count ASC, last_used_at ASC NULLS FIRST
      `);

      this.keys = result.rows;
      this.lastFetchTime = now;

      console.log(`Refreshed ${this.keys.length} active API keys`);
    } catch (error) {
      console.error("Error fetching API keys from database:", error);
      // Keep existing keys if database fetch fails
    }
  }

  private maskKey(key: string): string {
    if (key.length <= 8) return "*".repeat(key.length);
    return key.slice(0, 4) + "*".repeat(key.length - 8) + key.slice(-4);
  }

  // Method to check if we have any available keys
  async hasAvailableKeys(): Promise<boolean> {
    const key = await this.getAvailableKey();
    return key !== null;
  }

  // Clear cache (useful for testing or manual refresh)
  clearCache(): void {
    this.lastFetchTime = 0;
  }
}

// Export singleton instance
export const groqKeyManager = new GroqKeyManager();
