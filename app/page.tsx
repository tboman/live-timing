import { Suspense } from "react"
import SkiRacerLeaderboard from "@/components/ski-racer-leaderboard"

export default function Home() {
  return (
    <main className="container mx-auto py-8 px-4">
      <Suspense fallback={<div className="text-center py-8">Loading leaderboard...</div>}>
        <SkiRacerLeaderboard />
      </Suspense>
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>
          To specify a race ID in the URL, use: <code>?raceId=YOUR_RACE_ID</code>
        </p>
        <p>
          Example: <code>/app?raceId=295659</code>
        </p>
      </div>
    </main>
  )
}
