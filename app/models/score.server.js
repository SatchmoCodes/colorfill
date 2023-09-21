import {prisma} from '~/db.server'

export function getAllScores({ userId }) {
    return prisma.scores.findMany({
        where: { userId },
        select: { id: true, gamemode: true, score: true, boardId: true, boardSize: true},
        orderBy: { score: "asc"}
    })
}

export function getScoreList({ userId }) {
    return prisma.scores.findMany({
        where: { userId, gamemode: 'Free Play' },
        select: { id: true, gamemode: true, score: true, boardId: true, boardSize: true, userName: true},
        orderBy: { score: "asc"},
        take: 100
    })  
}

export function getQueryResult({ gamemode, size, order }) {
    return prisma.scores.findMany({
        where: { gamemode: gamemode, boards: {
            size: size
        } },
        select: { id: true, gamemode: true, score: true, boardId: true, boardSize: true, userName: true},
        orderBy: { score: order},
        take: 100
    })
}

export function getUserQueryResult({ username, gamemode, size, order }) {
    return prisma.scores.findMany({
        where: { gamemode: gamemode, boards: {
            size: size
        }, user: {
            username: {
                startsWith: username
            }
        } },
        select: { id: true, gamemode: true, score: true, boardId: true, boardSize: true, userName: true},
        orderBy: { score: order},
        take: 100
    })
}

export function createScore({score, gamemode, turnlog, userId, boardId, boardSize, userName}) {
    return prisma.scores.create({
        data: {
            score,
            gamemode,
            turnlog,
            user: {
                connect: {
                    id: userId,
                    username: userName
                },
            },
            boards: {
                connect: {
                    id: boardId,
                    size: boardSize
                },
            },
        }
    })
}

export function getBestScore({ userId, size, gamemode }) {
    return prisma.scores.findFirst({
        select: { score: true },
        where: { userId, boardSize: size, gamemode: gamemode},
        orderBy: { score: 'asc'}
    })
}