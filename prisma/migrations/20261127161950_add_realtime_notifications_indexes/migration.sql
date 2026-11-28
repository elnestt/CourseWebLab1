-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('GAME_ADDED', 'REVIEW_POSTED', 'LOG_MILESTONE', 'SYSTEM_ALERT');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM_ALERT',
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocketEvent" (
    "id" SERIAL NOT NULL,
    "room" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocketEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_priority_idx" ON "Notification"("priority");

-- CreateIndex
CREATE INDEX "SocketEvent_room_id_idx" ON "SocketEvent"("room", "id");

-- CreateIndex
CREATE INDEX "SocketEvent_createdAt_idx" ON "SocketEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "Game_genreId_releaseYear_idx" ON "Game"("genreId", "releaseYear");

-- CreateIndex
CREATE INDEX "Game_title_idx" ON "Game"("title");

-- CreateIndex
CREATE INDEX "Game_createdAt_idx" ON "Game"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "GameLog_userId_status_idx" ON "GameLog"("userId", "status");

-- CreateIndex
CREATE INDEX "GameLog_gameId_rating_idx" ON "GameLog"("gameId", "rating");

-- CreateIndex
CREATE INDEX "GameLog_createdAt_idx" ON "GameLog"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Review_gameId_createdAt_idx" ON "Review"("gameId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Review_rating_idx" ON "Review"("rating");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
