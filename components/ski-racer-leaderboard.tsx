"use client"

import { useState, useEffect, type FormEvent } from "react"
import { useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RefreshCw, Search } from "lucide-react"
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
  const [selectedClub, setSelectedClub] = useState<string | null>(null)
  const [sortColumn, setSortColumn] = useState<"bib" | "run1" | "run2" | "total">("total")
  const [sortAscending, setSortAscending] = useState<boolean>(false)

  // Function to load race data from the API
  const loadRaceData = async (id: string) => {
    setIsLoading(true)
    setError(null)

    if (!id) {
      setError("No race ID available to load data.");
      setIsLoading(false);
      return;
    }

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
    loadRaceData(raceId)

    // Clean up interval on component unmount
    return () => {} // Return empty cleanup function
  }, [raceId]) // Re-run when raceId changes

  // Function to manually retry loading data
  const handleRetry = () => {
    loadRaceData(raceId)
  }

  // Synchronize raceId state with query parameter and input field
  useEffect(() => {
    // Case 1: queryRaceId is present in the URL
    if (queryRaceId) {
      // If the current raceId state is different from queryRaceId, update it.
      // This ensures the URL parameter is always honored.
      if (raceId !== queryRaceId) {
        setRaceId(queryRaceId)
      }
      // Also ensure the input field reflects the queryRaceId, but only if it's not already.
      if (inputRaceId !== queryRaceId) {
        setInputRaceId(queryRaceId)
      }
    } else {
      // Case 2: queryRaceId is NOT present in the URL
      // The raceId state should then be driven by the inputRaceId.
      // If raceId state is different from the current inputRaceId, update it.
      const effectiveInputRaceId = inputRaceId || "299423";
      if (raceId !== effectiveInputRaceId) {
        setRaceId(effectiveInputRaceId)
      }
      // inputRaceId itself is already managed by its onChange handler.
    }
  }, [queryRaceId, raceId, inputRaceId]) // Ensure all relevant states are dependencies


  // Toggle debug mode
  const toggleDebug = () => {
    setShowDebug(!showDebug)
  }

  // Handle race ID form submission
  const handleRaceIdSubmit = (e: FormEvent) => {
    e.preventDefault()
    setRaceId(inputRaceId)
  }

  // Sort racers based on selected column
  const sortedRacers = [...racers].sort((a, b) => {
    // Check if racers have DNS or DNF status - push to bottom
    const aHasDNSOrDNF = a.run1Status === "DNS" || a.run2Status === "DNS" || a.run1Status === "DNF" || a.run2Status === "DNF"
    const bHasDNSOrDNF = b.run1Status === "DNS" || b.run2Status === "DNS" || b.run1Status === "DNF" || b.run2Status === "DNF"

    // If only one has DNS/DNF, that one goes to the bottom
    if (aHasDNSOrDNF && !bHasDNSOrDNF) return 1
    if (!aHasDNSOrDNF && bHasDNSOrDNF) return -1
    
    // If both have DNS/DNF, keep original order
    if (aHasDNSOrDNF && bHasDNSOrDNF) return 0

    let aValue: number | string = 0
    let bValue: number | string = 0

    if (sortColumn === "bib") {
      aValue = a.bibNumber
      bValue = b.bibNumber
    } else if (sortColumn === "run1") {
      aValue = typeof a.result1Time === "number" ? a.result1Time : Infinity
      bValue = typeof b.result1Time === "number" ? b.result1Time : Infinity
    } else if (sortColumn === "run2") {
      aValue = typeof a.result2Time === "number" ? a.result2Time : Infinity
      bValue = typeof b.result2Time === "number" ? b.result2Time : Infinity
    } else {
      aValue = a.totalTime ?? Infinity
      bValue = b.totalTime ?? Infinity
    }

    if (typeof aValue === "string" || typeof bValue === "string") {
      return sortAscending 
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue))
    }
    // For time columns, invert the logic: lower times are better (faster)
    if (sortColumn !== "bib") {
      return sortAscending ? bValue - aValue : aValue - bValue
    }
    return sortAscending ? aValue - bValue : bValue - aValue
  })

  // Handle sort column click
  const handleSortClick = (column: "bib" | "run1" | "run2" | "total") => {
    if (sortColumn === column) {
      setSortAscending(!sortAscending)
    } else {
      setSortColumn(column)
      setSortAscending(false)
    }
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
                disabled={!!queryRaceId}
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

      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 text-center">#</TableHead>
              <TableHead 
                className="w-16 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSortClick("bib")}
              >
                Bib {sortColumn === "bib" && (sortAscending ? "↑" : "↓")}
              </TableHead>
              <TableHead>Racer</TableHead>
              <TableHead className="w-16">Club</TableHead>
              <TableHead className="w-16">Class</TableHead>
              <TableHead 
                className="w-20 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSortClick("run1")}
              >
                Run 1 {sortColumn === "run1" && (sortAscending ? "↑" : "↓")}
              </TableHead>
              <TableHead 
                className="w-20 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSortClick("run2")}
              >
                Run 2 {sortColumn === "run2" && (sortAscending ? "↑" : "↓")}
              </TableHead>
              <TableHead 
                className="w-20 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSortClick("total")}
              >
                Total Time {sortColumn === "total" && (sortAscending ? "↑" : "↓")}
              </TableHead>
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
                    <span className="text-slate-500">
                      No racers found
                    </span>
                    <Button onClick={handleRetry} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
                        ) : (
                          sortedRacers.map((racer, index) => {
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
                    <TableCell className="w-20 font-mono text-center text-sm">
                      {renderRunTime(racer.result1Time, racer.run1Status || "")}
                    </TableCell>
                    <TableCell className="w-20 font-mono text-center text-sm">
                      {renderRunTime(racer.result2Time, racer.run2Status || "")}
                    </TableCell>
                    <TableCell className="w-20 font-mono text-center text-sm font-semibold">
                      {typeof racer.totalTime === "number" && !Number.isNaN(racer.totalTime) ? formatTime(racer.totalTime) : "--:--.--"}
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