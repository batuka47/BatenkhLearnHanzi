"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { useProgress } from "@/hooks/use-progress"
import { useTestHistory, type TestResult } from "@/hooks/use-test-history"
import { words } from "@/lib/words-data"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  ChevronLeft, Flame, BookOpenCheck, Trophy,
  CheckCircle2, XCircle, Calendar, BarChart2, ChevronDown, ChevronUp,
} from "lucide-react"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  })
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit",
  })
}

function calcStreak(history: TestResult[]): number {
  if (history.length === 0) return 0
  const days = new Set(history.map((h) => new Date(h.taken_at).toDateString()))
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    if (days.has(d.toDateString())) {
      streak++
    } else {
      if (i === 0) continue
      break
    }
  }
  return streak
}

// SVG donut ring — shows score percentage
function DonutChart({ score, total }: { score: number; total: number }) {
  const pct = total === 0 ? 0 : score / total
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = circ * pct
  const gap = circ - dash
  const color = pct === 1 ? "#22c55e" : pct >= 0.7 ? "#3b82f6" : "#f97316"

  return (
    <svg width="72" height="72" viewBox="0 0 72 72" style={{ flexShrink: 0 }}>
      <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="7" />
      <circle
        cx="36" cy="36" r={r} fill="none"
        stroke={color} strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={circ / 4}
        transform="rotate(-90 36 36) rotate(90 36 36)"
        style={{ transform: "rotate(-90deg)", transformOrigin: "36px 36px" }}
      />
      <text x="36" y="36" textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: "13px", fontWeight: 500, fill: color }}>
        {Math.round(pct * 100)}%
      </text>
    </svg>
  )
}

// Word lookup map
const wordMap = Object.fromEntries(words.map((w) => [w.id, w]))

// Expandable history entry
function HistoryCard({ entry, allWordIds }: { entry: TestResult; allWordIds: string[] }) {
  const [open, setOpen] = useState(false)
  const pct = Math.round((entry.score / entry.total) * 100)

  const missedIds = new Set(entry.missed_word_ids)
  const correctIds = allWordIds.filter((id) => !missedIds.has(id))
  const missedWords = entry.missed_word_ids.map((id) => wordMap[id]).filter(Boolean)
  const correctWords = correctIds.map((id) => wordMap[id]).filter(Boolean)

  return (
    <div className="rounded-xl border border-border bg-secondary/20 overflow-hidden">
      {/* Header row — always visible */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-secondary/40 transition-colors text-left"
      >
        <DonutChart score={entry.score} total={entry.total} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {entry.test_type === "day"
              ? <Calendar size={13} className="text-accent flex-shrink-0" />
              : <BookOpenCheck size={13} className="text-accent flex-shrink-0" />
            }
            <span className="text-sm font-semibold text-foreground">
              {entry.test_type === "day" ? `Day ${entry.day_number}` : "Learned Test"}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              pct === 100
                ? "bg-green-500/15 text-green-500"
                : pct >= 70
                ? "bg-blue-500/15 text-blue-400"
                : "bg-orange-500/15 text-orange-400"
            }`}>
              {entry.score}/{entry.total}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDate(entry.taken_at)} · {formatTime(entry.taken_at)}
          </p>
          {/* Mini score bar */}
          <div className="mt-2 h-1 rounded-full bg-border overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                pct === 100 ? "bg-green-500" : pct >= 70 ? "bg-blue-500" : "bg-orange-400"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="flex-shrink-0 text-muted-foreground">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-border px-4 py-4 space-y-4">
          {/* Two-column grid: correct | missed */}
          <div className="grid grid-cols-2 gap-3">
            {/* Correct */}
            <div>
              <p className="text-xs font-semibold text-green-500 flex items-center gap-1 mb-2">
                <CheckCircle2 size={12} /> Correct ({correctWords.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {correctWords.length === 0 && (
                  <span className="text-xs text-muted-foreground">None</span>
                )}
                {correctWords.map((w) => (
                  <Link
                    key={w.id}
                    href={`/word/${w.id}`}
                    title={`${w.pinyin} — ${w.meaningEn}`}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-colors"
                  >
                    <span className="text-sm font-semibold text-foreground">{w.hanzi}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Missed */}
            <div>
              <p className="text-xs font-semibold text-red-400 flex items-center gap-1 mb-2">
                <XCircle size={12} /> Missed ({missedWords.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {missedWords.length === 0 && (
                  <span className="text-xs text-muted-foreground italic">None — perfect!</span>
                )}
                {missedWords.map((w) => (
                  <Link
                    key={w.id}
                    href={`/word/${w.id}`}
                    title={`${w.pinyin} — ${w.meaningEn}`}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                  >
                    <span className="text-sm font-semibold text-foreground">{w.hanzi}</span>
                    <span className="text-[10px] text-muted-foreground hidden sm:block">{w.pinyin}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Visual accuracy bar per word */}
          {allWordIds.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Word by word</p>
              <div className="flex flex-wrap gap-1">
                {allWordIds.map((id) => {
                  const w = wordMap[id]
                  const wrong = missedIds.has(id)
                  return (
                    <Link
                      key={id}
                      href={w ? `/word/${w.id}` : "#"}
                      title={w ? `${w.hanzi} ${w.pinyin}` : id}
                      className={`w-7 h-7 flex items-center justify-center rounded text-xs font-bold transition-colors ${
                        wrong
                          ? "bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25"
                          : "bg-green-500/15 text-green-500 border border-green-500/20 hover:bg-green-500/25"
                      }`}
                    >
                      {w ? w.hanzi[0] : "?"}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, signOut, loading: authLoading } = useAuth()
  const { learnedCount } = useProgress()
  const { fetchHistory } = useTestHistory()

  const [history, setHistory] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(true)

  // Store the word ids that were in each test so we can show correct words
  // We derive this from the total - missed approach
  // Since we don't store the full word list per test, we infer from context:
  // day tests: words from that day; learned tests: we can only show missed reliably
  const getTestWordIds = (entry: TestResult): string[] => {
    // Use stored all_word_ids if available (new records)
    if (entry.all_word_ids && entry.all_word_ids.length > 0) return entry.all_word_ids
    // Fallback for old records: infer from day number
    if (entry.test_type === "day" && entry.day_number !== null) {
      const start = (entry.day_number - 1) * 30
      return words.slice(start, start + 30).map((w) => w.id)
    }
    return entry.missed_word_ids
  }

  useEffect(() => {
    if (!authLoading && !user) router.replace("/")
  }, [user, authLoading])

  useEffect(() => {
    if (!user) return
    fetchHistory().then((data) => {
      setHistory(data)
      setLoading(false)
    })
  }, [user])

  if (authLoading || !user) return null

  const streak = calcStreak(history)
  const totalTests = history.length
  const avgScore = totalTests > 0
    ? Math.round((history.reduce((s, h) => s + h.score / h.total, 0) / totalTests) * 100)
    : 0

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-secondary border border-border text-foreground hover:bg-border transition-colors text-sm">
              <ChevronLeft size={16} /> Back
            </Link>
            <h1 className="text-lg font-bold text-foreground">Profile</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button onClick={signOut} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md bg-secondary border border-border">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">

          {/* User */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-accent/20 border-2 border-accent/40 flex items-center justify-center text-2xl font-bold text-accent">
              {user.email?.[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-foreground">{user.email}</p>
              <p className="text-sm text-muted-foreground">
                Member since {new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: <Flame size={20} className={streak > 0 ? "text-orange-400" : "text-muted-foreground"} />, value: streak, label: "Day streak", hi: streak > 0 },
              { icon: <BookOpenCheck size={20} className="text-accent" />, value: learnedCount, label: "Words learned", hi: false },
              { icon: <Trophy size={20} className="text-yellow-500" />, value: `${avgScore}%`, label: "Avg. score", hi: false },
              { icon: <BarChart2 size={20} className="text-accent" />, value: totalTests, label: "Tests taken", hi: false },
            ].map((s, i) => (
              <div key={i} className={`flex flex-col gap-2 p-4 rounded-xl border ${s.hi ? "bg-orange-500/5 border-orange-500/20" : "bg-secondary/40 border-border"}`}>
                {s.icon}
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Activity heatmap */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">Activity — last 30 days</h2>
            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: 30 }, (_, i) => {
                const d = new Date(); d.setDate(d.getDate() - (29 - i))
                const count = history.filter((h) => new Date(h.taken_at).toDateString() === d.toDateString()).length
                return (
                  <div key={i} title={`${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}: ${count} test${count !== 1 ? "s" : ""}`}
                    className={`w-7 h-7 rounded-md border transition-colors ${count === 0 ? "bg-secondary/40 border-border" : count === 1 ? "bg-accent/30 border-accent/40" : "bg-accent/70 border-accent"}`}
                  />
                )
              })}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">Less</span>
              <div className="w-4 h-4 rounded bg-secondary/40 border border-border" />
              <div className="w-4 h-4 rounded bg-accent/30 border border-accent/40" />
              <div className="w-4 h-4 rounded bg-accent/70 border border-accent" />
              <span className="text-xs text-muted-foreground">More</span>
            </div>
          </div>

          {/* Test history */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">Test History</h2>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No tests taken yet. Head back and start a test!</p>
            ) : (
              <div className="space-y-3">
                {history.map((entry) => (
                  <HistoryCard
                    key={entry.id}
                    entry={entry}
                    allWordIds={getTestWordIds(entry)}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}