import { prisma } from "~/db.server";

export function createGameSession({ownerName, opponentName, boardId, boardSize, boardData, gameState, boardState, squareGrowth, boardType, gameType, code, turn, ownerScore, opponentScore, winner, loser, turnLog}) {
    return prisma.gameSession.create({
        data: {
            gameState,
            boardState,
            squareGrowth,
            boardType,
            gameType,
            code,
            turn,
            ownerScore,
            opponentScore,
            winner,
            loser,
            turnLog,
            owner: {
                connect: {
                    username: ownerName
                }
            },
            opponent: {
                connect: {
                    username: ownerName
                }
            },
            boards: {
                connect: {
                    id: boardId,
                    size: boardSize,
                    boardData: boardData
                }
            }
        }
    })
}

export function getGameSession({ gameState }) {
    return prisma.gameSession.findMany({
        where: {gameState: gameState, NOT: { gameType: 'Private'}},
        select: { id: true, gameState: true, boardType: true, boardSize: true, squareGrowth: true, ownerName: true, opponentName: true, gameType: true, turn: true, createdAt: true},
        orderBy: {createdAt: 'asc'}
    })
}

export function getAllGameSessions() {
    return prisma.gameSession.findMany({
        where: { OR: [
            { gameState: 'Waiting' },
            { gameState: 'Playing' }
        ], NOT: { gameType: 'Private'}},
        select: { id: true, gameState: true, boardType: true, boardSize: true, squareGrowth: true, ownerName: true, opponentName: true, gameType: true, turn: true, createdAt: true},
        orderBy: {createdAt: 'asc'}
    })
}

export function getWaitingSessions() {
    return prisma.gameSession.findMany({
        where: {gameState: 'Waiting'},
        select: { id: true, gameState: true, code: true}
    })
}

export function getRecentGameSession({ gameState }) {
    return prisma.gameSession.findFirst({
        where: {gameState: gameState},
        select: { id: true, gameState: true, boardType: true, boardSize: true, ownerName: true, opponentName: true, gameType: true},
        orderBy: {createdAt: 'asc'}
    })
}

export function getGameSessionById({ id }) {
    return prisma.gameSession.findUnique({
        where: {id},
        select: { id: true, gameState: true, boardType: true, boardSize: true, boardState: true, squareGrowth: true, boardData: true, ownerName: true, opponentName: true, ownerScore: true, opponentScore: true, gameType: true, code: true, turn: true, turnLog: true, winner: true, loser: true, updatedAt: true},
    })
}

export function findExistingSession({ ownerName }) {
    return prisma.gameSession.findFirst({
        where: { ownerName }
    })
}

export function updateUserInSession({ id, opponentName, gameState}) {
    return prisma.gameSession.update({
        where: { id },
        data: {
            opponentName: opponentName,
            gameState: gameState
        }
    })
}

export function updateUserLeavingSession({ id, gameState, opponentName}) {
    return prisma.gameSession.update({
        where: { id},
        data: {
            opponentName: opponentName,
            gameState: gameState
        }
    })
}

export function updateSessionState({ id, gameState }) {
    return prisma.gameSession.update({
        where: { id },
        data: {
            gameState: gameState
        }
    })
}

export function updateFinalSessionState({ id, winner, loser}) {
    return prisma.gameSession.update({
        where: { id },
        data: {
            winner: winner,
            loser: loser,
            gameState: 'Finished'
        }
    })
}

// export function updateGameLeaver({ id, gameState, leaver}) {
//     return prisma.gameSession.update({
//         where: { id },
//         data: {
//             gameState: gameState,
//             leaver: leaver
//         }
//     })
// }

export function updateBoardStateOwner({ id, boardState, squareGrowth, turn, turnLog, ownerScore}) {
    return prisma.gameSession.update({
        where: {id },
        data: {
            boardState: boardState,
            squareGrowth: squareGrowth,
            turn: turn,
            turnLog: turnLog,
            updatedAt: new Date(),
            ownerScore: {
                increment: ownerScore
            }
        }
    })
}

export function updateBoardStateOpponent({ id, boardState, squareGrowth, turn, turnLog, opponentScore}) {
    return prisma.gameSession.update({
        where: {id },
        data: {
            boardState: boardState,
            squareGrowth: squareGrowth,
            turn: turn,
            turnLog: turnLog,
            updatedAt: new Date(), 
            opponentScore: {
                increment: opponentScore
            }
        }
    })
}