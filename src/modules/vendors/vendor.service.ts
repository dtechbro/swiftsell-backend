import prisma from "@config/prisma";
import { VendorOnboardingInput } from "./vendor.validation";

export const getMyVendorProfile = async (userId: string) => {
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
      stores: true,
    },
  });

  if (!vendor) {
    throw new Error("Vendor profile not found.");
  }

  return vendor;
};

export const completeVendorOnboarding = async (
  userId: string,
  input: VendorOnboardingInput
) => {
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
  });

  if (!vendor) {
    throw new Error("Vendor profile not found.");
  }

  const updatedVendor = await prisma.vendor.update({
    where: { userId },
    data: {
      businessName: input.businessName,
      businessEmail: input.businessEmail,
      businessPhone: input.businessPhone,
      isOnboarded: true,
    },
  });

  return updatedVendor;
};