import { prisma } from "~/db.server";

export function createGameSession({ownerName, opponentName, boardId, boardSize, boardData, gameState, boardState, squareGrowth, boardType, gameType, turn, ownerScore, opponentScore, turnLog}) {
    return prisma.gameSession.create({
        data: {
            gameState,
            boardState,
            squareGrowth,
            boardType,
            gameType,
            turn,
            ownerScore,
            opponentScore,
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
        where: {gameState: gameState},
        select: { id: true, gameState: true, boardType: true, boardSize: true, squareGrowth: true, ownerName: true, opponentName: true, gameType: true, turn: true},
        orderBy: {createdAt: 'asc'}
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
        select: { id: true, gameState: true, boardType: true, boardSize: true, boardState: true, squareGrowth: true, boardData: true, ownerName: true, opponentName: true, ownerScore: true, opponentScore: true, gameType: true, turn: true},
    })
}

export function findExistingSession({ ownerName }) {
    return prisma.gameSession.findFirst({
        where: { ownerName }
    })
}

export function updateUserInSession({ id, opponentName}) {
    return prisma.gameSession.update({
        where: { id },
        data: {
            opponentName: opponentName
        }
    })
}

export function updateBoardStateOwner({ id, boardState, squareGrowth, turn, ownerScore}) {
    return prisma.gameSession.update({
        where: {id },
        data: {
            boardState: boardState,
            squareGrowth: squareGrowth,
            turn: turn,
            ownerScore: {
                increment: ownerScore
            }
        }
    })
}

export function updateBoardStateOpponent({ id, boardState, squareGrowth, turn, opponentScore}) {
    return prisma.gameSession.update({
        where: {id },
        data: {
            boardState: boardState,
            squareGrowth: squareGrowth,
            turn: turn,
            opponentScore: {
                increment: opponentScore
            }
        }
    })
}