"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import HanziWriter from "hanzi-writer"
import { X, ChevronRight, RotateCcw, CheckCircle2, XCircle, Trophy } from "lucide-react"
import type { Word } from "@/lib/words-data"
import { useTestHistory } from "@/hooks/use-test-history"
import { useAuth } from "@/contexts/auth-context"

interface DayTestProps {
  words: Word[]
  dayNumber: number   // -1 for learned test
  onClose: () => void
}

type Phase = "drawing" | "result" | "summary"

interface QuestionState {
  word: Word
  promptLang: "en" | "mn"
  passed: boolean | null
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function removeToneMarks(str: string): string {
  const map: Record<string, string> = {
    ā: "a", á: "a", ǎ: "a", à: "a",
    ē: "e", é: "e", ě: "e", è: "e",
    ī: "i", í: "i", ǐ: "i", ì: "i",
    ō: "o", ó: "o", ǒ: "o", ò: "o",
    ū: "u", ú: "u", ǔ: "u", ù: "u",
    ǖ: "v", ǘ: "v", ǚ: "v", ǜ: "v",
    ń: "n", ň: "n", ǹ: "n",
  }
  return [...str].map((c) => map[c] ?? c).join("")
}

function normalizePinyin(str: string): string {
  return removeToneMarks(str.toLowerCase().replace(/[\s\-]/g, ""))
}

function checkPinyin(input: string, correct: string): boolean {
  return normalizePinyin(input) === normalizePinyin(correct)
}

// ── Single character drawing quiz ──────────────────────────────────────────
function CharQuiz({
  char, size, onComplete,
}: {
  char: string
  size: number
  onComplete: (success: boolean) => void
}) {
  const elRef = useRef<HTMLDivElement>(null)
  const writerRef = useRef<HanziWriter | null>(null)
  const [mistakeCount, setMistakeCount] = useState(0)
  const [done, setDone] = useState(false)
  const [hinting, setHinting] = useState(false)
  const [usedHint, setUsedHint] = useState(false)

  useEffect(() => {
    const el = elRef.current
    if (!el) return
    el.innerHTML = ""
    const writer = HanziWriter.create(el, char, {
      width: size, height: size, padding: 12,
      showOutline: false, showCharacter: false,
      strokeColor: "#4ade80", drawingColor: "#e2e8f0", drawingWidth: 4,
      strokeAnimationSpeed: 1,
    })
    writerRef.current = writer
    writer.quiz({
      onMistake: () => setMistakeCount((n) => n + 1),
      onComplete: () => {
        // Always pass on completion — mistakes shown for info only
        setDone(true)
        onComplete(true)
      },
    })
    return () => {
      if (writerRef.current && typeof writerRef.current.destroy === "function")
        writerRef.current.destroy()
    }
  }, [char, size])

  // Show the character, then after 1.5s reveal permanently and mark as hinted (failed)
  const handleHint = () => {
    const writer = writerRef.current
    if (!writer || hinting || done) return
    setHinting(true)
    writer.showCharacter()
    setTimeout(() => {
      setDone(true)
      setUsedHint(true)
      setHinting(false)
      onComplete(false)  // hint = mistake, counts as failed
    }, 1500)
  }

  return (
    <div className="flex flex-col items-center">
      <div ref={elRef} className="rounded-xl border-2 border-border bg-slate-900/50 shadow-inner mx-auto"
        style={{ width: size, height: size }} />
      <div className="flex items-center gap-3 mt-2">
        <p className={`text-xs font-medium ${done && usedHint ? "text-orange-400" : done ? "text-green-500" : mistakeCount > 0 ? "text-orange-400" : "text-muted-foreground"}`}>
          {done && usedHint ? "Hint used" : done ? "✓ Done" : mistakeCount > 0 ? `${mistakeCount} mistake${mistakeCount !== 1 ? "s" : ""}` : "Draw it"}
        </p>
        {!done && (
          <button
            onClick={handleHint}
            disabled={hinting}
            title="Show hint"
            className="text-[10px] px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:border-accent/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {hinting ? "…" : "Hint"}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main test component ────────────────────────────────────────────────────
export default function DayTest({ words, dayNumber, onClose }: DayTestProps) {
  const { user } = useAuth()
  const { saveResult } = useTestHistory()

  const [questions] = useState<QuestionState[]>(() =>
    shuffle(words).map((word) => ({
      word,
      promptLang: Math.random() < 0.5 ? "en" : "mn",
      passed: null,
    }))
  )
  const [currentIndex, setCurrentIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>("drawing")
  const [charResults, setCharResults] = useState<(boolean | null)[]>([])
  const [allCharsDone, setAllCharsDone] = useState(false)
  const [pinyinInput, setPinyinInput] = useState("")
  const [pinyinSubmitted, setPinyinSubmitted] = useState(false)
  const [pinyinCorrect, setPinyinCorrect] = useState<boolean | null>(null)
  const [results, setResults] = useState<boolean[]>([])
  const [saved, setSaved] = useState(false)
  const [canvasSize, setCanvasSize] = useState(160)

  // charCount is derived from questions so it's always available
  const currentCharCount = questions[currentIndex]?.word.hanzi.split("").length ?? 1

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      const n = currentCharCount
      if (w < 640) {
        // Mobile: vertical stack — 80% of screen width
        setCanvasSize(Math.floor(w * 0.8))
      } else if (w < 1024) {
        // Tablet: horizontal row split by char count
        setCanvasSize(Math.min(Math.floor((w - 80) / n - 16), 280))
      } else {
        // Desktop: horizontal row, larger
        setCanvasSize(Math.min(Math.floor((w - 120) / n - 24), 360))
      }
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [currentCharCount])

  const current = questions[currentIndex]
  const characters = current?.word.hanzi.split("") ?? []

  useEffect(() => {
    setCharResults(new Array(characters.length).fill(null))
    setAllCharsDone(false)
    setPinyinInput("")
    setPinyinSubmitted(false)
    setPinyinCorrect(null)
  }, [currentIndex])

  const handleCharComplete = useCallback((charIndex: number, success: boolean) => {
    setCharResults((prev) => {
      const next = [...prev]
      next[charIndex] = success
      if (next.every((r) => r !== null)) setAllCharsDone(true)
      return next
    })
  }, [])

  const handlePinyinSubmit = () => {
    setPinyinCorrect(checkPinyin(pinyinInput, current.word.pinyin))
    setPinyinSubmitted(true)
  }

  const handleShowResult = () => {
    // Drawing always passes on completion — mistakes are informational only
    const passed = allCharsDone || pinyinCorrect === true
    setResults((prev) => [...prev, passed])
    setPhase("result")
  }

  const handleNext = (updatedResults: boolean[]) => {
    if (currentIndex + 1 >= questions.length) {
      // Save to history once when first reaching summary
      if (!saved && user) {
        const score = updatedResults.filter(Boolean).length
        const missedIds = questions
          .filter((_, i) => updatedResults[i] === false)
          .map((q) => q.word.id)
        saveResult({
          test_type: dayNumber === -1 ? "learned" : "day",
          day_number: dayNumber === -1 ? null : dayNumber,
          score,
          total: updatedResults.length,
          missed_word_ids: missedIds,
          all_word_ids: questions.map((q) => q.word.id),
        })
        setSaved(true)
      }
      setPhase("summary")
    } else {
      setCurrentIndex((i) => i + 1)
      setPhase("drawing")
    }
  }

  // Retry missed
  const [retryMode, setRetryMode] = useState(false)
  const [retryQuestions, setRetryQuestions] = useState<QuestionState[]>([])
  const [retryIndex, setRetryIndex] = useState(0)

  const handleRetryMissed = () => {
    const missed = questions.filter((_, i) => results[i] === false)
    setRetryQuestions(shuffle(missed).map((q) => ({ ...q, passed: null })))
    setRetryIndex(0)
    setRetryMode(true)
    setCurrentIndex(0)
    setResults([])
    setSaved(false)
    setPhase("drawing")
  }

  const score = results.filter(Boolean).length
  const total = results.length
  const activeQuestions = retryMode ? retryQuestions : questions
  const activeQuestion = activeQuestions[retryMode ? retryIndex : currentIndex]
  const progress = (retryMode ? retryIndex : currentIndex) + 1
  const progressTotal = activeQuestions.length
  const title = dayNumber === -1 ? "Learned Test" : `Day ${dayNumber} Test`

  // ── Summary ───────────────────────────────────────────────────────────────
  if (phase === "summary") {
    const missed = questions.filter((_, i) => results[i] === false)
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-bold text-lg text-foreground">{title} — Results</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
          <div className="flex flex-col items-center mb-8 mt-4">
            <Trophy size={48} className={score === total ? "text-yellow-400" : "text-muted-foreground"} />
            <p className="text-5xl font-bold text-foreground mt-4">
              {score}<span className="text-2xl text-muted-foreground">/{total}</span>
            </p>
            <p className="text-muted-foreground mt-2">
              {score === total ? "Perfect! All words mastered 🎉"
                : score >= total * 0.7 ? "Great work, keep it up!"
                : "Keep practicing, you'll get there!"}
            </p>
            {user && <p className="text-xs text-accent mt-1">Result saved to your profile ✓</p>}
          </div>

          <div className="w-full max-w-md space-y-2">
            {questions.map((q, i) => (
              <div key={q.word.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
                results[i] ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"
              }`}>
                {results[i]
                  ? <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                  : <XCircle size={16} className="text-red-500 flex-shrink-0" />
                }
                <span className="text-lg font-semibold text-foreground">{q.word.hanzi}</span>
                <span className="text-sm text-muted-foreground">{q.word.pinyin}</span>
                <span className="text-xs text-muted-foreground ml-auto hidden sm:block">{q.word.meaningEn}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-8">
            {missed.length > 0 && (
              <button onClick={handleRetryMissed}
                className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-accent text-accent-foreground font-medium hover:opacity-90 transition-opacity">
                <RotateCcw size={16} /> Retry {missed.length} missed
              </button>
            )}
            <button onClick={onClose}
              className="px-5 py-2.5 rounded-md bg-secondary border border-border text-foreground font-medium hover:bg-border transition-colors">
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!activeQuestion) return null

  const prompt = activeQuestion.promptLang === "en" ? activeQuestion.word.meaningEn : activeQuestion.word.meaningMn
  const promptLabel = activeQuestion.promptLang === "en" ? "English" : "Mongolian"
  const activeChars = activeQuestion.word.hanzi.split("")

  // ── Result phase ──────────────────────────────────────────────────────────
  if (phase === "result") {
    const wordPassed = allCharsDone || pinyinCorrect === true
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            <span className="text-sm text-muted-foreground">{progress} / {progressTotal}</span>
          </div>
          <span className="text-sm font-medium text-foreground">{title}</span>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm ${
            wordPassed
              ? "bg-green-500/15 text-green-500 border border-green-500/30"
              : "bg-red-500/15 text-red-500 border border-red-500/30"
          }`}>
            {wordPassed ? <><CheckCircle2 size={16} /> Correct!</> : <><XCircle size={16} /> Incorrect</>}
          </div>
          <div className="text-center">
            <p className="text-6xl font-bold text-foreground mb-3">{activeQuestion.word.hanzi}</p>
            <p className="text-xl text-accent font-medium">{activeQuestion.word.pinyin}</p>
            <p className="text-base text-muted-foreground mt-1">{activeQuestion.word.meaningEn}</p>
            <p className="text-base text-muted-foreground">{activeQuestion.word.meaningMn}</p>
          </div>
          <div className="flex gap-3">
            {activeChars.map((char, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-2xl font-bold text-foreground">{char}</span>
                {charResults[i] === true ? <CheckCircle2 size={14} className="text-green-500" />
                  : charResults[i] === false ? <XCircle size={14} className="text-red-500" />
                  : <span className="w-3.5 h-3.5" />}
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              const updated = [...results]
              handleNext(updated)
            }}
            className="flex items-center gap-2 px-6 py-3 rounded-md bg-accent text-accent-foreground font-medium hover:opacity-90 transition-opacity"
          >
            {progress >= progressTotal ? "See Results" : "Next"} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    )
  }

  // ── Drawing phase ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
      <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
          <div className="flex gap-1">
            {activeQuestions.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all ${
                i < progress - 1 ? "bg-accent w-4"
                  : i === progress - 1 ? "bg-accent w-6"
                  : "bg-border w-4"
              }`} />
            ))}
          </div>
        </div>
        <span className="text-sm text-muted-foreground">{progress} / {progressTotal}</span>
      </header>

      <div className="flex-1 overflow-y-auto flex flex-col items-center p-4 sm:p-6 gap-6">
        <div className="text-center mt-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{promptLabel}</p>
          <p className="text-2xl sm:text-3xl font-bold text-foreground">{prompt}</p>
          <p className="text-sm text-muted-foreground mt-1">Draw each character below</p>
        </div>

        {/* Mobile: vertical stack, tablet+: horizontal row */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 w-full px-2">
          {activeChars.map((char, i) => (
            <div key={`${activeQuestion.word.id}-${i}`} className="flex flex-col items-center gap-2 w-full sm:flex-1 sm:min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Character {i + 1}</p>
              <CharQuiz char={char} size={canvasSize} onComplete={(s) => handleCharComplete(i, s)} />
            </div>
          ))}
        </div>

        <div className="w-full max-w-sm">
          <p className="text-xs text-muted-foreground text-center mb-2">
            Can't draw? Type pinyin to rescue (e.g.{" "}
            <span className="text-foreground font-medium">nihao</span> or{" "}
            <span className="text-foreground font-medium">nǐ hǎo</span>)
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={pinyinInput}
              onChange={(e) => setPinyinInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !pinyinSubmitted && pinyinInput.trim() && handlePinyinSubmit()}
              disabled={pinyinSubmitted}
              placeholder="Type pinyin..."
              className="flex-1 px-3 py-2 rounded-md bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent disabled:opacity-50"
            />
            <button onClick={handlePinyinSubmit} disabled={pinyinSubmitted || !pinyinInput.trim()}
              className="px-3 py-2 rounded-md bg-secondary border border-border text-foreground text-sm hover:bg-border transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              ✓
            </button>
          </div>
          {pinyinSubmitted && (
            <p className={`text-xs mt-1.5 text-center font-medium ${pinyinCorrect ? "text-green-500" : "text-red-500"}`}>
              {pinyinCorrect ? "Correct pinyin!" : `Not quite — correct: ${activeQuestion.word.pinyin}`}
            </p>
          )}
        </div>

        <button
          onClick={handleShowResult}
          disabled={!allCharsDone}
          className="px-8 py-3 rounded-md bg-accent text-accent-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
        >
          Continue <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}