/*
  Warnings:

  - A unique constraint covering the columns `[id,username]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "Scores" (
    "id" TEXT NOT NULL,
    "score" TEXT NOT NULL,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gamemode" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "boardSize" TEXT NOT NULL,
    CONSTRAINT "Scores_userId_userName_fkey" FOREIGN KEY ("userId", "userName") REFERENCES "User" ("id", "username") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Scores_boardId_boardSize_fkey" FOREIGN KEY ("boardId", "boardSize") REFERENCES "Boards" ("id", "size") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Boards" (
    "id" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "boardData" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    PRIMARY KEY ("id", "size"),
    CONSTRAINT "Boards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Scores_id_key" ON "Scores"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Boards_id_key" ON "Boards"("id");

-- CreateIndex
CREATE UNIQUE INDEX "User_id_username_key" ON "User"("id", "username");
