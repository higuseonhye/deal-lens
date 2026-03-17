# Deal Lens — VC Reliability Card MVP

투자 실사용 Reliability Card를 생성하는 Next.js 앱입니다.  
**투자 추천은 하지 않고**, 근거·리스크·질문만 제공합니다.

## 기능

- **1단계 정보 수집**: 회사명 + URL(자동 텍스트 추출) + 추가 텍스트. 회사명만으로 Serper 검색 가능.
- **2단계 질문 생성**: 수집된 정보 기반 LLM이 투자 질문 후보 생성 → 사용자 선택/수정
- **3단계 Reliability Card**: 선택한 질문으로 카드 생성
- **결과 페이지**: 카드 형태 렌더링 + 공유 링크
- **DB**: SQLite (Prisma)에 저장

## Reliability Card 스키마

- `evidenceScore` (0–100)
- `evidenceScoreRationale`
- `missingCoverage[]`
- `contradictionFlags[]`
- `sourceQualitySummary`
- `diligenceQuestions[]` (P0/P1/P2)
- `evidenceLedger[]` (claim, sourceUrl, snippet, confidence, included)
- `assumptions[]`, `redFlags[]`, `nextActions[]`

## 시작하기

```bash
# 의존성 설치
npm install

# DB 초기화
npx prisma generate
npx prisma db push

# .env 생성 (OPENAI_API_KEY 설정)
cp .env.example .env

# 개발 서버
npm run dev
```

`http://localhost:3000` 에서 사용할 수 있습니다.

## 환경 변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `OPENAI_API_KEY` | O | OpenAI API 키 |
| `OPENAI_MODEL` | X | 기본값: `gpt-4o-mini` |
| `SERPER_API_KEY` | X | 회사명 검색용 (serper.dev). 없으면 DuckDuckGo 무료 검색 사용 |
