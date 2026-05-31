-- CreateEnum
CREATE TYPE "ClassBonus" AS ENUM ('WARRIOR', 'SCOUT', 'DOUBLE_STRIKE', 'MONK_REGEN');

-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "classId" TEXT;

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "baseHp" INTEGER NOT NULL,
    "baseAttack" INTEGER NOT NULL,
    "baseDefense" INTEGER NOT NULL,
    "hpPerLevel" INTEGER NOT NULL,
    "attackPerLevel" INTEGER NOT NULL,
    "defensePerLevel" INTEGER NOT NULL,
    "bonus" "ClassBonus" NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Class_name_key" ON "Class"("name");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;
