import { createClient } from 'redis';

class CacheService {
  constructor() {
    this.store = new Map();
    this.hits = 0;
    this.misses = 0;
    this.redisClient = null;
    this.redisReady = false;

    if (process.env.REDIS_URL) {
      this._initRedis(process.env.REDIS_URL);
    }
  }

  async _initRedis(url) {
    try {
      const client = createClient({ url });
      client.on('error', () => {
        this.redisReady = false;
      });
      client.on('ready', () => {
        this.redisReady = true;
      });
      await client.connect();
      this.redisClient = client;
      this.redisReady = true;
    } catch {
      this.redisReady = false;
    }
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses += 1;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses += 1;
      return null;
    }
    this.hits += 1;
    return entry.value;
  }

  set(key, value, ttlSeconds = 60) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });

    if (this.redisReady && this.redisClient) {
      this.redisClient
        .set(`cache:${key}`, JSON.stringify(value), { EX: ttlSeconds })
        .catch(() => {});
    }
  }

  invalidatePrefix(prefix) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }

    if (this.redisReady && this.redisClient) {
      this.redisClient
        .keys(`cache:${prefix}*`)
        .then((keys) => {
          if (keys.length > 0) {
            return this.redisClient.del(keys);
          }
        })
        .catch(() => {});
    }
  }

  clear() {
    this.store.clear();

    if (this.redisReady && this.redisClient) {
      this.redisClient
        .keys('cache:*')
        .then((keys) => {
          if (keys.length > 0) {
            return this.redisClient.del(keys);
          }
        })
        .catch(() => {});
    }
  }

  stats() {
    return {
      backend: this.redisReady ? 'redis+memory' : 'memory',
      keysCount: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate:
        this.hits + this.misses > 0
          ? `${((this.hits / (this.hits + this.misses)) * 100).toFixed(1)}%`
          : '0%',
    };
  }
}

export const cache = new CacheService();