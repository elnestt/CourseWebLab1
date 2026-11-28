import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.ts';
import { metrics } from './utils/metrics.js';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = new PrismaClient({
  adapter,
  log: [{ emit: 'event', level: 'query' }],
});

prisma.$on('query', (e) => {
  metrics.recordSlowQuery(e.query, e.duration);
  if (process.env.LOG_QUERIES === 'true' || e.duration >= 100) {
    console.log(`[Prisma Query ${e.duration}ms] ${e.query}`);
  }
});