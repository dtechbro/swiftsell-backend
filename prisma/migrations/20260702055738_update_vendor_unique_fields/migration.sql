/*
  Warnings:

  - A unique constraint covering the columns `[businessEmail]` on the table `vendors` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[businessPhone]` on the table `vendors` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "vendors_businessEmail_key" ON "vendors"("businessEmail");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_businessPhone_key" ON "vendors"("businessPhone");
