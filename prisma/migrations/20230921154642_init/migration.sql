/*
  Warnings:

  - You are about to alter the column `score` on the `Scores` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.
  - Added the required column `turnlog` to the `Scores` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Scores" (
    "id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gamemode" TEXT NOT NULL,
    "turnlog" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "boardSize" TEXT NOT NULL,
    CONSTRAINT "Scores_userId_userName_fkey" FOREIGN KEY ("userId", "userName") REFERENCES "User" ("id", "username") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Scores_boardId_boardSize_fkey" FOREIGN KEY ("boardId", "boardSize") REFERENCES "Boards" ("id", "size") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Scores" ("boardId", "boardSize", "completedAt", "gamemode", "id", "score", "userId", "userName") SELECT "boardId", "boardSize", "completedAt", "gamemode", "id", "score", "userId", "userName" FROM "Scores";
DROP TABLE "Scores";
ALTER TABLE "new_Scores" RENAME TO "Scores";
CREATE UNIQUE INDEX "Scores_id_key" ON "Scores"("id");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
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
