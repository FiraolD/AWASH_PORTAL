import pool from '../lib/db.js';

interface ConfigValue {
  value: any;
  category: string;
}

class ConfigService {
  private cache: Map<string, ConfigValue> = new Map();
  private cacheTimeout: number = 60000; // 1 minute cache

  async get(key: string): Promise<any> {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key)?.value;
    }
    
    const result = await pool.query(
      'SELECT config_value FROM configuration WHERE config_key = $1',
      [key]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const value = result.rows[0].config_value;
    
    // Cache the value
    this.cache.set(key, { value, category: 'general' });
    
    // Clear cache after timeout
    setTimeout(() => this.cache.delete(key), this.cacheTimeout);
    
    return value;
  }

  async getNumber(key: string, defaultValue: number = 0): Promise<number> {
    const value = await this.get(key);
    return typeof value === 'number' ? value : defaultValue;
  }

  async getString(key: string, defaultValue: string = ''): Promise<string> {
    const value = await this.get(key);
    return typeof value === 'string' ? value : defaultValue;
  }

  async getBoolean(key: string, defaultValue: boolean = false): Promise<boolean> {
    const value = await this.get(key);
    return typeof value === 'boolean' ? value : defaultValue;
  }

  async set(key: string, value: any, userId?: string): Promise<void> {
    await pool.query(
      `INSERT INTO configuration (config_key, config_value, updated_at, updated_by)
       VALUES ($1, $2, NOW(), $3)
       ON CONFLICT (config_key) DO UPDATE
       SET config_value = EXCLUDED.config_value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
      [key, JSON.stringify(value), userId]
    );
    
    // Invalidate cache
    this.cache.delete(key);
  }

  async getAllByCategory(category: string): Promise<Record<string, any>> {
    const result = await pool.query(
      'SELECT config_key, config_value FROM configuration WHERE category = $1',
      [category]
    );
    
    const configs: Record<string, any> = {};
    for (const row of result.rows) {
      configs[row.config_key] = row.config_value;
    }
    
    return configs;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const configService = new ConfigService();