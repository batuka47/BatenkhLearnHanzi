"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"

// Map of wordId -> learned boolean
type ProgressMap = Record<string, boolean>

export function useProgress() {
  const { user } = useAuth()
  const [progress, setProgress] = useState<ProgressMap>({})
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  // Load all progress for current user
  useEffect(() => {
    if (!user) {
      setProgress({})
      return
    }

    setLoading(true)
    supabase
      .from("user_progress")
      .select("word_id, learned")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (!error && data) {
          const map: ProgressMap = {}
          data.forEach((row) => {
            map[row.word_id] = row.learned
          })
          setProgress(map)
        }
        setLoading(false)
      })
  }, [user?.id])

  // Toggle learned status for a word
  const toggleLearned = useCallback(async (wordId: string) => {
    if (!user) return

    const current = progress[wordId] ?? false
    const next = !current

    // Optimistic update
    setProgress((prev) => ({ ...prev, [wordId]: next }))

    const { error } = await supabase
      .from("user_progress")
      .upsert(
        { user_id: user.id, word_id: wordId, learned: next, updated_at: new Date().toISOString() },
        { onConflict: "user_id,word_id" }
      )

    // Revert on error
    if (error) {
      setProgress((prev) => ({ ...prev, [wordId]: current }))
      console.error("Failed to save progress:", error.message)
    }
  }, [user, progress])

  const isLearned = useCallback((wordId: string) => progress[wordId] ?? false, [progress])

  const learnedCount = Object.values(progress).filter(Boolean).length

  return { progress, loading, toggleLearned, isLearned, learnedCount }
}