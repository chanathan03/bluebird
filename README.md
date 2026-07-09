# Blue Bird ❄️ — Deploy Guide

## Project Structure
```
bluebird/
├── api/
│   └── chat.js          ← Vercel serverless function (your API proxy)
├── src/
│   ├── main.jsx
│   └── App.jsx          ← Main app (calls /api/chat)
├── index.html
├── package.json
├── vite.config.js
└── vercel.json
```

---

## Deploy in ~5 minutes

### 1. Install dependencies & test locally
```bash
npm install
npm run dev
```
The app runs at http://localhost:5173  
*(API calls will fail locally until you add the env var below)*

### 2. Push to GitHub
```bash
git init
git add .
git commit -m "🎿 Blue Bird ski app"
gh repo create bluebird-ski --public --push
# or use github.com to create a repo and follow the push instructions
```

### 3. Deploy to Vercel
1. Go to https://vercel.com → **Add New Project**
2. Import your GitHub repo
3. Leave all build settings as defaults (Vercel auto-detects Vite)
4. Click **Deploy**

### 4. Add your Anthropic API key (CRITICAL)
1. In Vercel dashboard → your project → **Settings → Environment Variables**
2. Add:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** `sk-ant-...` (your key from https://console.anthropic.com)
3. Click **Save**, then **Redeploy** (Deployments tab → ⋯ → Redeploy)

### 5. Done! 🎉
Your app is live at `https://your-project.vercel.app`

---

## How it works
- The frontend (`src/App.jsx`) calls **`/api/chat`** — your own server
- `api/chat.js` is a Vercel serverless function that forwards requests to Anthropic
- Your API key **never touches the browser** — it lives only in Vercel's environment

## Enable SMS "Text Me This Report" (Twilio)

The report tab has a **Text Me This Report** card that sends the currently-loaded resort's snow report as an SMS. It's powered by `api/send-sms.js`, a serverless function that calls Twilio directly — no database, no subscriptions, just one text on demand.

### 1. Get a Twilio account + phone number
1. Sign up at https://www.twilio.com/try-twilio
2. From the Twilio Console dashboard, copy your **Account SID** and **Auth Token**
3. Buy or use your trial **Twilio phone number** (Phone Numbers → Manage → Active Numbers)
   - Trial accounts can only text phone numbers you've verified in the Twilio Console (Phone Numbers → Verified Caller IDs) — upgrade to a paid account to text anyone

### 2. Add environment variables in Vercel
In Vercel dashboard → your project → **Settings → Environment Variables**, add:

| Name | Value |
|---|---|
| `TWILIO_ACCOUNT_SID` | starts with `AC...` |
| `TWILIO_AUTH_TOKEN` | from the Twilio Console |
| `TWILIO_FROM_NUMBER` | your Twilio number, E.164 format e.g. `+15551234567` |

Click **Save**, then **Redeploy**.

### 3. Test it
Load a resort report, enter a phone number in the "Text Me This Report" card, and click **Text Me**. If env vars are missing, the API returns a clear error instead of failing silently.

Note: this endpoint is unauthenticated (matches the rest of the app), so anyone with the URL could trigger a text. If you deploy this publicly and it gets attention, consider adding basic rate limiting or Vercel's Attack Challenge Mode.

## Get an Anthropic API key
1. Sign up at https://console.anthropic.com
2. Go to **API Keys** → **Create Key**
3. Add billing at https://console.anthropic.com/settings/billing
   - $5 pre-paid credit will last a very long time for this app (~50,000 messages)
