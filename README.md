# ShiwftSell – Vendor-Owned Conversational Commerce on Telegram

SwiftSell is a hackathon MVP that lets retail vendors sell directly through Telegram.  
Each vendor has their own conversational storefront (Telegram bot) where customers can:
- Browse products
- Ask for items in natural language
- Add items to cart
- Pay via Nomba
- Receive order confirmation without waiting on vendor replies

The goal is to reduce sales friction and make buying as fast as a conversation.

---

## Problem Statement

Small retail vendors lose time and sales when customers must wait for manual replies to place an order.  
Buyers also experience friction when the purchase process is slow, confusing, or requires leaving the chat to complete payment.

## Solution

SwiftSell provides:
- A **Telegram-based bot storefront** for each vendor.
- **Automated sales handling**: product discovery, carting, and checkout happen in chat.
- **Nomba-powered payments**: checkout, payment processing, and webhook-based reconciliation.
- A **vendor back-office dashboard** (to be built fully) where vendors manage products, orders, and inventory.

---

## Hackathon Focus

This project is a Nomba-powered commerce integration that enables Telegram-based vendor storefronts to accept, process, and reconcile payments end-to-end.

---

## Tech Stack

- **Frontend**: React.js (landing page, vendor dashboard)
- **Backend**: Express + TypeScript
- **Database**: PostgreSQL (via Supabase)
- **Chat**: Telegram Bot API
- **Payments**: Nomba (Checkout, Webhooks, Order Reference)
- **Language**: TypeScript

---

## Architecture Overview

The system is structured around these core services:

1. **Vendor Onboarding Service**
   - Handles vendor registration via Telegram.
   - Collects phone number, business name, and store catalog.
   - Links Telegram identity to a vendor record.

2. **Catalog Service**
   - Stores products, prices, stock, and images.
   - Allows vendors to manage their catalog via dashboard or bot.

3. **Chat Commerce Engine**
   - Telegram bot that:
     - Greets buyers
     - Shows catalog browsing options
     - Matches natural language requests to products
     - Builds and manages cart state
     - Creates payment requests via Nomba

4. **Order Service**
   - Creates orders when a buyer finalizes a cart.
   - Generates Nomba payment links.
   - Tracks payment and fulfillment status.

5. **Payment & Reconciliation**
   - Integrates Nomba Checkout API.
   - Uses webhooks to verify payment success.
   - Ties each order to a Nomba payment reference.

6. **Vendor Dashboard**
   - A Next.js-based UI where vendors can:
     - Manage products
     - View orders and statuses
     - See payment and order history

---

## Core Flows

### Vendor Onboarding Flow

1. Vendor opens the Telegram bot.
2. Bot asks vendor to share their phone number (with consent).
3. Bot asks for store name and category.
4. Vendor adds products (via dashboard or CSV/manual entry).
5. Bot generates the vendor storefront identity.
6. Vendor shares the bot/store link with customers.

### Buyer Purchase Flow

1. Buyer opens the vendor bot.
2. Bot shows store intro and catalog browsing options.
3. Buyer types what they want in natural language.
4. Bot matches items, confirms quantities, and builds cart.
5. Bot creates a Nomba payment link.
6. Webhook confirms payment.
7. Bot sends order receipt and notifies the vendor.

---

## Integrations

### Telegram Bot API

- Used for:
  - Vendor onboarding (phone number via contact sharing).
  - Buyer chat flows (product search, cart, payment).
- Webhooks or polling are used to receive messages.
- Contact sharing is used to collect and verify vendor phone numbers.

### Nomba API

- **Checkout**: Create payment requests for orders.
- **Webhooks**: Listen for payment success/failure events.
- **Reconciliation**: Each order is tied to a Nomba payment reference.

---

## Setup and Development

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Telegram Bot token
- Nomba sandbox credentials


### Local Setup

1. Clone the repo:
   ```bash
   git clone <repo-url>
   cd swiftsell-backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set environment variables in `.env`.
4. Run database migrations (if using a migration tool).
5. Start the app:
   ```bash
   npm run dev
   ```
---

## Roadmap

### MVP (Hackathon)

- Telegram-based vendor onboarding.
- Vendor product catalog.
- Chat-based browsing and carting.
- Nomba payment links and webhook verification.
- Order status tracking.

### Post-Hackathon

- Onboard real vendors with verified Nomba credentials.
- Full vendor back-office dashboard.
- Inventory and stock management.
- Smarter LLM-powered bot for natural conversations.
- Advanced edge-case handling (failed payments, refunds, retries).

---

## License

This project is built for the DevCareer x Nomba Hackathon.  
License details to be added as the project evolves.

---

## Contact

- Team: Vault
- Hackathon: DevCareer x Nomba Hackathon 2026
- Communications: [princeakinola05@gmail.com] Send a message!
