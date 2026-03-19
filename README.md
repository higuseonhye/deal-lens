# Deal Lens — VC Reliability Card MVP

A Next.js app that generates Reliability Cards for VC due diligence.  
**It does not provide investment recommendations** — only evidence, risks, and questions.

## Features

- **Step 1 — Information Collection**: Company name + URL (auto text extraction) + extra text. Serper search available by company name only.
- **Step 2 — Question Generation**: LLM generates investment question candidates from collected info → user selects/edits
- **Step 3 — Reliability Card**: Creates cards from selected questions
- **Results Page**: Card-style rendering + shareable link
- **DB**: Stored in SQLite (Prisma)

## Reliability Card Schema

- `evidenceScore` (0–100)
- `evidenceScoreRationale`
- `missingCoverage[]`
- `contradictionFlags[]`
- `sourceQualitySummary`
- `diligenceQuestions[]` (P0/P1/P2)
- `evidenceLedger[]` (claim, sourceUrl, snippet, confidence, included)
- `assumptions[]`, `redFlags[]`, `nextActions[]`

## Getting Started

```bash
# Install dependencies
npm install

# Initialize DB
npx prisma generate
npx prisma db push

# Create .env (set OPENAI_API_KEY)
cp .env.example .env

# Development server
npm run dev
```

Available at `http://localhost:3000`.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `OPENAI_MODEL` | No | Default: `gpt-4o-mini` |
| `SERPER_API_KEY` | No | For company name search (serper.dev). Falls back to DuckDuckGo free search if not set |
