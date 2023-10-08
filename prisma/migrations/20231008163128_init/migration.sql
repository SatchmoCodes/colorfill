/*
  Warnings:

  - A unique constraint covering the columns `[id,size,boardData]` on the table `Boards` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "opponentName" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "boardSize" TEXT NOT NULL,
    "boardData" TEXT NOT NULL,
    "gameState" TEXT NOT NULL,
    "boardState" TEXT NOT NULL,
    "boardType" TEXT NOT NULL,
    "gameType" TEXT NOT NULL,
    "squareGrowth" TEXT NOT NULL,
    "turn" TEXT NOT NULL,
    "ownerScore" INTEGER NOT NULL,
    "opponentScore" INTEGER NOT NULL,
    "turnLog" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameSession_boardId_boardSize_boardData_fkey" FOREIGN KEY ("boardId", "boardSize", "boardData") REFERENCES "Boards" ("id", "size", "boardData") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GameSession_ownerName_fkey" FOREIGN KEY ("ownerName") REFERENCES "User" ("username") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GameSession_opponentName_fkey" FOREIGN KEY ("opponentName") REFERENCES "User" ("username") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "GameSession_id_key" ON "GameSession"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Boards_id_size_boardData_key" ON "Boards"("id", "size", "boardData");
