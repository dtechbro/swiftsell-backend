import { pool } from "../db/client";
import { encrypt } from "../services/encryption";
import dotenv from "dotenv";
dotenv.config();

async function run() {
  const encryptedSecret = encrypt(process.env.NOMBA_CLIENT_SECRET!);
  const result = await pool.query(
    `UPDATE vendors SET nomba_client_id = $1, nomba_client_secret_encrypted = $2, nomba_account_id = $3, nomba_sub_account_id = $4
      WHERE nomba_client_id = $1 OR nomba_client_id IS NULL`,
    [
      process.env.NOMBA_CLIENT_ID,
      encryptedSecret,
      process.env.NOMBA_ACCOUNT_ID,
      process.env.NOMBA_SUB_ACCOUNT_ID,
    ],
  );
  console.log(`Seeded Nomba credentials for ${result.rowCount} vendor(s).`);
  process.exit(0);
}

run();
