/*
import prisma from "@config/prisma";
import { generateAccessToken } from "./jwt";
import { comparePassword, hashPassword } from "./password";
import {
  AdminLoginInput,
  AdminRegisterInput,
  VendorLoginInput,
  VendorRegisterInput,
} from "./auth.validation";

export const registerVendor = async (input: VendorRegisterInput) => {
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: input.email },
        ...(input.phone ? [{ phone: input.phone }] : []),
      ],
    },
  });

  if (existingUser) {
    throw new Error("User with this email or phone already exists.");
  }

  const hashedPassword = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      phone: input.phone,
      password: hashedPassword,
      firstName: input.firstName,
      lastName: input.lastName,
      role: "VENDOR",
      vendor: {
        create: {
          businessName: input.businessName,
          businessEmail: input.businessEmail,
          businessPhone: input.businessPhone,
        },
      },
    },
    include: {
      vendor: true,
    },
  });

  const accessToken = generateAccessToken({
    userId: user.id,
    role: user.role,
  });

  const { password, ...safeUser } = user;

  return {
    user: safeUser,
    accessToken,
  };
};

export const loginVendor = async (input: VendorLoginInput) => {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { vendor: true },
  });

  if (!user || user.role !== "VENDOR") {
    throw new Error("Invalid vendor credentials.");
  }

  const passwordMatches = await comparePassword(input.password, user.password);

  if (!passwordMatches) {
    throw new Error("Invalid vendor credentials.");
  }

  const accessToken = generateAccessToken({
    userId: user.id,
    role: user.role,
  });

  const { password, ...safeUser } = user;

  return {
    user: safeUser,
    accessToken,
  };
};

export const registerAdmin = async (input: AdminRegisterInput) => {
  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (existingAdmin) {
    throw new Error("Admin registration is disabled.");
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: input.email },
        ...(input.phone ? [{ phone: input.phone }] : []),
      ],
    },
  });

  if (existingUser) {
    throw new Error("User with this email or phone already exists.");
  }

  const hashedPassword = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      phone: input.phone,
      password: hashedPassword,
      firstName: input.firstName,
      lastName: input.lastName,
      role: "ADMIN",
    },
  });

  const accessToken = generateAccessToken({
    userId: user.id,
    role: user.role,
  });

  const { password, ...safeUser } = user;

  return {
    user: safeUser,
    accessToken,
  };
};

export const loginAdmin = async (input: AdminLoginInput) => {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user || user.role !== "ADMIN") {
    throw new Error("Invalid admin credentials.");
  }

  const passwordMatches = await comparePassword(input.password, user.password);

  if (!passwordMatches) {
    throw new Error("Invalid admin credentials.");
  }

  const accessToken = generateAccessToken({
    userId: user.id,
    role: user.role,
  });

  const { password, ...safeUser } = user;

  return {
    user: safeUser,
    accessToken,
  };
};
*/
export {};

