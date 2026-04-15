"use client"

import { useParams, useRouter } from "next/navigation"
import WordDetail from "@/components/word-detail"
import { ThemeToggle } from "@/components/theme-toggle"
import { words } from "@/lib/words-data"
import { ChevronLeft } from "lucide-react"
import { Suspense } from "react"

export default function WordPage() {
  const params = useParams()
  const router = useRouter()
  const wordId = params.id as string

  const word = words.find((w) => w.id === wordId)

  if (!word) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Word not found</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-md bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <header className="flex-shrink-0 flex items-center justify-between p-3 sm:p-4 border-b border-border bg-background gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary border border-border text-foreground hover:bg-border transition-colors flex-shrink-0"
          >
            <ChevronLeft size={18} />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="ml-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-semibold text-foreground leading-tight">{word.hanzi}</h1>
              <span className="text-sm text-accent font-medium">{word.pinyin}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {word.meaningEn} · {word.meaningMn}
            </p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading...</div>}>
        <WordDetail word={word} />
      </Suspense>
    </div>
  )
}