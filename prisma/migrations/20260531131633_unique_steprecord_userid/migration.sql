/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `StepRecord` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "StepRecord_userId_key" ON "StepRecord"("userId");
