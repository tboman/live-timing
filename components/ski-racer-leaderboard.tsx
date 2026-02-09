"use client"

import { useState, useEffect, type FormEvent } from "react"
import { useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RefreshCw } from "lucide-react"
import { fetchRaceData, convertToAppRacer, formatTime, formatCompletionTime, formatCompletionTimeWithDate } from "@/utils/api"

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
  // Millisecond timestamp from the live-timing `ms=` field (if provided)
  timestamp?: number | null
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
  const [raceId, setRaceId] = useState<string>(queryRaceId || "299423")
  const [inputRaceId, setInputRaceId] = useState<string>(queryRaceId || "299423")
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set())
  const [selectedClub, setSelectedClub] = useState<string | null>(null)

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

        // Sort by completion time (timestamp) in ascending order (earliest first)
        const sortedRacers = convertedRacers.sort((a, b) => {
          const timeA = a.timestamp || 0
          const timeB = b.timestamp || 0
          return timeA - timeB
        })

        setRacers(sortedRacers)
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

  // Toggle class filter
  const toggleClassFilter = (className: string) => {
    const newSelection = new Set(selectedClasses)
    if (newSelection.has(className)) {
      newSelection.delete(className)
    } else {
      newSelection.add(className)
    }
    setSelectedClasses(newSelection)
  }

  // Get unique classes from racers
  const uniqueClasses = Array.from(new Set(racers.map((racer) => racer.class))).sort()

  // Filter racers by selected classes
  const filteredRacers = selectedClasses.size === 0
    ? racers
    : racers.filter((racer) => selectedClasses.has(racer.class))

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

        {/* Class Filter */}
        {uniqueClasses.length > 0 && (
          <div className="mt-4 p-3 bg-slate-700 rounded">
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm font-semibold text-white">Filter by Class:</div>
              {selectedClub && (
                <Button
                  onClick={() => setSelectedClub(null)}
                  variant="ghost"
                  size="sm"
                  className="text-blue-300 hover:text-blue-100 text-xs"
                >
                  Clear Club Selection
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {uniqueClasses.map((className) => (
                <Button
                  key={className}
                  onClick={() => toggleClassFilter(className)}
                  variant={selectedClasses.has(className) ? "default" : "outline"}
                  className={`text-xs ${
                    selectedClasses.has(className)
                      ? "bg-blue-600 border-blue-600"
                      : "border-slate-600 text-white hover:bg-slate-600"
                  }`}
                >
                  {className}
                </Button>
              ))}
            </div>
          </div>
        )}


      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 text-center">#</TableHead>
              <TableHead className="w-16">Bib</TableHead>
              <TableHead>Racer</TableHead>
              <TableHead className="w-16">Club</TableHead>
              <TableHead className="w-16">Class</TableHead>
              <TableHead className="w-40">Start Time</TableHead>
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
            ) : filteredRacers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <span className="text-slate-500">
                      {selectedClasses.size > 0 ? "No racers found in selected classes" : "No racers found"}
                    </span>
                    {selectedClasses.size > 0 && (
                      <Button
                        onClick={() => setSelectedClasses(new Set())}
                        variant="outline"
                        size="sm"
                      >
                        Clear Filters
                      </Button>
                    )}
                    <Button onClick={handleRetry} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredRacers.map((racer, index) => {
                const status = getRacerStatus(racer)
                const isClubHighlighted = selectedClub && selectedClub === racer.club
                return (
                  <TableRow
                    key={racer.id}
                    className={`${
                      isClubHighlighted
                        ? "bg-blue-100"
                        : racer.run1Status === "DNS" || racer.run2Status === "DNS"
                          ? "bg-gray-50"
                          : racer.totalTime
                            ? "bg-slate-50"
                            : ""
                    }`}
                  >
                    <TableCell className="text-center font-medium text-gray-500">{index + 1}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-sm font-mono">
                        {racer.bibNumber}
                      </Badge>
                    </TableCell>
                    <TableCell>{racer.name}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={`font-mono cursor-pointer transition-colors ${
                          selectedClub === racer.club
                            ? "bg-blue-500 text-white border-blue-500 hover:bg-blue-600"
                            : "hover:bg-slate-100"
                        }`}
                        onClick={() => setSelectedClub(selectedClub === racer.club ? null : racer.club)}
                      >
                        {racer.club}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">
                        {racer.class}
                      </Badge>
                    </TableCell>
                    <TableCell className="w-56 font-mono text-center text-sm">
                      <div title={formatCompletionTimeWithDate(racer.timestamp)}>
                        {formatCompletionTime(racer.timestamp)}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
      <div className="p-4 border-t bg-slate-50 flex space-x-2 justify-center">
        <Button
          onClick={handleRetry}
          variant="outline"
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Loading..." : "Refresh Data"}
        </Button>
      </div>
    </Card>
  )
}
