-- CreateEnum
CREATE TYPE "BattleStatus" AS ENUM ('PENDING', 'WON', 'LOST');

-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "attack" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "defense" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "hp" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "maxHp" INTEGER NOT NULL DEFAULT 100;

-- CreateTable
CREATE TABLE "StepRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StepRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enemy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "hp" INTEGER NOT NULL,
    "attack" INTEGER NOT NULL,
    "defense" INTEGER NOT NULL,
    "goldReward" INTEGER NOT NULL,
    "expReward" INTEGER NOT NULL,
    "imageUrl" TEXT,

    CONSTRAINT "Enemy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Battle" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "enemyId" TEXT NOT NULL,
    "status" "BattleStatus" NOT NULL DEFAULT 'PENDING',
    "log" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Battle_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StepRecord" ADD CONSTRAINT "StepRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_enemyId_fkey" FOREIGN KEY ("enemyId") REFERENCES "Enemy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
