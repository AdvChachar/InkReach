<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# InkReach API Key Setup Guide (Free Tiers)

Copy `.env.local.example` to `.env.local` and fill in the keys below.

---

## 1. Groq — AI Text Generation (LLM)
**Used by:** TikTok Hooks, Email Sequence, Influencer Pitcher, Character Chat, Social Posts
**Free tier:** 30 req/min, 14,400 req/day, 500K tokens/day — **no credit card required**

1. Go to https://console.groq.com
2. Sign up with Google/GitHub/Email
3. Go to **API Keys** → **Create API Key**
4. Copy the key into `.env.local` as `GROQ_API_KEY`

---

## 2. Google Gemini — Image Generation
**Used by:** Book Mockup (AI Generate Book Cover)
**Free tier:** 1,500 images/day, **no credit card required** (within rate limits)

1. Go to https://aistudio.google.com/apikey
2. Sign in with your Google account
3. Click **Create API Key** (select or create a Google Cloud project)
4. Copy the key into `.env.local` as `GEMINI_API_KEY`

---

## 3. Resend — Email Sending
**Used by:** Email Sequence (Send Test / Send to List), ARC Review Requests
**Free tier:** 100 emails/day, 2,500 contacts — **no credit card required**

1. Go to https://resend.com
2. Sign up with GitHub or Email
3. Go to **API Keys** → **Create API Key**
4. Copy the key into `.env.local` as `RESEND_API_KEY`
5. (Optional) Verify a domain to send from your own domain instead of `onboarding@resend.dev`

---

## 4. Stability AI — Image Generation (fallback/extra)
**Used by:** (Future) Image generation for Social Posts
**Free tier:** 25 API credits (one-time), then pay-as-you-go ($0.007/image)

1. Go to https://platform.stability.ai
2. Sign up → **API Keys** → **Create API Key**
3. Copy the key into `.env.local` as `STABILITY_API_KEY`

---

## 5. Seedance — AI Video Generation
**Used by:** Video Generator
**Free tier:** Check seedanceapi.org for current free credits

1. Go to https://seedanceapi.org
2. Sign up → generate an API key
3. Copy the key into `.env.local` as `SEEDANCE_API_KEY`

---

## 6. Lemon Squeezy — Payments & License Keys
**Used by:** Pricing modal, license validation
**Free tier:** No monthly fee, 5% + $0.50 per transaction

1. Go to https://lemonsqueezy.com
2. Sign up → **Settings** → **API Keys**
3. Copy the key into `.env.local` as `LEMONSQUEEZY_API_KEY`
4. Set `checkoutUrl` in `config/client.ts` to your checkout link
5. Optionally set `LICENSE_KEY` env var for static validation

---

## 7. `.env.local` Final Format

```env
GROQ_API_KEY=gsk_your_key_here
STABILITY_API_KEY=sk_your_key_here
SEEDANCE_API_KEY=sk_your_key_here
GEMINI_API_KEY=your_key_here
LEMONSQUEEZY_API_KEY=your_key_here
RESEND_API_KEY=re_your_key_here
```

**Important:** `.env.local` contains secrets. Never commit it to Git. The file is already in `.gitignore`.

---

## Testing Your Setup

1. `npm run dev` — starts dev server at http://localhost:3000
2. Open the app → generate content in any tab
3. If an API key is missing or wrong, the UI shows a clear error message

---

## Free Tier Limits Summary

| Service | Free Limit | Card Required |
|---------|-----------|--------------|
| Groq | 30 req/min, 500K tokens/day | No |
| Gemini | 1,500 images/day | No |
| Resend | 100 emails/day, 2,500 contacts | No |
| Stability AI | 25 credits (one-time) | No |
| Seedance | Check website | Varies |
| Lemon Squeezy | 5% + $0.50/txn | Yes |
