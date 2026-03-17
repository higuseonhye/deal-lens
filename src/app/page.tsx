"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STORAGE_KEY = "deal-lens-session";

type Step = 1 | 2 | 3;

interface CollectedSource {
  url: string | null;
  title?: string;
  text: string;
  source: "url" | "search" | "pasted";
}

interface StoredSession {
  companyName: string;
  url: string;
  extraText: string;
  collectedSources: CollectedSource[];
  collectedTextDisplay: string;
  questionCandidates: string[];
  selectedQuestions: string[];
  customQuestion: string;
}

function loadSession(): Partial<StoredSession> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<StoredSession>;
  } catch {
    return null;
  }
}

function saveSession(session: Partial<StoredSession>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {}
}

function clearSession() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export default function HomePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [url, setUrl] = useState("");
  const [extraText, setExtraText] = useState("");

  const [collectedSources, setCollectedSources] = useState<CollectedSource[]>([]);
  const [collectedTextDisplay, setCollectedTextDisplay] = useState("");

  const [questionCandidates, setQuestionCandidates] = useState<string[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [customQuestion, setCustomQuestion] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);

  const hasRestored = useRef(false);

  // Restore session from localStorage on mount, or pre-fill from URL ?company=
  useEffect(() => {
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const urlCompany = params?.get("company");
    if (urlCompany) {
      setCompanyName(decodeURIComponent(urlCompany));
      setStep(1);
    }
    const s = loadSession();
    if (s && !urlCompany) {
      if (s.companyName != null) setCompanyName(s.companyName);
      if (s.url != null) setUrl(s.url);
      if (s.extraText != null) setExtraText(s.extraText);
      if (s.collectedSources?.length) setCollectedSources(s.collectedSources);
      if (s.collectedTextDisplay != null) setCollectedTextDisplay(s.collectedTextDisplay);
      if (s.questionCandidates?.length) setQuestionCandidates(s.questionCandidates);
      if (s.selectedQuestions?.length) setSelectedQuestions(s.selectedQuestions);
      if (s.customQuestion != null) setCustomQuestion(s.customQuestion);
    }
    hasRestored.current = true;
  }, []);

  // Persist session whenever relevant state changes (after initial restore)
  useEffect(() => {
    if (!hasRestored.current) return;
    saveSession({
      companyName,
      url,
      extraText,
      collectedSources,
      collectedTextDisplay,
      questionCandidates,
      selectedQuestions,
      customQuestion,
    });
  }, [companyName, url, extraText, collectedSources, collectedTextDisplay, questionCandidates, selectedQuestions, customQuestion]);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [error]);

  async function handleCollect() {
    const hasInput = companyName.trim() || url.trim() || extraText.trim();
    if (!hasInput) {
      setError("회사명, URL, 또는 추가 텍스트 중 하나 이상을 입력해주세요.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      const res = await fetch("/api/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim() || undefined,
          url: url.trim() || undefined,
          extraText: extraText.trim() || undefined,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      let data: { error?: string; sources?: CollectedSource[] };
      try {
        data = await res.json();
      } catch {
        throw new Error("서버 응답을 읽을 수 없습니다.");
      }
      if (!res.ok) throw new Error(data.error || "수집 실패");
      setCollectedSources(data.sources ?? []);
      const combined = (data.sources ?? [])
        .map(
          (s: CollectedSource, i: number) =>
            `[소스 ${i + 1}${s.url ? ` - ${s.url}` : ""}]\n${s.text}`
        )
        .join("\n\n---\n\n");
      setCollectedTextDisplay(combined);
      setStep(2);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          setError("요청 시간이 초과되었습니다. URL이나 추가 텍스트를 직접 입력해보세요.");
        } else {
          setError(err.message);
        }
      } else {
        setError("수집 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateQuestions() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          collectedText: collectedTextDisplay,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "질문 생성 실패");
      setQuestionCandidates(data.questions || []);
      setSelectedQuestions(data.questions?.length ? [data.questions[0]] : []);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCard(e: React.FormEvent) {
    e.preventDefault();
    const custom = customQuestion.trim();
    const questionsToCreate = custom
      ? [custom]
      : selectedQuestions.filter(Boolean);
    if (questionsToCreate.length === 0) {
      setError("질문을 하나 이상 선택하거나 직접 입력해주세요.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const originalCombined = collectedSources
        .map((s, i) => `[소스 ${i + 1}${s.url ? ` - ${s.url}` : ""}]\n${s.text}`)
        .join("\n\n---\n\n");
      const sources =
        collectedTextDisplay === originalCombined
          ? collectedSources.map((s) => ({ url: s.url, text: s.text }))
          : [{ url: null as string | null, text: collectedTextDisplay }];

      const ids: string[] = [];
      const results = await Promise.all(
        questionsToCreate.map((question) =>
          fetch("/api/reliability", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              companyName: companyName.trim(),
              question,
              sources,
            }),
          }).then((res) => res.json())
        )
      );
      for (const data of results) {
        if (data.error) throw new Error(data.error || "Request failed");
        ids.push(data.id);
      }

      if (ids.length === 1) {
        router.push(`/r/${ids[0]}`);
      } else {
        router.push(`/results?ids=${ids.join(",")}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function toggleQuestion(q: string) {
    setSelectedQuestions((prev) =>
      prev.includes(q) ? prev.filter((x) => x !== q) : [...prev, q]
    );
    setCustomQuestion(""); // mutually exclusive with custom input
  }

  const hasSelection = selectedQuestions.length > 0 || customQuestion.trim().length > 0;

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-2xl px-6 py-12 sm:py-20">
        <header className="mb-14">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent)]">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
                  Deal Lens
                </h1>
                <p className="text-sm text-[var(--muted)]">
                  VC Reliability Card
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/history" className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] underline-offset-2 hover:underline">
                딜 목록
              </Link>
              <Link href="/workforce" className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] underline-offset-2 hover:underline">
                Workforce
              </Link>
              {(companyName || collectedSources.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    clearSession();
                    setCompanyName("");
                    setUrl("");
                    setExtraText("");
                    setCollectedSources([]);
                    setCollectedTextDisplay("");
                    setQuestionCandidates([]);
                    setSelectedQuestions([]);
                    setCustomQuestion("");
                    setStep(1);
                    setError(null);
                  }}
                  className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] underline-offset-2 hover:underline"
                >
                  새로 시작
                </button>
              )}
            </div>
          </div>
          <div className="mt-6">
            <div className="flex gap-1">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    step >= s ? "bg-[var(--accent)]" : "bg-[var(--card-border)]"
                  }`}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-[var(--muted)]">
              <span className={step >= 1 ? "text-[var(--accent)] font-medium" : ""}>정보 수집</span>
              <span className={step >= 2 ? "text-[var(--accent)] font-medium" : ""}>질문 생성</span>
              <span className={step >= 3 ? "text-[var(--accent)] font-medium" : ""}>카드 생성</span>
            </div>
          </div>
        </header>

        {error && (
          <div
            ref={errorRef}
            className="mb-6 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Step 1: 정보 수집 */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)]/50 p-6 shadow-sm">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)]">
                    회사명 <span className="text-[var(--danger)]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-glow)] transition-all"
                    placeholder="예: Acme Corp"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)]">
                    URL <span className="text-[var(--muted)] font-normal">(선택)</span>
                  </label>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">페이지 텍스트 자동 추출</p>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-glow)] transition-all"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)]">
                    추가 텍스트 / 메모 <span className="text-[var(--muted)] font-normal">(선택)</span>
                  </label>
                  <textarea
                    rows={4}
                    value={extraText}
                    onChange={(e) => setExtraText(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-glow)] transition-all resize-y"
                    placeholder="붙여넣기 또는 메모"
                  />
                </div>
              </div>
              <p className="mt-4 border-t border-[var(--card-border)] pt-4 text-xs text-[var(--muted)]">
                회사명만 입력해도 검색으로 관련 정보를 수집합니다 (Serper 또는 DuckDuckGo 무료).
              </p>
            </div>
            <button
              type="button"
              onClick={handleCollect}
              disabled={loading}
              className="w-full rounded-xl bg-[var(--accent)] px-4 py-3.5 font-semibold text-[#0a0a0f] shadow-lg shadow-[var(--accent-glow)] transition-all hover:bg-[var(--accent-muted)] hover:shadow-xl hover:shadow-[var(--accent-glow)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
            >
              {loading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#0a0a0f] border-t-transparent" />
                  정보 수집 중…
                </span>
              ) : (
                "정보 수집"
              )}
            </button>
          </div>
        )}

        {/* Step 2: 수집 결과 + 질문 생성 */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)]/50 p-6 shadow-sm">
              <label className="block text-sm font-medium text-[var(--foreground)]">
                수집된 정보 <span className="text-[var(--muted)] font-normal">(수정 가능)</span>
              </label>
              <textarea
                rows={12}
                value={collectedTextDisplay}
                onChange={(e) => setCollectedTextDisplay(e.target.value)}
                className="mt-3 w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-3 font-mono text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-glow)] transition-all resize-y"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border border-[var(--card-border)] px-5 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--card)] hover:border-[var(--muted)]/50"
              >
                이전
              </button>
              <button
                onClick={handleGenerateQuestions}
                disabled={loading}
                className="flex-1 rounded-xl bg-[var(--accent)] px-4 py-3.5 font-semibold text-[#0a0a0f] shadow-lg shadow-[var(--accent-glow)] transition-all hover:bg-[var(--accent-muted)] hover:shadow-xl hover:shadow-[var(--accent-glow)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
              >
                {loading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#0a0a0f] border-t-transparent" />
                    질문 생성 중…
                  </span>
                ) : (
                  "질문 생성"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: 질문 선택 + 카드 생성 */}
        {step === 3 && (
          <form onSubmit={handleCreateCard} className="space-y-6">
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)]/50 p-6 shadow-sm">
              <label className="block text-sm font-medium text-[var(--foreground)]">
                투자 질문 선택 또는 직접 입력
              </label>
              <p className="mt-1 text-xs text-[var(--muted)]">
                여러 질문을 선택하면 각각에 대해 Reliability Card가 생성됩니다.
              </p>
              <div className="mt-4 space-y-2">
                {questionCandidates.map((q) => (
                  <label
                    key={q}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all ${
                      selectedQuestions.includes(q) && !customQuestion.trim()
                        ? "border-[var(--accent)]/50 bg-[var(--accent)]/5"
                        : "border-[var(--card-border)] hover:bg-[var(--card-hover)]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedQuestions.includes(q) && !customQuestion.trim()}
                      onChange={() => toggleQuestion(q)}
                      className="mt-1 accent-[var(--accent)]"
                    />
                    <span className="text-sm text-[var(--foreground)]">{q}</span>
                  </label>
                ))}
              </div>
              <div className="mt-4">
                <input
                  type="text"
                  value={customQuestion}
                  onChange={(e) => {
                    setCustomQuestion(e.target.value);
                    if (e.target.value.trim()) setSelectedQuestions([]);
                  }}
                  placeholder="또는 직접 질문 입력 (직접 입력 시 선택 해제)"
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-glow)] transition-all"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-xl border border-[var(--card-border)] px-5 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--card)] hover:border-[var(--muted)]/50"
              >
                이전
              </button>
              <button
                type="submit"
                disabled={loading || !hasSelection}
                className="flex-1 rounded-xl bg-[var(--accent)] px-4 py-3.5 font-semibold text-[#0a0a0f] shadow-lg shadow-[var(--accent-glow)] transition-all hover:bg-[var(--accent-muted)] hover:shadow-xl hover:shadow-[var(--accent-glow)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
              >
                {loading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#0a0a0f] border-t-transparent" />
                    {(customQuestion.trim() ? 1 : selectedQuestions.length) > 1
                      ? `${customQuestion.trim() ? 1 : selectedQuestions.length}개 카드 생성 중…`
                      : "Reliability Card 생성 중…"}
                  </span>
                ) : (
                  "Reliability Card 생성"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
