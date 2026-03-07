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

## Get an Anthropic API key
1. Sign up at https://console.anthropic.com
2. Go to **API Keys** → **Create Key**
3. Add billing at https://console.anthropic.com/settings/billing
   - $5 pre-paid credit will last a very long time for this app (~50,000 messages)
