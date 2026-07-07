import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

if (!process.env.CREDENTIAL_ENCRYPTION_KEY) {
  throw new Error("CREDENTIAL_ENCRYPTION_KEY environment variable is not set");
}

const KEY = Buffer.from(process.env.CREDENTIAL_ENCRYPTION_KEY, "hex"); // 32 bytes
if (KEY.length !== 32) {
  throw new Error(
    "CREDENTIAL_ENCRYPTION_KEY must be a 64-character hex string",
  );
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  // pack iv + authTag + ciphertext together, base64, so it's one column value
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decrypt(packed: string): string {
  const buf = Buffer.from(packed, "base64");
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
}
