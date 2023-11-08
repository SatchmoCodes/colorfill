import {prisma} from '~/db.server'

export function createPVPScore({ score, userId, userName, gameId }) {
    return prisma.PVPScores.create({
        data: {
            score,
            user: {
                connect: {
                    id: userId,
                    username: userName
                },
            },
            gameSession: {
                connect: {
                    id: gameId
                }
            }
        }
    })
}

export function getPVPScore({ }) {
    return prisma.PVPScores.findMany({

    })
}

export function groupPVPWins() {
    return prisma.PVPScores.groupBy({
        by: ['userName'],
        where: {
            score: 'Win',
        },
        _count: {
            score: true
        },
    })
}

export function groupPVPLosses() {
    return prisma.PVPScores.groupBy({
        by: ['userName'],
        where: {
            score: 'Win',
        },
        _count: {
            score: true
        }
    })
}

export function getPVPUsers() {
    return prisma.PVPScores.findMany({
        select: { userName: true }
    })
}

export function groupPVPGames() {
    return prisma.PVPScores.groupBy({
        by: ['userName', 'score'],
    })
}

export function countPVPWins() {
    return prisma.PVPScores.count({
        select: {
            _all: true,
            score: true
        },
        where: {
            score: 'Win'
        }
    })
}