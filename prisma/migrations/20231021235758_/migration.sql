/*
  Warnings:

  - Added the required column `loser` to the `GameSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `winner` to the `GameSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bestWinStreak` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `losses` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `winStreak` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wins` to the `User` table without a default value. This is not possible if the table is not empty.

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
INSERT INTO "new_GameSession" ("boardData", "boardId", "boardSize", "boardState", "boardType", "createdAt", "gameState", "gameType", "id", "opponentName", "opponentScore", "ownerName", "ownerScore", "squareGrowth", "turn", "turnLog", "updatedAt") SELECT "boardData", "boardId", "boardSize", "boardState", "boardType", "createdAt", "gameState", "gameType", "id", "opponentName", "opponentScore", "ownerName", "ownerScore", "squareGrowth", "turn", "turnLog", "updatedAt" FROM "GameSession";
DROP TABLE "GameSession";
ALTER TABLE "new_GameSession" RENAME TO "GameSession";
CREATE UNIQUE INDEX "GameSession_id_key" ON "GameSession"("id");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "wins" INTEGER NOT NULL,
    "losses" INTEGER NOT NULL,
    "winStreak" INTEGER NOT NULL,
    "bestWinStreak" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "id", "updatedAt", "username") SELECT "createdAt", "id", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_id_username_key" ON "User"("id", "username");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
