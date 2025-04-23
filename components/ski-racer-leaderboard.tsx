"use client"

import { useState, useEffect, type FormEvent } from "react"
import { useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RefreshCw, Bug, Search } from "lucide-react"
import { fetchRaceData, convertToAppRacer, formatTime } from "@/utils/api"

// Racer interface
interface Racer {
  id: number
  name: string
  startNumber: number
  bibNumber: number
  club: string
  class: string // Changed from "U12" | "U14" to string
  result1Time: number | null | "on course"
  result2Time: number | null | "on course"
  totalTime: number | null
  run1Status?: string
  run2Status?: string
  rawR1?: string
  rawR2?: string
}

export default function SkiRacerLeaderboard() {
  // Get search params for race ID
  const searchParams = useSearchParams()
  const queryRaceId = searchParams.get("raceId")

  const [racers, setRacers] = useState<Racer[]>([])
  const [raceName, setRaceName] = useState<string>("Ski Race Leaderboard")
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string>("")
  const [debugInfo, setDebugInfo] = useState<string>("")
  const [rawData, setRawData] = useState<string>("")
  const [showDebug, setShowDebug] = useState<boolean>(false)
  const [raceId, setRaceId] = useState<string>(queryRaceId || "295922")
  const [inputRaceId, setInputRaceId] = useState<string>(queryRaceId || "295922")

  // Function to load race data from the API
  const loadRaceData = async (id = raceId) => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await fetchRaceData(id)

      // Store raw data for debugging
      if (data.rawData) {
        setRawData(data.rawData)
      }

      if (data.racers.length > 0) {
        // Convert the API data to our app's format
        const convertedRacers = data.racers.map((racer, index) => convertToAppRacer(racer, index + 1))

        setRacers(convertedRacers)
        setRaceName(data.raceName || "Ski Race Leaderboard")
        setDebugInfo(`Found ${data.racers.length} unique racers (after handling duplicates)`)

        // Set last updated time
        setLastUpdated(new Date().toLocaleTimeString())
      } else {
        setError("No racers found in the data")
        setDebugInfo(`API returned 0 racers. Race ID: ${id}`)
      }
    } catch (err) {
      setError("Failed to load race data")
      setDebugInfo(err instanceof Error ? err.message : String(err))
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  // Load race data on component mount and when raceId changes
  useEffect(() => {
    loadRaceData()

    // Set up auto-refresh every 30 seconds
    const intervalId = setInterval(() => {
      loadRaceData()
    }, 30000)

    // Clean up interval on component unmount
    return () => clearInterval(intervalId)
  }, [raceId]) // Re-run when raceId changes

  // Update raceId when query parameter changes
  useEffect(() => {
    if (queryRaceId) {
      setRaceId(queryRaceId)
      setInputRaceId(queryRaceId)
      loadRaceData(queryRaceId)
    }
  }, [queryRaceId])

  // Function to manually retry loading data
  const handleRetry = () => {
    loadRaceData()
  }

  // Toggle debug mode
  const toggleDebug = () => {
    setShowDebug(!showDebug)
  }

  // Handle race ID form submission
  const handleRaceIdSubmit = (e: FormEvent) => {
    e.preventDefault()
    setRaceId(inputRaceId)
    loadRaceData(inputRaceId)
  }

  // Function to render run time with status
  const renderRunTime = (time: number | null | "on course", status: string) => {
    if (time === "on course") {
      // Don't show "On Course" text in time columns, only show "--:--.--"
      return "--:--.--"
    } else if (time) {
      return formatTime(time)
    } else if (status === "DNS") {
      return <span className="text-gray-500 font-semibold">DNS</span>
    } else if (status === "DNF") {
      return <span className="text-orange-500 font-semibold">DNF</span>
    } else if (status === "DSQ") {
      return <span className="text-red-500 font-semibold">DSQ</span>
    } else {
      return "--:--.--"
    }
  }

  // Function to determine the overall status of a racer
  const getRacerStatus = (racer: Racer) => {
    // Check for DNS status from r1= or r2= fields
    if (racer.run1Status === "DNS" || racer.run2Status === "DNS") {
      return { text: "DNS", color: "text-gray-500 bg-gray-100" }
    }

    // Check for DSQ status from r1= or r2= fields
    if (racer.run1Status === "DSQ" || racer.run2Status === "DSQ") {
      return { text: "DSQ", color: "text-red-500 bg-red-50" }
    }

    // Check for DNF status from r1= or r2= fields
    if (racer.run1Status === "DNF" || racer.run2Status === "DNF") {
      return { text: "DNF", color: "text-orange-500 bg-orange-50" }
    }

    // Check for "on course" status
    if (racer.result1Time === "on course" || racer.result2Time === "on course") {
      return { text: "On Course", color: "text-amber-600 bg-amber-50" }
    }

    // Check if racer has completed both runs with actual times
    if (typeof racer.result1Time === "number" && typeof racer.result2Time === "number") {
      return { text: "Finished", color: "text-green-600 bg-green-50" }
    }

    // Check if racer has completed run 1 but not run 2
    if (typeof racer.result1Time === "number" && racer.result2Time === null) {
      return { text: "Run 1 Complete", color: "text-blue-600 bg-blue-50" }
    }

    // Default status
    return { text: "Waiting", color: "text-slate-500 bg-slate-50" }
  }

  return (
    <Card className="w-full max-w-7xl mx-auto">
      <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl">{raceName}</CardTitle>
          <div className="space-x-2">
            <Button
              onClick={handleRetry}
              variant="outline"
              className="text-white border-white hover:bg-slate-600"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Loading..." : "Refresh Data"}
            </Button>
            <Button onClick={toggleDebug} variant="outline" className="text-white border-white hover:bg-slate-600">
              <Bug className="h-4 w-4 mr-2" />
              {showDebug ? "Hide Debug" : "Debug"}
            </Button>
          </div>
        </div>

        {/* Race ID Input Form - Only show if no query parameter is provided */}
        {!queryRaceId && (
          <form onSubmit={handleRaceIdSubmit} className="mt-4 flex space-x-2">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Enter Race ID"
                value={inputRaceId}
                onChange={(e) => setInputRaceId(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
            <Button type="submit" variant="secondary" disabled={isLoading}>
              <Search className="h-4 w-4 mr-2" />
              Load Race
            </Button>
          </form>
        )}

        <div className="flex justify-between items-center mt-2 text-sm text-slate-300">
          <div>{lastUpdated && `Last updated: ${lastUpdated} (Race ID: ${raceId})`}</div>
          {error && (
            <div className="text-red-300">
              Error: {error} ({debugInfo})
            </div>
          )}
        </div>

        {showDebug && (
          <div className="mt-4 p-2 bg-slate-900 rounded text-xs font-mono overflow-auto max-h-40">
            <div className="mb-2 text-slate-400">Debug Info: {debugInfo}</div>
            <div className="text-slate-400">Raw Data Sample:</div>
            <pre className="text-green-300 whitespace-pre-wrap">{rawData}</pre>
            <div className="mt-2 text-slate-400">Status Debug:</div>
            <div className="text-yellow-300">
              {racers.slice(0, 5).map((racer, index) => (
                <div key={index}>
                  Bib {racer.bibNumber}: r1="{racer.rawR1}" → status="{racer.run1Status}", r2="{racer.rawR2}" → status="
                  {racer.run2Status}", time1={typeof racer.result1Time === "number" ? "number" : racer.result1Time},
                  time2={typeof racer.result2Time === "number" ? "number" : racer.result2Time}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Start</TableHead>
              <TableHead className="w-16">Bib</TableHead>
              <TableHead>Racer</TableHead>
              <TableHead className="w-16">Club</TableHead>
              <TableHead className="w-16">Class</TableHead>
              <TableHead className="w-36">Status</TableHead>
              <TableHead className="w-32 text-right">Run 1</TableHead>
              <TableHead className="w-32 text-right">Run 2</TableHead>
              <TableHead className="w-32 text-right">Total Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && racers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <div className="flex flex-col items-center justify-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-slate-400 mb-2" />
                    <span className="text-slate-500">Loading race data...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : racers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <span className="text-slate-500">No racers found</span>
                    <Button onClick={handleRetry} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              racers.map((racer) => {
                const status = getRacerStatus(racer)
                return (
                  <TableRow
                    key={racer.id}
                    className={
                      racer.run1Status === "DNS" || racer.run2Status === "DNS"
                        ? "bg-gray-50"
                        : racer.totalTime
                          ? "bg-slate-50"
                          : ""
                    }
                  >
                    <TableCell className="font-medium">{racer.startNumber}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-sm font-mono">
                        {racer.bibNumber}
                      </Badge>
                    </TableCell>
                    <TableCell>{racer.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {racer.club}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">
                        {racer.class}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${status.color} border px-2 py-1 font-semibold`}>{status.text}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {renderRunTime(racer.result1Time, racer.run1Status || "")}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {renderRunTime(racer.result2Time, racer.run2Status || "")}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {racer.totalTime ? (
                        formatTime(racer.totalTime)
                      ) : racer.run1Status === "DNS" || racer.run2Status === "DNS" ? (
                        <span className="text-gray-500 font-semibold">DNS</span>
                      ) : racer.run1Status === "DNF" || racer.run2Status === "DNF" ? (
                        <span className="text-orange-500 font-semibold">DNF</span>
                      ) : racer.run1Status === "DSQ" || racer.run2Status === "DSQ" ? (
                        <span className="text-red-500 font-semibold">DSQ</span>
                      ) : (
                        "--:--.--"
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
