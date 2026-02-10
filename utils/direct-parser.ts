// This parser creates a new racer entry for each occurrence of "|b=" in the data

export function parseRaceData(data: string) {
  const racersMap = new Map() // Use a map to track racers by bib number
  let racerId = 1 // Auto-increment ID for racers

  // Extract race name from the first line
  let raceName = "Ski Race"
  const lines = data.split("\n")
  if (lines.length > 0) {
    const headerParts = lines[0].split("|")
    if (headerParts.length > 1 && headerParts[1].includes("hN=U=")) {
      raceName = headerParts[1].replace("hN=U=", "").trim()
    }
  }

  // Join all lines into a single string
  const fullData = lines.join("")

  // Split the data by "|b=" to get each racer section
  // The first part won't have a racer, so we'll skip it
  const racerSections = fullData.split("|b=")

  // Process each racer section (skip the first one which is header info)
  for (let i = 1; i < racerSections.length; i++) {
    try {
      // Add the "|b=" back to the beginning for proper parsing
      const section = "b=" + racerSections[i]

      // Split the section by pipe character to get fields
      const fields = section.split("|")

      // Extract bib number (first field should be "b=NUMBER")
      const bibStr = fields[0].substring(2).trim()
      const bib = Number.parseInt(bibStr, 10) || racerId

      // Initialize other racer data
      let name = `Racer ${bib}`
      let club = "---"
      let run1Time: number | null | "on course" = null
      let run2Time: number | null | "on course" = null
      let raceClass = "Unknown" // Default class
      let run1Status = ""
      let run2Status = ""
      let rawR1 = ""
      let rawR2 = ""
      let timestamp: number | null = null

      // Process each field to extract data
      for (const field of fields) {
        if (field.startsWith("m=")) {
          name = field.substring(2).trim()
        } else if (field.startsWith("ms=")) {
          // ms is usually a millisecond timestamp (epoch ms)
          const msStr = field.substring(3).trim()
          const msVal = Number.parseInt(msStr, 10)
          timestamp = Number.isFinite(msVal) ? msVal : null
        } else if (field.startsWith("c=")) {
          club = field.substring(2).trim()
        } else if (field.startsWith("r1=")) {
          const timeStr = field.substring(3).trim()
          rawR1 = timeStr // Store raw r1 value
          const result = parseTimeString(timeStr)
          run1Time = result.time
          run1Status = result.status
          // Safety check: if run1Time is NaN, convert to null and mark as DNS
          if (typeof run1Time === "number" && Number.isNaN(run1Time)) {
            run1Time = null
            run1Status = "DNS"
          }
        } else if (field.startsWith("r2=")) {
          const timeStr = field.substring(3).trim()
          rawR2 = timeStr // Store raw r2 value
          const result = parseTimeString(timeStr)
          run2Time = result.time
          run2Status = result.status
          // Safety check: if run2Time is NaN, convert to null and mark as DNS
          if (typeof run2Time === "number" && Number.isNaN(run2Time)) {
            run2Time = null
            run2Status = "DNS"
          }
        } else if (field.startsWith("s=")) {
          // Use the actual class value from the data
          raceClass = field.substring(2).trim()
        }
      }

      // Calculate total time
      let totalTime: number | null = null
      if (typeof run1Time === "number" && typeof run2Time === "number") {
        totalTime = run1Time + run2Time
        // If totalTime is NaN, set it to null and mark as DNS
        if (Number.isNaN(totalTime)) {
          totalTime = null
          run1Status = "DNS"
          run2Status = "DNS"
        }
      }

      // Check if we already have a racer with this bib number
      if (racersMap.has(bib)) {
        const existingRacer = racersMap.get(bib)

        // Merge the data, prioritizing actual times over DNS/DNF
        if (typeof run1Time === "number" || (run1Time === "on course" && existingRacer.run1Time === null)) {
          existingRacer.run1Time = run1Time
          existingRacer.run1Status = run1Status
          existingRacer.rawR1 = rawR1
          // Safety check: if run1Time is NaN, convert to null
          if (typeof existingRacer.run1Time === "number" && Number.isNaN(existingRacer.run1Time)) {
            existingRacer.run1Time = null
            existingRacer.run1Status = "DNS"
          }
        }

        if (typeof run2Time === "number" || (run2Time === "on course" && existingRacer.run2Time === null)) {
          existingRacer.run2Time = run2Time
          existingRacer.run2Status = run2Status
          existingRacer.rawR2 = rawR2
          // Safety check: if run2Time is NaN, convert to null
          if (typeof existingRacer.run2Time === "number" && Number.isNaN(existingRacer.run2Time)) {
            existingRacer.run2Time = null
            existingRacer.run2Status = "DNS"
          }
        }

        // Merge timestamp if present (prefer the value if available)
        if (timestamp !== null) {
          existingRacer.timestamp = timestamp
        }

        // Recalculate total time if both runs have times
        if (typeof existingRacer.run1Time === "number" && typeof existingRacer.run2Time === "number") {
          existingRacer.totalTime = existingRacer.run1Time + existingRacer.run2Time
          // If totalTime is NaN, set it to null and mark as DNS
          if (Number.isNaN(existingRacer.totalTime)) {
            existingRacer.totalTime = null
            existingRacer.run1Status = "DNS"
            existingRacer.run2Status = "DNS"
          }
        }
      } else {
        // Add new racer to the map
        racersMap.set(bib, {
          id: racerId++,
          name,
          bibNumber: bib,
          club,
          class: raceClass,
          run1Time,
          run2Time,
          totalTime,
          timestamp,
          run1Status,
          run2Status,
          rawR1,
          rawR2,
        })
      }
    } catch (err) {
      console.error(`Error parsing racer section ${i}:`, err)
    }
  }

  // Remove the sorting logic to keep the race order exactly as returned from the API
  // Convert map to array
  const racers = Array.from(racersMap.values())
  console.log(`Total unique racers parsed: ${racers.length}`)

  // Comment out or remove the sorting logic
  /*
  racers.sort((a, b) => {
    // Helper function to determine if a racer has DNS status
    const hasDNS = (racer) => {
      return racer.run1Status === "DNS" || racer.run2Status === "DNS"
    }

    // If one racer has DNS and the other doesn't, DNS goes last
    if (hasDNS(a) && !hasDNS(b)) return 1
    if (!hasDNS(a) && hasDNS(b)) return -1

    // If we get here, sort by total time
    if (a.totalTime === null && b.totalTime === null) return 0
    if (a.totalTime === null) return 1
    if (b.totalTime === null) return -1
    return a.totalTime - b.totalTime
  })
  */

  return { raceName, racers }
}

function parseTimeString(timeStr: string | null): { time: number | null | "on course"; status: string } {
  if (!timeStr) return { time: null, status: "" }

  // Check for status prefixes instead of exact matches
  if (timeStr.startsWith("DNS")) return { time: null, status: "DNS" }
  if (timeStr.startsWith("DNF")) return { time: null, status: "DNF" }
  if (timeStr.startsWith("DSQ")) return { time: null, status: "DSQ" }

  if (timeStr.toLowerCase().includes("on course")) return { time: "on course", status: "on course" }

  // Check for "--:--.-" or similar patterns (missing times)
  if (timeStr.includes("--")) return { time: null, status: "DNS" }

  try {
    if (timeStr.includes(":")) {
      const [minutes, seconds] = timeStr.split(":")
      const parsedTime = (Number.parseInt(minutes, 10) * 60 + Number.parseFloat(seconds)) * 1000
      if (Number.isNaN(parsedTime)) {
        return { time: null, status: "DNS" }
      }
      return {
        time: parsedTime,
        status: "",
      }
    } else {
      const parsedTime = Number.parseFloat(timeStr) * 1000
      if (Number.isNaN(parsedTime)) {
        return { time: null, status: "DNS" }
      }
      return {
        time: parsedTime,
        status: "",
      }
    }
  } catch (e) {
    return { time: null, status: "DNS" }
  }
}
