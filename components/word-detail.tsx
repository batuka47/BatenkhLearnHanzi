"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import HanziWriter from "hanzi-writer"
import { Volume2, CheckCircle2, Circle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useProgress } from "@/hooks/use-progress"

interface Word {
  id: string
  hanzi: string
  pinyin: string
  hskLevel: number
  meaningEn: string
  meaningMn: string
  audioUrl: string
}

interface WordDetailProps {
  word: Word
}

export default function WordDetail({ word }: WordDetailProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const writersRef = useRef<(HanziWriter | null)[]>([])
  const charRefs = useRef<(HTMLDivElement | null)[]>([])
  const [canvasSize, setCanvasSize] = useState(200)
  const [activeChar, setActiveChar] = useState<number | null>(null)
  const [writersReady, setWritersReady] = useState(false)

  const { user } = useAuth()
  const { isLearned, toggleLearned } = useProgress()
  const learned = isLearned(word.id)

  const characters = word.hanzi.split("")

  // Responsive canvas size
  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth
      const charCount = characters.length
      if (width < 640) {
        setCanvasSize(Math.min(width - 48, 250))
      } else if (width < 1024) {
        setCanvasSize(Math.max(180, Math.min((width - 80) / charCount - 16, 280)))
      } else {
        setCanvasSize(Math.max(220, Math.min((width - 120) / charCount - 24, 350)))
      }
    }
    updateSize()
    window.addEventListener("resize", updateSize)
    return () => window.removeEventListener("resize", updateSize)
  }, [characters.length])

  // Initialize HanziWriter instances
  useEffect(() => {
    writersRef.current.forEach((writer) => {
      if (writer && typeof writer.destroy === "function") writer.destroy()
    })
    writersRef.current = []
    setWritersReady(false)

    const newWriters: (HanziWriter | null)[] = []

    characters.forEach((char, index) => {
      const el = charRefs.current[index]
      if (!el) { newWriters.push(null); return }
      el.innerHTML = ""
      try {
        const writer = HanziWriter.create(el, char, {
          width: canvasSize,
          height: canvasSize,
          padding: 15,
          strokeAnimationSpeed: 1,
          strokeHighlightSpeed: 2,
          delayBetweenStrokes: 100,
        })
        newWriters.push(writer)
      } catch {
        newWriters.push(null)
      }
    })

    writersRef.current = newWriters
    setWritersReady(true)

    return () => {
      writersRef.current.forEach((writer) => {
        if (writer && typeof writer.destroy === "function") writer.destroy()
      })
    }
  }, [characters.join(""), canvasSize])

  const handlePlayAnimation = useCallback((index: number) => {
    const writer = writersRef.current[index]
    if (writer) {
      setActiveChar(index)
      writer.animateCharacter({ onComplete: () => setActiveChar(null) })
    }
  }, [])

  const handlePlayAllAnimation = useCallback(() => {
    let currentIndex = 0
    const animateNext = () => {
      if (currentIndex >= writersRef.current.length) { setActiveChar(null); return }
      const writer = writersRef.current[currentIndex]
      if (writer) {
        setActiveChar(currentIndex)
        writer.animateCharacter({ onComplete: () => { currentIndex++; animateNext() } })
      } else {
        currentIndex++
        animateNext()
      }
    }
    animateNext()
  }, [])

  const handleStartQuiz = useCallback((index: number) => {
    const writer = writersRef.current[index]
    if (writer) {
      setActiveChar(index)
      writer.quiz({ onComplete: () => setActiveChar(null) })
    }
  }, [])

  const playAudio = () => {
    if (!word.audioUrl) return
    const audio = new Audio(word.audioUrl)
    audio.play().catch(() => {
      // Audio file not found - silently fail
      console.warn("Audio not available for:", word.id)
    })
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Character Display */}
      <div
        ref={containerRef}
        className="flex-1 flex flex-col sm:flex-row items-center justify-start sm:justify-center gap-6 sm:gap-8 lg:gap-10 bg-gradient-to-br from-background to-secondary/20 p-4 sm:p-6 overflow-y-auto"
      >
        {characters.map((char, index) => (
          <div key={`${char}-${index}`} className="flex flex-col items-center">
            <p className={`text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 transition-colors ${
              activeChar === index ? "text-accent" : "text-foreground"
            }`}>
              {char}
            </p>

            <div
              ref={(el) => { charRefs.current[index] = el }}
              className={`bg-background rounded-lg shadow-lg border-2 transition-colors ${
                activeChar === index ? "border-accent" : "border-transparent"
              }`}
            />

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handlePlayAnimation(index)}
                disabled={!writersReady || !writersRef.current[index]}
                className="px-3 py-1.5 text-xs sm:text-sm rounded-md bg-secondary border border-border text-foreground hover:bg-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Animate
              </button>
              <button
                onClick={() => handleStartQuiz(index)}
                disabled={!writersReady || !writersRef.current[index]}
                className="px-3 py-1.5 text-xs sm:text-sm rounded-md bg-secondary border border-border text-foreground hover:bg-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Practice
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Info Bar */}
      <div className="flex-shrink-0 bg-secondary border-t border-border p-3 sm:p-4 lg:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 lg:gap-4 mb-3 sm:mb-4">
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide mb-0.5 sm:mb-1">Pinyin</p>
              <p className="text-sm sm:text-lg font-semibold text-foreground">{word.pinyin}</p>
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide mb-0.5 sm:mb-1">English</p>
              <p className="text-xs sm:text-base text-foreground truncate">{word.meaningEn}</p>
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide mb-0.5 sm:mb-1">Mongolian</p>
              <p className="text-xs sm:text-base text-foreground truncate">{word.meaningMn}</p>
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide mb-0.5 sm:mb-1">HSK</p>
              <p className="text-sm sm:text-lg font-semibold text-accent">Lvl {word.hskLevel}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={playAudio}
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-md bg-accent text-accent-foreground hover:opacity-90 transition-opacity font-medium text-sm sm:text-base"
            >
              <Volume2 size={16} />
              <span>Audio</span>
            </button>

            {characters.length > 1 && (
              <button
                onClick={handlePlayAllAnimation}
                disabled={!writersReady}
                className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-md bg-background border border-border text-foreground hover:bg-border transition-colors font-medium text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Animate All
              </button>
            )}

            {/* Learned toggle — only shown when signed in */}
            {user && (
              <button
                onClick={() => toggleLearned(word.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-md font-medium text-sm sm:text-base transition-all border ${
                  learned
                    ? "bg-accent/10 border-accent/40 text-accent hover:bg-accent/20"
                    : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-border"
                }`}
              >
                {learned
                  ? <><CheckCircle2 size={16} /><span>Learned</span></>
                  : <><Circle size={16} /><span>Mark as learned</span></>
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}