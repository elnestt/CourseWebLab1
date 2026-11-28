import { prisma } from '../db.js';
import { cache } from '../utils/cache.js';

const ALLOWED_SORT_FIELDS = ['id', 'title', 'releaseYear', 'createdAt'];

export const gameModel = {
  async findAll({
    page = 1,
    limit = 10,
    search,
    genreId,
    minYear,
    maxYear,
    sortBy = 'createdAt',
    order = 'desc',
  } = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
    const safeSort = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : 'createdAt';
    const safeOrder = order === 'asc' ? 'asc' : 'desc';

    const cacheKey = `games:list:${JSON.stringify({
      safePage,
      safeLimit,
      search: search || '',
      genreId: genreId || '',
      minYear: minYear || '',
      maxYear: maxYear || '',
      safeSort,
      safeOrder,
    })}`;

    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const where = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { developer: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (genreId) where.genreId = Number(genreId);
    if (minYear || maxYear) {
      where.releaseYear = {};
      if (minYear) where.releaseYear.gte = Number(minYear);
      if (maxYear) where.releaseYear.lte = Number(maxYear);
    }

    const skip = (safePage - 1) * safeLimit;

    // Eager Loading: завантажуємо genre та лічильники без N+1 запитів
    const [items, total] = await Promise.all([
      prisma.game.findMany({
        where,
        include: {
          genre: { select: { id: true, name: true, slug: true } },
          _count: { select: { logs: true, reviews: true } },
        },
        orderBy: { [safeSort]: safeOrder },
        skip,
        take: safeLimit,
      }),
      prisma.game.count({ where }),
    ]);

    const result = {
      data: items,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
        hasMore: safePage * safeLimit < total,
      },
    };

    cache.set(cacheKey, result, 30);
    return result;
  },

  async findById(id) {
    const numId = Number(id);
    const cacheKey = `games:item:${numId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const game = await prisma.game.findUnique({
      where: { id: numId },
      include: {
        genre: true,
        reviews: {
          include: { user: { select: { id: true, username: true, avatar: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: { select: { logs: true, reviews: true } },
      },
    });

    if (!game) return null;

    // Оптимізований агрегований SQL-запит для статистики рейтингу гри
    const [stats] = await prisma.$queryRaw`
      SELECT
        COALESCE(ROUND(AVG("rating")::numeric, 2), 0)::float AS "averageRating",
        COUNT(*)::int AS "reviewsTotal"
      FROM "Review"
      WHERE "gameId" = ${numId}
    `;

    const enriched = {
      ...game,
      stats: stats || { averageRating: 0, reviewsTotal: 0 },
    };

    cache.set(cacheKey, enriched, 30);
    return enriched;
  },

  async create(data) {
    const created = await prisma.game.create({
      data,
      include: {
        genre: { select: { id: true, name: true, slug: true } },
        _count: { select: { logs: true, reviews: true } },
      },
    });
    cache.invalidatePrefix('games:');
    return created;
  },

  async update(id, data) {
    const updated = await prisma.game.update({
      where: { id: Number(id) },
      data,
      include: {
        genre: { select: { id: true, name: true, slug: true } },
        _count: { select: { logs: true, reviews: true } },
      },
    });
    cache.invalidatePrefix('games:');
    return updated;
  },

  async delete(id) {
    const deleted = await prisma.game.delete({
      where: { id: Number(id) },
    });
    cache.invalidatePrefix('games:');
    return deleted;
  },
};