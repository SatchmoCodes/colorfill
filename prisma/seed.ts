import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seed() {

  // cleanup the existing database
  await prisma.user.deleteMany().catch(() => {
    // no worries if it doesn't exist yet
  });


  const userPassword = 'racheliscool'

  const user = await prisma.user.create({
    data: {
      username: 'Satchmo',
      wins: 0,
      losses: 0,
      winStreak: 0,
      bestWinStreak: 0,
      password: {
        create: {
          hash: await bcrypt.hash(userPassword, 10),
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      username: 'john',
      wins: 0,
      losses: 0,
      winStreak: 0,
      bestWinStreak: 0,
      password: {
        create: {
          hash: await bcrypt.hash(userPassword, 10),
        },
      },
    },
  });

  await prisma.note.create({
    data: {
      title: "My first note",
      body: "Hello, world!",
      userId: user.id,
    },
  });

  await prisma.note.create({
    data: {
      title: "My second note",
      body: "Hello, world!",
      userId: user.id,
    },
  });

  await prisma.boards.create({
    data: {
      size: 'Medium',
      boardData: '123451234',
      userId: user.id
    }
  })

  console.log(`Database has been seeded. 🌱`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
