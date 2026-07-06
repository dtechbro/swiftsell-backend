import { pool } from "../db/client";
import { decrypt } from "./encryption";

const NOMBA_BASE = "https://sandbox.nomba.com/v1"; // swap to api.nomba.com for live, confirm exact sandbox host in your docs/dashboard

interface VendorNombaCreds {
  clientId: string;
  clientSecret: string;
  accountId: string;
  subAccountId: string;
}

interface NombaAuthResponse {
  access_token: string;
  expires_in: number;
}

interface NombaCheckoutResponse {
  data: {
    checkoutLink: string;
    orderReference: string;
  };
}

async function getVendorCreds(vendorId: string): Promise<VendorNombaCreds> {
  const { rows } = await pool.query(
    `SELECT nomba_client_id, nomba_client_secret_encrypted, nomba_account_id, nomba_sub_account_id
     FROM vendors WHERE id = $1`,
    [vendorId],
  );
  const row = rows[0];
  if (!row?.nomba_client_id)
    throw new Error(`Vendor ${vendorId} has no Nomba credentials configured`);
  if (!row?.nomba_sub_account_id)
    throw new Error(
      `Vendor ${vendorId} has no Nomba sub-account ID configured`,
    );

  return {
    clientId: row.nomba_client_id,
    clientSecret: decrypt(row.nomba_client_secret_encrypted),
    accountId: row.nomba_account_id,
    subAccountId: row.nomba_sub_account_id,
  };
}

// simple in-memory token cache per vendor — fine for hackathon scale, revisit if you outgrow single-instance deploy
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function getAccessToken(creds: VendorNombaCreds): Promise<string> {
  const cached = tokenCache.get(creds.accountId);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const res = await fetch(`${NOMBA_BASE}/auth/token/issue`, {
    method: "POST",
    headers: { "Content-Type": "application/json", accountId: creds.accountId },
    body: JSON.stringify({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Nomba auth failed:", res.status, errorText);
    throw new Error(`Nomba auth failed: ${res.status} - ${errorText}`);
  }
  const data = (await res.json()) as NombaAuthResponse;
  tokenCache.set(creds.accountId, {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  });
  return data.access_token;
}

export async function createCheckoutOrder(params: {
  vendorId: string;
  orderReference: string;
  amount: number;
  customerEmail?: string;
}): Promise<{ checkoutLink: string; orderReference: string } | null> {
  const creds = await getVendorCreds(params.vendorId);
  const token = await getAccessToken(creds);

  const res = await fetch(`${NOMBA_BASE}/checkout/order`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      accountId: creds.accountId,
    },
    body: JSON.stringify({
      order: {
        orderReference: params.orderReference,
        amount: params.amount.toFixed(2),
        currency: "NGN",
        callbackUrl: `${process.env.BASE_URL}/payment-complete`,
        customerEmail: params.customerEmail ?? "buyer@example.com",
        accountId: creds.subAccountId,
      },

      // order req from documentation
      // order: {
      //   callbackUrl: 'https://ip:port/merchant.com/callback',
      //   customerEmail: 'abcde@gmail.com',
      //   amount: '10000.00',
      //   currency: 'NGN',
      //   orderReference: '90e81e8a-bc14-4ebf-89c0-57da752cca58',
      //   customerId: '762878332454',
      // }
    }),
  });

  if (!res.ok) {
    console.error("Nomba checkout order failed:", await res.text());
    return null;
  }

  const data = (await res.json()) as NombaCheckoutResponse;
  return data?.data?.checkoutLink && data?.data?.orderReference
    ? {
        checkoutLink: data.data.checkoutLink,
        orderReference: data.data.orderReference,
      }
    : null; // confirm exact field name against a real sandbox response
}
