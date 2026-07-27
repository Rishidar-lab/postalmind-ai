# PostalMind AI

AI companion for India Post GDS Officers — instant answers on GDS CE Rules, RTI drafting, BO workflows, and financial services. Built for 1.5 lakh+ rural postal workers.

- **Live Demo:** [https://postalmind-ai.vercel.app](https://postalmind-ai.vercel.app)
- **Hackathon:** Novita × Kilo Code Hackathon 2026
- **Builder:** RISHIDAR D. — GDS ABPM, Sevveri BO, Tamil Nadu

## Features

- **GDS CE Rules 2020** — cited, instant answers on conduct, leave, engagement, and disciplinary rules
- **RTI Drafting** — generate ready-to-file RTI applications with proper format
- **BO Daily Workflow** — PMA targets, checklists, e-BO procedures
- **Financial Services** — IPPB, PLI, RPLI, NSC, SSA, MIS guidance
- **Circulars & Orders** — contextual DOPT and postal circular updates
- **Tamil + English** — full bilingual support for Tier-2/3 postal workers

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Next.js 14 (App Router) + Tailwind CSS |
| Backend | Next.js API Routes (serverless) |
| AI | Google Gemini 2.5 Flash (free tier) |
| Deployment | Vercel |
| Rate Limiting | In-memory token bucket per IP |

## Local Development

### 1. Clone & Install

```bash
git clone https://github.com/your-username/postalmind-ai.git
cd postalmind-ai
npm install
```

### 2. Get a Free Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key (looks like `AIza...`)
5. No credit card required. Free tier: 15 requests/min, 1M tokens/min input, 4M tokens/day.

### 3. Configure API Key

```bash
cp .env.local.example .env.local
# Edit .env.local and add your Gemini API key
```

### 4. Run Dev Server

```bash
npm run dev
# Open http://localhost:3000
```

### 5. Build for Production

```bash
npm run build
```

## Deployment

### Vercel (Recommended) — One-Click Deploy

1. **Fork this repo to your GitHub** (or create a new repo and push the code)
2. **Go to [Vercel](https://vercel.com/)** → Sign up with GitHub
3. **Click "New Project"** → Import your GitHub repo
4. **Add Environment Variable:**
   - Name: `GEMINI_API_KEY`
   - Value: Your Google Gemini API key (starts with `AIza...`)
5. **Click Deploy** — Vercel builds and hosts automatically
6. **Your app is live** at `https://your-project-name.vercel.app`

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key (free tier) |

## Architecture

```
User (Browser) → Next.js API /api/chat → Google Gemini (Free Tier)
```

- **Rate limiting:** 20 requests/minute per IP
- **Input validation:** Max 4000 chars per message
- **Streaming:** SSE-style response streaming for real-time typing feel
- **Key security:** API key stored in Vercel env vars, never exposed to browser

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "AI service not configured" | Set `GEMINI_API_KEY` in Vercel Environment Variables |
| "Rate limit exceeded" | Wait 60 seconds, or reduce request frequency |
| Tamil text not rendering | Ensure UTF-8 charset is set in your hosting |
| Build fails on Vercel | Check Node.js version is 18+ in Vercel settings |

## License

MIT © 2026 RISHIDAR D.

Built at Sevveri BO, Vriddhachalam Sub-Division, Tamil Nadu 🇮🇳
