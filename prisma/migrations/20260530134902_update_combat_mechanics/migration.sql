-- CreateEnum
CREATE TYPE "CombatAction" AS ENUM ('ATTACK', 'FLEE', 'USE_ITEM');

-- AlterTable
ALTER TABLE "Battle" ADD COLUMN     "sessionId" TEXT;

-- CreateTable
CREATE TABLE "CombatSession" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "enemyId" TEXT NOT NULL,
    "status" "BattleStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CombatSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CombatSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombatSession" ADD CONSTRAINT "CombatSession_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombatSession" ADD CONSTRAINT "CombatSession_enemyId_fkey" FOREIGN KEY ("enemyId") REFERENCES "Enemy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
