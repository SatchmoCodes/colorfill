import { prisma } from "~/db.server";

export function getSize({ boardId }) {
    return prisma.boards.findFirst({
        select: { size: true },
        where: { boardId }
    })
}

export function getBoard({ id }) {
    return prisma.boards.findFirst({
        select: { id: true, size: true, boardData: true, Scores: true}, 
        where: { id }
    })
}


export function getRecentBoard({ id }) {
    return prisma.boards.findFirst({
        select: { id: true, size: true, boardData: true, Scores: true },
        orderBy: { createdAt: 'desc'},
        where: { 
            id, 
            }
    })
}

export function createBoard({ size, boardData, userId}) {
    return prisma.boards.create({
        data: {
            size,
            boardData,
            user: {
                connect: {
                    id: userId
                }
            }
        }
    })
}