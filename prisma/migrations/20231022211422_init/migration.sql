/*
  Warnings:

  - Added the required column `code` to the `GameSession` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GameSession" (
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
    "code" TEXT NOT NULL,
    "squareGrowth" TEXT NOT NULL,
    "turn" TEXT NOT NULL,
    "ownerScore" INTEGER NOT NULL,
    "opponentScore" INTEGER NOT NULL,
    "winner" TEXT NOT NULL,
    "loser" TEXT NOT NULL,
    "turnLog" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GameSession_boardId_boardSize_boardData_fkey" FOREIGN KEY ("boardId", "boardSize", "boardData") REFERENCES "Boards" ("id", "size", "boardData") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GameSession_ownerName_fkey" FOREIGN KEY ("ownerName") REFERENCES "User" ("username") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GameSession_opponentName_fkey" FOREIGN KEY ("opponentName") REFERENCES "User" ("username") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_GameSession" ("boardData", "boardId", "boardSize", "boardState", "boardType", "createdAt", "gameState", "gameType", "id", "loser", "opponentName", "opponentScore", "ownerName", "ownerScore", "squareGrowth", "turn", "turnLog", "updatedAt", "winner") SELECT "boardData", "boardId", "boardSize", "boardState", "boardType", "createdAt", "gameState", "gameType", "id", "loser", "opponentName", "opponentScore", "ownerName", "ownerScore", "squareGrowth", "turn", "turnLog", "updatedAt", "winner" FROM "GameSession";
DROP TABLE "GameSession";
ALTER TABLE "new_GameSession" RENAME TO "GameSession";
CREATE UNIQUE INDEX "GameSession_id_key" ON "GameSession"("id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
