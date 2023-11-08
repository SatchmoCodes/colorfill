import bcrypt from "bcryptjs";

import { prisma } from "~/db.server";

export async function getUserById( id ) {
  return prisma.user.findUnique({ where: { id }, select: {username: true, id: true}},);
}

export function getUserNameById({ id }) {
  return prisma.user.findUnique({
    where: {id: id},
    select: {username: true}
  })
}

export function getAllUsers() {
  return prisma.user.findMany()
}

export async function getUserList(id) {
  return prisma.user.findMany({ where: { id } })
}

export async function getUserByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

export async function getUserByUsername(username) {
  return prisma.user.findUnique({ where: { username }, select: { id: true, username: true}})
}

export function getAllUserGames() {
  return prisma.user.findMany({
    select: { username: true, wins: true, losses: true, winStreak: true},
  })
}

export function getUserStats({ id }) {
  return prisma.user.findUnique({
    where: { id },
    select: { username: true, wins: true, losses: true, bestWinStreak: true}
  })
}

export function getSearchGames({ username }) {
  return prisma.user.findMany({
    select: { username: true, wins: true, losses: true, winStreak: true},
    where: { username: {
      startsWith: username
    }}
  })
}

export function getBestWinStreak({ id }) {
  return prisma.user.findUnique({
    where: { id },
    select: { bestWinStreak: true}
  })
}

export async function createUser(username, password) {
  const hashedPassword = await bcrypt.hash(password, 10);

  return prisma.user.create({
    data: {
      username,
      wins: 0,
      losses: 0,
      winStreak: 0,
      bestWinStreak: 0,
      password: {
        create: {
          hash: hashedPassword,
        },
      },
    },
  });
}

export function updateUserWins({ id }) {
  return prisma.user.update({
    where: { id },
    data: {
      wins: {
        increment: 1
      }
    }
  })
}

export function updateUserLosses({ id }) {
  return prisma.user.update({
    where: { id },
    data: {
      losses: {
        increment: 1
      }
    }
  })
}

export function updateUserWinStreak({ id }) {
  return prisma.user.update({
    where: { id },
    data: {
      winStreak: {
        increment: 1
      }
    }
  })
}

export function updateBestWinStreak({ id, bestWinStreak }) {
  return prisma.user.update({
    where: { id },
    data: {
      bestWinStreak: bestWinStreak
    }
  })
}

export function resetUserWinStreak({ id }) {
  return prisma.user.update({
    where: { id },
    data: {
      winStreak: 0,
    },
  })
}

export async function deleteUserByEmail(email) {
  return prisma.user.delete({ where: { email } });
}

export async function verifyLogin(username, password) {
  const userWithPassword = await prisma.user.findUnique({
    where: { username },
    include: {
      password: true,
    },
  });

 
  if (!userWithPassword || !userWithPassword.password) {
    return null;
  }

  const isValid = await bcrypt.compare(
    password,
    userWithPassword.password.hash
  );

  if (!isValid) {
    return null;
  }

  const { password: _password, ...userWithoutPassword } = userWithPassword;

  return userWithoutPassword;
}
