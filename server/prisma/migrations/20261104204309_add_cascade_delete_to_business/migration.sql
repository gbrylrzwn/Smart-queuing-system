-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_businessId_fkey";

-- DropForeignKey
ALTER TABLE "Service" DROP CONSTRAINT "Service_businessId_fkey";

-- DropForeignKey
ALTER TABLE "WorkingHours" DROP CONSTRAINT "WorkingHours_businessId_fkey";

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkingHours" ADD CONSTRAINT "WorkingHours_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
