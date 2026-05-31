# SalusVPN
 
 
SalusVPN is a verifiable VPN trust layer that helps users choose trusted internet infrastructure before connecting. Instead of blindly trusting a VPN provider's privacy claims, SalusVPN lets users verify relay node integrity, get AI-powered routing recommendations, and pay per session using USDC on Solana.
 
---
 
## Core Components
 
### Dashboard (Next.js Web App)
The main interface for browsing and selecting relay nodes. Displays a relay marketplace with trust scores, latency, pricing, verification status, and attestation hashes that link to real transactions on Solana Explorer. Includes the AI Trust Advisor panel and session management.
 
### AI Trust Advisor (Gemini)
Powered by Google Gemini. Users select a preference — Best Overall, Lowest Cost, Lowest Latency, Highest Trust, Streaming, or General Browsing — and Gemini evaluates every relay node across verification status, latency, reliability, trust score, and human lane availability to return a structured recommendation.
 
### Chrome Extension
The primary user-facing interface. Connects your wallet, selects a relay node, starts and ends sessions, tracks live cost and latency, displays your IP protection status, and shows a real-time bot traffic counter. Includes a built-in AI Trust Advisor with instant mock recommendations.
 
### Solana Payments
Pay-per-use session payments using USDC on Solana devnet. Supports Phantom, MetaMask, and Solflare wallets. Sessions are signed and settled on-chain.
 
### Verifiable Attestation
Every relay node has a real Solana devnet transaction hash as its attestation. Clicking any hash opens the verified transaction on Solana Explorer, proving the infrastructure transparency claim.
 
---
 
## Tech Stack
 
- **Next.js 15** — App Router, Server Actions, TypeScript
- **React 19** + **TailwindCSS v4**
- **Google Gemini API** (`gemini-2.0-flash`) — AI node recommendations
- **Solana** — devnet USDC payments, wallet adapters
- **Chrome Extension** — Manifest V3, vanilla JS
- **DigitalOcean App Platform** — deployment
---
 
## Getting Started
 
### Prerequisites
- Node.js 18+
- A Google Gemini API key from [aistudio.google.com](https://aistudio.google.com)
- Phantom wallet installed in Chrome
### Install
 
```bash
git clone https://github.com/camcoleman/SalusVPN.git
cd SalusVPN
npm install
```
 
### Environment Variables
 
```bash
cp .env.example .env.local
```
 
Add your key to `.env.local`:
```
GEMINI_API_KEY=your-gemini-api-key-here
```
 
### Run
 
```bash
npm run dev
```
 
Open [http://localhost:3000](http://localhost:3000)
 
---
 
## Load Chrome Extension
 
1. Open Chrome → go to `chrome://extensions`
2. Enable **Developer Mode** (top right)
3. Click **Load unpacked**
4. Select the `extension/` folder from this repo
---
 
## Devnet Setup (for payment demo)
 
1. Open Phantom → Settings → Developer Settings → enable Testnet Mode → select **Devnet**
2. Get free devnet SOL at [faucet.solana.com](https://faucet.solana.com)
3. Get free devnet USDC at [spl-token-faucet.com?token-name=USDC](https://spl-token-faucet.com?token-name=USDC)
