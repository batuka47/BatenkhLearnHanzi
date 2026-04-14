"use client"

import { useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"

export interface TestResult {
  id: string
  test_type: "day" | "learned"
  day_number: number | null
  score: number
  total: number
  missed_word_ids: string[]
  all_word_ids: string[]   // full ordered list of words in the test
  taken_at: string
}

export function useTestHistory() {
  const { user } = useAuth()
  const supabase = createClient()

  const saveResult = useCallback(
    async (params: {
      test_type: "day" | "learned"
      day_number: number | null
      score: number
      total: number
      missed_word_ids: string[]
      all_word_ids: string[]
    }) => {
      if (!user) return
      await supabase.from("test_history").insert({ user_id: user.id, ...params })
    },
    [user]
  )

  const fetchHistory = useCallback(async (): Promise<TestResult[]> => {
    if (!user) return []
    const { data, error } = await supabase
      .from("test_history")
      .select("*")
      .eq("user_id", user.id)
      .order("taken_at", { ascending: false })
      .limit(100)
    if (error || !data) return []
    return data as TestResult[]
  }, [user])

  return { saveResult, fetchHistory }
}