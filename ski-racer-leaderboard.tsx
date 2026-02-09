"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Play, Flag, Clock, XCircle, AlertTriangle, MoreHorizontal, Ban, RefreshCw } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { fetchRaceData, convertToAppRacer } from "../utils/api"

// Racer status types
type RacerStatus = "waiting" | "lap1" | "lap1_finished" | "lap2" | "finished" | "disqualified" | "dns" | "dnf"

// Racer interface
interface Racer {
  id: number
  name: string
  startNumber: number
  bibNumber: number
  club: string
  class: "U12" | "U14"
  status: RacerStatus
  startTime: number | null
  lap1StartTime: number | null
  lap1FinishTime: number | null
  lap2StartTime: number | null
  lap2FinishTime: null
  result1Time: number | null
  result2Time: number | null
  totalTime: number | null
  lap1Position: number | null
  position: number | null
  disqualificationReason: string | null
  dnfReason: string | null
}

// Generate a random bib number between 1 and 300
const getRandomBibNumber = (): number => {
  return Math.floor(Math.random() * 300) + 1
}

export default function SkiRacerLeaderboard() {
  // Sample initial data with random bib numbers
  const initialRacers: Racer[] = [
    {
      id: 1,
      startNumber: 1,
      bibNumber: getRandomBibNumber(),
      name: "Anna Swenn-Larsson",
      club: "SWE",
      class: "U14",
      status: "waiting",
      startTime: null,
      lap1StartTime: null,
      lap1FinishTime: null,
      lap2StartTime: null,
      lap2FinishTime: null,
      result1Time: null,
      result2Time: null,
      totalTime: null,
      lap1Position: null,
      position: null,
      disqualificationReason: null,
      dnfReason: null,
    },
    {
      id: 2,
      startNumber: 2,
      bibNumber: getRandomBibNumber(),
      name: "Mikaela Shiffrin",
      club: "USST",
      class: "U14",
      status: "waiting",
      startTime: null,
      lap1StartTime: null,
      lap1FinishTime: null,
      lap2StartTime: null,
      lap2FinishTime: null,
      result1Time: null,
      result2Time: null,
      totalTime: null,
      lap1Position: null,
      position: null,
      disqualificationReason: null,
      dnfReason: null,
    },
    {
      id: 3,
      startNumber: 3,
      bibNumber: getRandomBibNumber(),
      name: "Wendy Holdener",
      club: "SUI",
      class: "U14",
      status: "waiting",
      startTime: null,
      lap1StartTime: null,
      lap1FinishTime: null,
      lap2StartTime: null,
      lap2FinishTime: null,
      result1Time: null,
      result2Time: null,
      totalTime: null,
      lap1Position: null,
      position: null,
      disqualificationReason: null,
      dnfReason: null,
    },
    {
      id: 4,
      startNumber: 4,
      bibNumber: getRandomBibNumber(),
      name: "Petra Vlhova",
      club: "SVK",
      class: "U14",
      status: "waiting",
      startTime: null,
      lap1StartTime: null,
      lap1FinishTime: null,
      lap2StartTime: null,
      lap2FinishTime: null,
      result1Time: null,
      result2Time: null,
      totalTime: null,
      lap1Position: null,
      position: null,
      disqualificationReason: null,
      dnfReason: null,
    },
  ]

  const [racers, setRacers] = useState<Racer[]>(initialRacers)
  const [raceName, setRaceName] = useState<string>("Ski Race Leaderboard")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Function to load race data from the API
  const loadRaceData = async (raceId = "295190") => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await fetchRaceData(raceId)

      if (data.racers.length > 0) {
        // Convert the API data to our app's format
        const convertedRacers = data.racers.map((racer, index) => convertToAppRacer(racer, index + 1))

        setRacers(convertedRacers)
        setRaceName(data.raceName || "Ski Race Leaderboard")

        // Calculate positions
        calculatePositions(convertedRacers)
      } else {
        setError("No racers found in the data")
      }
    } catch (err) {
      setError("Failed to load race data")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate positions for racers
  const calculatePositions = (racerList: Racer[]) => {
    // Calculate lap 1 positions
    const lap1FinishedRacers = [...racerList]
      .filter(
        (racer) =>
          (racer.status === "lap1_finished" || racer.status === "lap2" || racer.status === "finished") &&
          racer.result1Time !== null,
      )
      .sort((a, b) => (a.result1Time || Number.POSITIVE_INFINITY) - (b.result1Time || Number.POSITIVE_INFINITY))

    lap1FinishedRacers.forEach((racer, index) => {
      racer.lap1Position = index + 1
    })

    // Calculate final positions
    const finishedRacers = [...racerList]
      .filter((racer) => racer.status === "finished" && racer.totalTime !== null)
      .sort((a, b) => (a.totalTime || Number.POSITIVE_INFINITY) - (b.totalTime || Number.POSITIVE_INFINITY))

    finishedRacers.forEach((racer, index) => {
      racer.position = index + 1
    })

    setRacers([...racerList])
  }

  // Load race data on component mount
  useEffect(() => {
    loadRaceData()
  }, [])

  // Function to start a racer on lap 1
  const startRacer = (id: number) => {
    const now = Date.now()
    setRacers((prevRacers) =>
      prevRacers.map((racer) =>
        racer.id === id
          ? {
              ...racer,
              status: "lap1",
              startTime: now,
              lap1StartTime: now,
            }
          : racer,
      ),
    )
  }

  // Function to finish lap 1 (stops the timer)
  const finishLap1 = (id: number) => {
    const now = Date.now()

    setRacers((prevRacers) => {
      // First update the current racer
      const updatedRacers = prevRacers.map((racer) =>
        racer.id === id && racer.lap1StartTime
          ? {
              ...racer,
              status: "lap1_finished",
              lap1FinishTime: now,
              result1Time: now - racer.lap1StartTime,
            }
          : racer,
      )

      // Then calculate lap 1 positions for all racers who have completed lap 1
      const lap1FinishedRacers = updatedRacers
        .filter(
          (racer) =>
            (racer.status === "lap1_finished" || racer.status === "lap2" || racer.status === "finished") &&
            racer.result1Time !== null,
        )
        .sort((a, b) => (a.result1Time || Number.POSITIVE_INFINITY) - (b.result1Time || Number.POSITIVE_INFINITY))

      // Assign lap 1 positions
      lap1FinishedRacers.forEach((racer, index) => {
        racer.lap1Position = index + 1
      })

      return updatedRacers
    })
  }

  // Function to start lap 2 (separate action)
  const startLap2 = (id: number) => {
    const now = Date.now()

    setRacers((prevRacers) => {
      return prevRacers.map((racer) =>
        racer.id === id && racer.status === "lap1_finished"
          ? {
              ...racer,
              status: "lap2",
              lap2StartTime: now,
            }
          : racer,
      )
    })
  }

  // Function to finish lap 2 and complete the race
  const finishLap2 = (id: number) => {
    const now = Date.now()

    setRacers((prevRacers) => {
      // First update the current racer
      const updatedRacers = prevRacers.map((racer) =>
        racer.id === id && racer.lap2StartTime && racer.result1Time
          ? {
              ...racer,
              status: "finished",
              lap2FinishTime: now,
              result2Time: now - racer.lap2StartTime,
              totalTime: racer.result1Time + (now - racer.lap2StartTime),
            }
          : racer,
      )

      // Then calculate positions for all finished racers
      const finishedRacers = updatedRacers
        .filter((racer) => racer.status === "finished" && racer.totalTime !== null)
        .sort((a, b) => (a.totalTime || Number.POSITIVE_INFINITY) - (b.totalTime || Number.POSITIVE_INFINITY))

      // Assign positions to finished racers
      finishedRacers.forEach((racer, index) => {
        racer.position = index + 1
      })

      return updatedRacers
    })
  }

  // Function to mark a racer as did not finish (DNF)
  const markAsDidNotFinish = (id: number, reason = "Crash") => {
    setRacers((prevRacers) => {
      // Update the racer status to DNF
      const updatedRacers = prevRacers.map((racer) =>
        racer.id === id
          ? {
              ...racer,
              status: "dnf",
              // Keep lap1 data if already set
              lap1FinishTime: racer.status === "lap1" ? null : racer.lap1FinishTime,
              result1Time: racer.result1Time,
              result2Time: null,
              totalTime: null,
              lap1Position: racer.lap1Position,
              position: null,
              dnfReason: reason,
            }
          : racer,
      )

      // Recalculate lap 1 positions
      const lap1FinishedRacers = updatedRacers
        .filter(
          (racer) =>
            (racer.status === "lap1_finished" || racer.status === "lap2" || racer.status === "finished") &&
            racer.result1Time !== null,
        )
        .sort((a, b) => (a.result1Time || Number.POSITIVE_INFINITY) - (b.result1Time || Number.POSITIVE_INFINITY))

      lap1FinishedRacers.forEach((racer, index) => {
        racer.lap1Position = index + 1
      })

      // Recalculate final positions
      const finishedRacers = updatedRacers
        .filter((racer) => racer.status === "finished" && racer.totalTime !== null)
        .sort((a, b) => (a.totalTime || Number.POSITIVE_INFINITY) - (b.totalTime || Number.POSITIVE_INFINITY))

      finishedRacers.forEach((racer, index) => {
        racer.position = index + 1
      })

      return updatedRacers
    })
  }

  // Function to mark a racer as disqualified (post-race)
  const disqualifyRacer = (id: number, reason = "Rule violation") => {
    setRacers((prevRacers) => {
      // Update the racer status to disqualified
      const updatedRacers = prevRacers.map((racer) =>
        racer.id === id
          ? {
              ...racer,
              status: "disqualified",
              // Keep lap1Position if already set
              lap1Position: racer.lap1Position,
              // Keep result times for reference but clear position
              result1Time: racer.result1Time,
              result2Time: racer.result2Time,
              totalTime: racer.totalTime,
              position: null,
              disqualificationReason: reason,
            }
          : racer,
      )

      // Recalculate lap 1 positions
      const lap1FinishedRacers = updatedRacers
        .filter(
          (racer) =>
            (racer.status === "lap1_finished" || racer.status === "lap2" || racer.status === "finished") &&
            racer.result1Time !== null,
        )
        .sort((a, b) => (a.result1Time || Number.POSITIVE_INFINITY) - (b.result1Time || Number.POSITIVE_INFINITY))

      lap1FinishedRacers.forEach((racer, index) => {
        racer.lap1Position = index + 1
      })

      // Recalculate final positions
      const finishedRacers = updatedRacers
        .filter((racer) => racer.status === "finished" && racer.totalTime !== null)
        .sort((a, b) => (a.totalTime || Number.POSITIVE_INFINITY) - (b.totalTime || Number.POSITIVE_INFINITY))

      finishedRacers.forEach((racer, index) => {
        racer.position = index + 1
      })

      return updatedRacers
    })
  }

  // Function to mark a racer as did not start (DNS)
  const markAsNonStarter = (id: number) => {
    setRacers((prevRacers) =>
      prevRacers.map((racer) =>
        racer.id === id
          ? {
              ...racer,
              status: "dns",
              startTime: null,
              lap1StartTime: null,
              lap1FinishTime: null,
              lap2StartTime: null,
              lap2FinishTime: null,
              result1Time: null,
              result2Time: null,
              totalTime: null,
              lap1Position: null,
              position: null,
              disqualificationReason: null,
              dnfReason: null,
            }
          : racer,
      ),
    )
  }

  // Function to format time in mm:ss.ms format
  const formatTime = (timeMs: number | null): string => {
    if (timeMs === null) return "--:--.--"

    const totalSeconds = timeMs / 1000
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = Math.floor(totalSeconds % 60)
    const milliseconds = Math.floor((totalSeconds % 1) * 100)

    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(2, "0")}`
  }

  // Reset all racers to waiting status and generate new random bib numbers
  const resetRace = () => {
    const resetRacers = initialRacers.map((racer) => ({
      ...racer,
      bibNumber: getRandomBibNumber(),
      status: "waiting",
      startTime: null,
      lap1StartTime: null,
      lap1FinishTime: null,
      lap2StartTime: null,
      lap2FinishTime: null,
      result1Time: null,
      result2Time: null,
      totalTime: null,
      lap1Position: null,
      position: null,
      disqualificationReason: null,
      dnfReason: null,
    }))
    setRacers(resetRacers)
  }

  // Generate new random bib numbers
  const regenerateBibs = () => {
    setRacers((prevRacers) =>
      prevRacers.map((racer) => ({
        ...racer,
        bibNumber: getRandomBibNumber(),
      })),
    )
  }

  // Get status badge based on racer status
  const getStatusBadge = (status: RacerStatus) => {
    switch (status) {
      case "waiting":
        return (
          <Badge variant="outline" className="bg-slate-100">
            Waiting
          </Badge>
        )
      case "lap1":
        return <Badge className="bg-amber-500">Lap 1</Badge>
      case "lap1_finished":
        return <Badge className="bg-blue-500">Lap 1 Complete</Badge>
      case "lap2":
        return <Badge className="bg-amber-600">Lap 2</Badge>
      case "finished":
        return <Badge className="bg-green-600">Finished</Badge>
      case "disqualified":
        return <Badge className="bg-red-600">DSQ</Badge>
      case "dns":
        return (
          <Badge variant="outline" className="border-gray-500 text-gray-700">
            DNS
          </Badge>
        )
      case "dnf":
        return <Badge className="bg-orange-500">DNF</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  // Get row styling based on racer status
  const getRowStyling = (status: RacerStatus) => {
    switch (status) {
      case "lap1":
        return "bg-amber-50 border-l-4 border-amber-500"
      case "lap1_finished":
        return "bg-blue-50 border-l-4 border-blue-500"
      case "lap2":
        return "bg-amber-100 border-l-4 border-amber-600"
      case "finished":
        return "bg-slate-50"
      case "disqualified":
        return "bg-red-50 border-l-4 border-red-500"
      case "dns":
        return "bg-gray-50 border-l-4 border-gray-500"
      case "dnf":
        return "bg-orange-50 border-l-4 border-orange-500"
      default:
        return ""
    }
  }

  // Common disqualification reasons
  const disqualificationReasons = [
    "Missed gate",
    "Illegal equipment",
    "Course violation",
    "False start",
    "Interference",
    "Unsportsmanlike conduct",
    "Failed equipment check",
  ]

  // Common DNF reasons
  const dnfReasons = ["Crash", "Equipment failure", "Injury", "Withdrew", "Course conditions"]

  return (
    <Card className="w-full max-w-7xl mx-auto">
      <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl">{raceName}</CardTitle>
          <div className="space-x-2">
            <Button
              onClick={() => loadRaceData()}
              variant="outline"
              className="text-white border-white hover:bg-slate-600"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Loading..." : "Refresh Data"}
            </Button>
            <Button onClick={regenerateBibs} variant="outline" className="text-white border-white hover:bg-slate-600">
              New Bibs
            </Button>
            <Button onClick={resetRace} variant="outline" className="text-white border-white hover:bg-slate-600">
              Reset Race
            </Button>
          </div>
        </div>
        {error && <div className="mt-2 text-red-300 text-sm">Error: {error}</div>}
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
              <TableHead className="w-32">Status</TableHead>
              <TableHead className="w-32 text-right">Result 1</TableHead>
              <TableHead className="w-20 text-center">Pos 1</TableHead>
              <TableHead className="w-32 text-right">Result 2</TableHead>
              <TableHead className="w-32 text-right">Total Time</TableHead>
              <TableHead className="w-20 text-center">Final Pos</TableHead>
              <TableHead className="w-40 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {racers.map((racer) => (
              <TableRow key={racer.id} className={getRowStyling(racer.status)}>
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
                  <Badge variant={racer.class === "U12" ? "default" : "secondary"} className="font-mono">
                    {racer.class}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {getStatusBadge(racer.status)}
                    {racer.disqualificationReason && (
                      <span className="text-xs text-red-600 italic">{racer.disqualificationReason}</span>
                    )}
                    {racer.dnfReason && <span className="text-xs text-orange-600 italic">{racer.dnfReason}</span>}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {racer.result1Time
                    ? formatTime(racer.result1Time)
                    : racer.status === "disqualified" && racer.lap1FinishTime
                      ? formatTime(racer.lap1FinishTime - (racer.lap1StartTime || 0))
                      : racer.status === "disqualified" && !racer.lap1FinishTime
                        ? "DSQ"
                        : racer.status === "dns"
                          ? "DNS"
                          : racer.status === "dnf" && racer.lap1FinishTime
                            ? formatTime(racer.lap1FinishTime - (racer.lap1StartTime || 0))
                            : racer.status === "dnf"
                              ? "DNF"
                              : "--:--.--"}
                </TableCell>
                <TableCell className="text-center font-bold">{racer.lap1Position ? racer.lap1Position : "-"}</TableCell>
                <TableCell className="text-right font-mono">
                  {racer.result2Time
                    ? formatTime(racer.result2Time)
                    : racer.status === "disqualified" && racer.status === "lap2"
                      ? "DSQ"
                      : racer.status === "dns" || racer.status === "disqualified" || racer.status === "dnf"
                        ? "-"
                        : "--:--.--"}
                </TableCell>
                <TableCell className="text-right font-mono font-bold">
                  {racer.totalTime ? (
                    racer.status === "disqualified" ? (
                      <span className="line-through text-red-500">{formatTime(racer.totalTime)}</span>
                    ) : (
                      formatTime(racer.totalTime)
                    )
                  ) : racer.status === "disqualified" ? (
                    "DSQ"
                  ) : racer.status === "dns" ? (
                    "DNS"
                  ) : racer.status === "dnf" ? (
                    "DNF"
                  ) : (
                    "--:--.--"
                  )}
                </TableCell>
                <TableCell className="text-center font-bold">{racer.position ? racer.position : "-"}</TableCell>
                <TableCell className="text-right">
                  {racer.status === "waiting" && (
                    <div className="flex justify-end space-x-1">
                      <Button size="sm" onClick={() => startRacer(racer.id)} className="bg-blue-600 hover:bg-blue-700">
                        <Play className="h-4 w-4 mr-1" /> Start
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">More options</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => markAsNonStarter(racer.id)}>
                            <AlertTriangle className="h-4 w-4 mr-2 text-gray-500" />
                            Mark as DNS
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                  {racer.status === "lap1" && (
                    <div className="flex justify-end space-x-1">
                      <Button
                        size="sm"
                        onClick={() => finishLap1(racer.id)}
                        className="bg-amber-600 hover:bg-amber-700"
                      >
                        <Flag className="h-4 w-4 mr-1" /> Finish Lap 1
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">More options</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => markAsDidNotFinish(racer.id, "Crash")}>
                            <Ban className="h-4 w-4 mr-2 text-orange-500" />
                            Did Not Finish
                          </DropdownMenuItem>
                          {dnfReasons.map((reason, index) => (
                            <DropdownMenuItem
                              key={index}
                              onClick={() => markAsDidNotFinish(racer.id, reason)}
                              className="text-xs"
                            >
                              <Ban className="h-3 w-3 mr-2 text-orange-500" />
                              {reason}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                  {racer.status === "lap1_finished" && (
                    <div className="flex justify-end space-x-1">
                      <Button size="sm" onClick={() => startLap2(racer.id)} className="bg-blue-600 hover:bg-blue-700">
                        <Play className="h-4 w-4 mr-1" /> Start Lap 2
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">More options</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => markAsDidNotFinish(racer.id, "Withdrew")}>
                            <Ban className="h-4 w-4 mr-2 text-orange-500" />
                            Did Not Finish
                          </DropdownMenuItem>
                          {dnfReasons.map((reason, index) => (
                            <DropdownMenuItem
                              key={index}
                              onClick={() => markAsDidNotFinish(racer.id, reason)}
                              className="text-xs"
                            >
                              <Ban className="h-3 w-3 mr-2 text-orange-500" />
                              {reason}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                  {racer.status === "lap2" && (
                    <div className="flex justify-end space-x-1">
                      <Button
                        size="sm"
                        onClick={() => finishLap2(racer.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Flag className="h-4 w-4 mr-1" /> Finish Race
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">More options</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => markAsDidNotFinish(racer.id, "Crash")}>
                            <Ban className="h-4 w-4 mr-2 text-orange-500" />
                            Did Not Finish
                          </DropdownMenuItem>
                          {dnfReasons.map((reason, index) => (
                            <DropdownMenuItem
                              key={index}
                              onClick={() => markAsDidNotFinish(racer.id, reason)}
                              className="text-xs"
                            >
                              <Ban className="h-3 w-3 mr-2 text-orange-500" />
                              {reason}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                  {racer.status === "finished" && (
                    <div className="flex justify-end space-x-1">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-slate-400 mr-1" />
                        <span className="text-sm text-slate-500">Complete</span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">More options</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => disqualifyRacer(racer.id, "Failed post-race inspection")}>
                            <XCircle className="h-4 w-4 mr-2 text-red-500" />
                            Disqualify (Post-Race)
                          </DropdownMenuItem>
                          {disqualificationReasons.map((reason, index) => (
                            <DropdownMenuItem
                              key={index}
                              onClick={() => disqualifyRacer(racer.id, reason)}
                              className="text-xs"
                            >
                              <XCircle className="h-3 w-3 mr-2 text-red-500" />
                              {reason}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                  {(racer.status === "disqualified" || racer.status === "dns" || racer.status === "dnf") && (
                    <div className="flex items-center justify-end">
                      {racer.status === "disqualified" && (
                        <>
                          <XCircle className="h-4 w-4 text-red-400 mr-1" />
                          <span className="text-sm text-red-500">DSQ</span>
                        </>
                      )}
                      {racer.status === "dns" && (
                        <>
                          <AlertTriangle className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-sm text-gray-500">DNS</span>
                        </>
                      )}
                      {racer.status === "dnf" && (
                        <>
                          <Ban className="h-4 w-4 text-orange-400 mr-1" />
                          <span className="text-sm text-orange-500">DNF</span>
                        </>
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
