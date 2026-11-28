import { cache } from './cache.js';
import { jobQueue } from './queue.js';

export const metrics = {
  startedAt: new Date().toISOString(),
  httpRequestsTotal: 0,
  httpErrorsTotal: 0,
  dbQueriesTotal: 0,
  slowQueries: [],
  wsEventsEmitted: 0,
  wsRateLimitHits: 0,

  recordSlowQuery(query, durationMs) {
    this.dbQueriesTotal += 1;
    if (durationMs >= 50) {
      this.slowQueries.push({
        query: query.slice(0, 200),
        durationMs: Number(durationMs.toFixed(2)),
        timestamp: new Date().toISOString(),
      });
      if (this.slowQueries.length > 20) {
        this.slowQueries.shift();
      }
    }
  },

  snapshot(io) {
    const mem = process.memoryUsage();
    return {
      status: 'healthy',
      uptimeSeconds: Math.floor(process.uptime()),
      startedAt: this.startedAt,
      memory: {
        rssMb: Number((mem.rss / 1024 / 1024).toFixed(2)),
        heapUsedMb: Number((mem.heapUsed / 1024 / 1024).toFixed(2)),
      },
      http: {
        requestsTotal: this.httpRequestsTotal,
        errorsTotal: this.httpErrorsTotal,
      },
      database: {
        queriesLogged: this.dbQueriesTotal,
        slowQueriesCount: this.slowQueries.length,
        recentSlowQueries: this.slowQueries.slice(-5),
      },
      websocket: {
        connectedSockets: io ? io.engine.clientsCount : 0,
        eventsEmitted: this.wsEventsEmitted,
        rateLimitHits: this.wsRateLimitHits,
      },
      cache: cache.stats(),
      queue: jobQueue.stats(),
    };
  },
};