import { parseFallbackRaceData } from "./fallback-parser"

// Types for the parsed race data
export interface LiveTimingRacer {
  id: number
  name: string
  bibNumber: number
  club: string
  class: string // Changed from "U12" | "U14" to string
  run1Time: number | null | "on course"
  run2Time: number | null | "on course"
  totalTime: number | null
  run1Status?: string
  run2Status?: string
  rawR1?: string
  rawR2?: string
  rawMs?: string // ms= field from API for analysis
}

export interface RaceData {
  raceName: string
  racers: LiveTimingRacer[]
  rawData?: string // For debugging
}

// Function to fetch race data from live-timing.com
export const fetchRaceData = async (raceId: string): Promise<RaceData> => {
  try {
    // Fetch the data
    const response = await fetch(`https://www.live-timing.com/includes/aj_race.php?r=${raceId}&&m=569463821.73936&&u=30`, {
      method: "GET",
      headers: {
        Accept: "text/plain",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.text()

    // Log a sample of the raw data
    console.log("Raw data sample:", data.substring(0, 500))

    // Try the direct parser first
    const directResult = parseRaceData(data)

    // If we got racers, return the result
    if (directResult.racers.length > 0) {
      return {
        ...directResult,
        rawData: data.substring(0, 1000), // Include a sample of the raw data for debugging
      }
    }

    // If no racers were found, try the fallback parser
    console.log("Direct parser found no racers, trying fallback parser")

    // Use the fallback parser
    const fallbackResult = parseFallbackRaceData(data)

    return {
      ...fallbackResult,
      rawData: data.substring(0, 1000), // Include a sample of the raw data for debugging
    }
  } catch (error) {
    console.error("Error fetching race data:", error)
    return { raceName: "Error Loading Race", racers: [] }
  }
}

// Function to convert LiveTimingRacer to our app's Racer format
export const convertToAppRacer = (liveRacer: LiveTimingRacer, startNumber: number): any => {
  return {
    id: liveRacer.id,
    name: liveRacer.name,
    startNumber: startNumber,
    bibNumber: liveRacer.bibNumber,
    club: liveRacer.club,
    class: liveRacer.class,
    result1Time: liveRacer.run1Time,
    result2Time: liveRacer.run2Time,
    totalTime: liveRacer.totalTime,
    run1Status: liveRacer.run1Status || "",
    run2Status: liveRacer.run2Status || "",
    rawR1: liveRacer.rawR1 || "",
    rawR2: liveRacer.rawR2 || "",
    rawMs: liveRacer.rawMs || "",
  }
}

// Import the parseRaceData function from direct-parser
import { parseRaceData } from "./direct-parser"

// Function to format time in mm:ss.ms format
export const formatTime = (timeMs: number | null | "on course"): string => {
  if (timeMs === null) return "--:--.--"
  if (timeMs === "on course") return "On Course"

  const totalSeconds = timeMs / 1000
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  const milliseconds = Math.floor((totalSeconds % 1) * 100)

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(2, "0")}`
}
