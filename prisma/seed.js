import { prisma } from '../src/db.js';

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'denys@gametracker.ua' },
    update: {},
    create: {
      email: 'denys@gametracker.ua',
      password: 'temp_password_hash_lab1',
      username: 'elnest',
      bio: 'Поціновувач Souls-like та інді-розробник на Unreal Engine 5',
      role: 'ADMIN',
    },
  });

  const soulsGenre = await prisma.genre.upsert({
    where: { slug: 'souls-like' },
    update: {},
    create: {
      name: 'Souls-like',
      slug: 'souls-like',
      description: 'Хардкорні Action-RPG з глибоким лором та вивіреною бойовою системою',
    },
  });

  const rpgGenre = await prisma.genre.upsert({
    where: { slug: 'action-rpg' },
    update: {},
    create: {
      name: 'Action RPG',
      slug: 'action-rpg',
      description: 'Рольові ігри у відкритому світі з динамічними боями',
    },
  });

  const bloodOfDawn = await prisma.game.upsert({
    where: { slug: 'blood-of-dawn' },
    update: {},
    create: {
      title: 'Blood of Dawn',
      slug: 'blood-of-dawn',
      developer: 'FairInteractive',
      releaseYear: 2026,
      description: 'Похмура dark-fantasy Souls-like гра на Unreal Engine 5',
      systemReqs: { gpu: 'RTX 3060 / RTX 4070', ram: '16 GB', storage: '15 GB' },
      genreId: soulsGenre.id,
    },
  });

  const eldenRing = await prisma.game.upsert({
    where: { slug: 'elden-ring' },
    update: {},
    create: {
      title: 'Elden Ring',
      slug: 'elden-ring',
      developer: 'FromSoftware',
      releaseYear: 2022,
      description: 'Епічна темна фентезі Action-RPG у Междузем’ї',
      systemReqs: { gpu: 'GTX 1070 / RTX 3070', ram: '16 GB', storage: '60 GB' },
      genreId: rpgGenre.id,
    },
  });

  await prisma.gameLog.upsert({
    where: { userId_gameId: { userId: user.id, gameId: eldenRing.id } },
    update: {},
    create: {
      userId: user.id,
      gameId: eldenRing.id,
      status: 'COMPLETED',
      rating: 9.8,
      hoursPlayed: 145,
      platform: 'PC',
      optimizationTag: '60 FPS Ultra 2K',
    },
  });

  console.log('Seed завершено:', { userId: user.id, games: [bloodOfDawn.title, eldenRing.title] });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());