export interface JwtPayload {
  userId: string;
  role: "ADMIN" | "VENDOR" | "CUSTOMER";
}
