export interface Vendor {
  id: string;
  owner_telegram_id: number;
  business_name: string | null;
  telegram_bot_token: string | null;
  telegram_bot_username: string | null;
  owner_phone: string | null;
  phone_verified_at: string | null;
  status: "onboarding" | "active" | "disabled";
  created_at: string;
}

export type OnboardingStep =
  | "AWAITING_BUSINESS_NAME"
  | "AWAITING_BOT_TOKEN"
  | "AWAITING_PHONE"
  // | "AWAITING_SHEET_URL"
  | "AWAITING_CATALOG"
  | "DONE";

export interface OnboardingState {
  step: OnboardingStep;
  vendorId?: string;
}

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  username: string;
  first_name: string;
}

export type BuyerStep = "BROWSING" | "AWAITING_CHECKOUT_EMAIL";

export interface BuyerSessionState {
  step: BuyerStep;
  buyerId: string;
  cartId?: string;
  // last search results shown, so "add the first one" or a button tap can resolve to a product
  lastShownProductIds?: string[];
  pendingCheckout?: boolean; // true while we're mid-way collecting email before generating the link
}
