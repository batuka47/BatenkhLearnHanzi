"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import SearchBar from "@/components/search-bar"
import { ThemeToggle } from "@/components/theme-toggle"
import AuthModal from "@/components/auth-modal"
import DayTest from "@/components/day-test"
import { words } from "@/lib/words-data"
import { useAuth } from "@/contexts/auth-context"
import { useProgress } from "@/hooks/use-progress"
import { LogOut, User, CheckCircle2, Circle, FlaskConical, BookOpenCheck, X, UserCircle } from "lucide-react"
import Footer from "@/components/footer"

type Filter = "all" | "learned" | "unlearned"

const WORDS_PER_DAY = 30

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [activeDay, setActiveDay] = useState(1)
  const [showAuth, setShowAuth] = useState(false)

  // Day test
  const [testDay, setTestDay] = useState<number | null>(null)

  // Learned test
  const [showLearnedModal, setShowLearnedModal] = useState(false)
  const [learnedCountInput, setLearnedCountInput] = useState("")
  const [learnedTestWords, setLearnedTestWords] = useState<typeof words | null>(null)

  const { user, signOut } = useAuth()
  const { isLearned, toggleLearned, learnedCount } = useProgress()

  const totalDays = Math.ceil(words.length / WORDS_PER_DAY)

  const removeToneMarks = (str: string) => {
    const toneMap: { [key: string]: string } = {
      ā: "a", á: "a", ǎ: "a", à: "a",
      ē: "e", é: "e", ě: "e", è: "e",
      ī: "i", í: "i", ǐ: "i", ì: "i",
      ō: "o", ó: "o", ǒ: "o", ò: "o",
      ū: "u", ú: "u", ǔ: "u", ù: "u",
      ǖ: "v", ǘ: "v", ǚ: "v", ǜ: "v",
      ń: "n", ň: "n", ǹ: "n",
    }
    return str.replace(/./g, (char) => toneMap[char] || char)
  }

  const dayWords = useMemo(() => {
    const start = (activeDay - 1) * WORDS_PER_DAY
    return words.slice(start, start + WORDS_PER_DAY)
  }, [activeDay])

  const filteredWords = useMemo(() => {
    const queryLower = searchQuery.toLowerCase()
    const queryNoTones = removeToneMarks(queryLower)

    return dayWords.filter((word) => {
      if (searchQuery) {
        const hanziMatch = word.hanzi.includes(searchQuery)
        const englishMatch = word.meaningEn.toLowerCase().includes(queryLower)
        const mongolianMatch = word.meaningMn.toLowerCase().includes(queryLower)
        const pinyinMatch = removeToneMarks(word.pinyin.toLowerCase()).includes(queryNoTones)
        if (!hanziMatch && !englishMatch && !mongolianMatch && !pinyinMatch) return false
      }
      if (user && filter === "learned") return isLearned(word.id)
      if (user && filter === "unlearned") return !isLearned(word.id)
      return true
    })
  }, [searchQuery, filter, dayWords, isLearned, user])

  const dayLearnedCount = (day: number) => {
    const start = (day - 1) * WORDS_PER_DAY
    const slice = words.slice(start, start + WORDS_PER_DAY)
    return slice.filter((w) => isLearned(w.id)).length
  }

  // All learned words across every day
  const allLearnedWords = useMemo(
    () => words.filter((w) => isLearned(w.id)),
    [isLearned, learnedCount]
  )

  const testWords = useMemo(() => {
    if (testDay === null) return []
    const start = (testDay - 1) * WORDS_PER_DAY
    return words.slice(start, start + WORDS_PER_DAY)
  }, [testDay])

  const handleStartLearnedTest = () => {
    const n = parseInt(learnedCountInput, 10)
    if (isNaN(n) || n < 1) return
    const count = Math.min(n, allLearnedWords.length)
    const picked = shuffle(allLearnedWords).slice(0, count)
    setLearnedTestWords(picked)
    setShowLearnedModal(false)
    setLearnedCountInput("")
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold text-foreground tracking-tight">Learn Hanzi</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
                Master Chinese characters with animation and practice
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {user ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[140px]">
                    {user.email}
                  </span>
                  <Link
                    href="/profile"
                    title="Profile"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-secondary border border-border text-foreground hover:bg-border transition-colors text-sm"
                  >
                    <UserCircle size={14} />
                    <span className="hidden sm:inline">Profile</span>
                  </Link>
                  <button
                    onClick={signOut}
                    title="Sign out"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-secondary border border-border text-foreground hover:bg-border transition-colors text-sm"
                  >
                    <LogOut size={14} />
                    <span className="hidden sm:inline">Sign out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-accent text-accent-foreground hover:opacity-90 transition-opacity text-sm font-medium"
                >
                  <User size={14} />
                  <span>Sign in</span>
                </button>
              )}
            </div>
          </div>

          {/* Overall progress bar */}
          {user && (
            <div className="mt-4 sm:mt-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">
                  {learnedCount} / {words.length} learned
                </span>
                <span className="text-xs font-medium text-accent">
                  {Math.round((learnedCount / words.length) * 100)}%
                </span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-500"
                  style={{ width: `${(learnedCount / words.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="w-full p-4 sm:p-6">
          <SearchBar query={searchQuery} onQueryChange={setSearchQuery} />

          {/* Day tabs */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
              const learned = dayLearnedCount(day)
              const total = Math.min(WORDS_PER_DAY, words.length - (day - 1) * WORDS_PER_DAY)
              const complete = user && learned === total
              return (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all border ${
                    activeDay === day
                      ? "bg-accent text-accent-foreground border-accent shadow-sm"
                      : complete
                      ? "bg-accent/10 border-accent/30 text-accent hover:bg-accent/20"
                      : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:bg-border"
                  }`}
                >
                  Day {day}
                  {user && learned > 0 && (
                    <span className={`ml-1.5 text-[10px] font-semibold ${
                      activeDay === day ? "text-accent-foreground/70" : "text-accent"
                    }`}>
                      {learned}/{total}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Learned / filter tabs */}
          {user && (
            <div className="flex gap-2 mt-3">
              {(["all", "learned", "unlearned"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
                    filter === f
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:bg-border"
                  }`}
                >
                  {f === "all" ? "All" : f === "learned" ? "Learned" : "Not learned"}
                </button>
              ))}
            </div>
          )}

          {/* Word list */}
          <div className="mt-5 sm:mt-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              {filteredWords.length === 0
                ? "No words found"
                : `Day ${activeDay} · ${filteredWords.length} word${filteredWords.length !== 1 ? "s" : ""}`}
            </h3>

            <div className="space-y-2">
              {filteredWords.map((word) => {
                const learned = isLearned(word.id)
                return (
                  <div
                    key={word.id}
                    className={`flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 rounded-lg transition-all border ${
                      learned
                        ? "bg-accent/5 border-accent/20"
                        : "bg-secondary/40 border-transparent"
                    }`}
                  >
                    {user && (
                      <button
                        onClick={() => toggleLearned(word.id)}
                        title={learned ? "Mark as not learned" : "Mark as learned"}
                        className="flex-shrink-0 transition-colors text-muted-foreground hover:text-accent"
                      >
                        {learned
                          ? <CheckCircle2 size={20} className="text-accent" />
                          : <Circle size={20} className="opacity-40 hover:opacity-100" />
                        }
                      </button>
                    )}

                    <Link
                      href={`/word/${word.id}`}
                      className="flex-1 min-w-0 flex items-center gap-3 sm:gap-4 group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className={`font-semibold text-lg transition-colors group-hover:text-accent ${
                          learned ? "text-accent/80" : "text-foreground"
                        }`}>
                          {word.hanzi}
                        </div>
                        <div className="text-sm text-muted-foreground mt-0.5 truncate">{word.pinyin}</div>
                      </div>
                      <div className="text-xs text-muted-foreground flex-shrink-0 hidden sm:block">
                        {word.meaningEn}
                      </div>
                      <div className="text-muted-foreground group-hover:text-accent transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">
                        →
                      </div>
                    </Link>
                  </div>
                )
              })}
            </div>

            {/* Buttons at bottom of day */}
            {dayWords.length > 0 && (
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {/* Day test */}
                <button
                  onClick={() => setTestDay(activeDay)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-accent-foreground font-semibold text-sm hover:opacity-90 transition-opacity shadow-md"
                >
                  <FlaskConical size={18} />
                  Test Day {activeDay}
                </button>

                {/* Learned test — only shown when signed in and has learned words */}
                {user && allLearnedWords.length > 0 && (
                  <button
                    onClick={() => setShowLearnedModal(true)}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-secondary border border-border text-foreground font-semibold text-sm hover:bg-border transition-colors shadow-md"
                  >
                    <BookOpenCheck size={18} />
                    Test Learned ({allLearnedWords.length})
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Learned test count picker modal */}
      {showLearnedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-sm mx-4 bg-background border border-border rounded-xl shadow-xl p-6">
            <button
              onClick={() => { setShowLearnedModal(false); setLearnedCountInput("") }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={18} />
            </button>

            <h2 className="text-lg font-bold text-foreground mb-1">Test Learned Words</h2>
            <p className="text-sm text-muted-foreground mb-5">
              You have <span className="text-foreground font-semibold">{allLearnedWords.length}</span> learned words.
              How many do you want to be tested on?
            </p>

            {/* Quick pick buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[5, 10, 20, allLearnedWords.length].filter((n, i, arr) => arr.indexOf(n) === i && n <= allLearnedWords.length).map((n) => (
                <button
                  key={n}
                  onClick={() => setLearnedCountInput(String(n))}
                  className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                    learnedCountInput === String(n)
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:bg-border"
                  }`}
                >
                  {n === allLearnedWords.length ? `All (${n})` : n}
                </button>
              ))}
            </div>

            {/* Custom number input */}
            <input
              type="number"
              min={1}
              max={allLearnedWords.length}
              value={learnedCountInput}
              onChange={(e) => setLearnedCountInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStartLearnedTest()}
              placeholder={`1 – ${allLearnedWords.length}`}
              className="w-full px-3 py-2.5 rounded-md bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent mb-4"
            />

            <button
              onClick={handleStartLearnedTest}
              disabled={!learnedCountInput || parseInt(learnedCountInput) < 1}
              className="w-full py-2.5 rounded-md bg-accent text-accent-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Start Test
            </button>
          </div>
        </div>
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {testDay !== null && (
        <DayTest
          words={testWords}
          dayNumber={testDay}
          onClose={() => setTestDay(null)}
        />
      )}

      {learnedTestWords !== null && (
        <DayTest
          words={learnedTestWords}
          dayNumber={-1}
          onClose={() => setLearnedTestWords(null)}
        />
      )}

      <Footer />
    </div>
  )
}