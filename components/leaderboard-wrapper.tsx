"use client"

import { Suspense } from "react"
import SkiRacerLeaderboard from "@/components/ski-racer-leaderboard"

export function LeaderboardWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-8">Loading leaderboard...</div>}>
      <SkiRacerLeaderboard />
    </Suspense>
  )
}
