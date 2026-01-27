// Fallback parser that creates a new racer entry for each occurrence of "|b="

export function parseFallbackRaceData(data: string) {
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

  // Alternative approach: scan through the data line by line
  // and look for "|b=" occurrences
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Check if this line contains a bib number field
    const bibIndex = line.indexOf("|b=")
    if (bibIndex === -1) continue

    try {
      // Extract the part of the line starting from "|b="
      const racerData = line.substring(bibIndex + 1) // +1 to skip the leading |

      // Split into fields
      const fields = racerData.split("|")

      // Extract bib number
      const bibField = fields[0] // Should be "b=NUMBER"
      const bibStr = bibField.substring(2).trim()
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
        } else if (field.startsWith("r2=")) {
          const timeStr = field.substring(3).trim()
          rawR2 = timeStr // Store raw r2 value
          const result = parseTimeString(timeStr)
          run2Time = result.time
          run2Status = result.status
        } else if (field.startsWith("g=")) {
          // Use the actual class value from the data
          raceClass = field.substring(2).trim()
        }
      }

      // Calculate total time
      let totalTime: number | null = null
      if (typeof run1Time === "number" && typeof run2Time === "number") {
        totalTime = run1Time + run2Time
      }

      // Check if we already have a racer with this bib number
      if (racersMap.has(bib)) {
        const existingRacer = racersMap.get(bib)

        // Merge the data, prioritizing actual times over DNS/DNF
        if (typeof run1Time === "number" || (run1Time === "on course" && existingRacer.run1Time === null)) {
          existingRacer.run1Time = run1Time
          existingRacer.run1Status = run1Status
          existingRacer.rawR1 = rawR1
        }

        if (typeof run2Time === "number" || (run2Time === "on course" && existingRacer.run2Time === null)) {
          existingRacer.run2Time = run2Time
          existingRacer.run2Status = run2Status
          existingRacer.rawR2 = rawR2
        }

        if (timestamp !== null) {
          existingRacer.timestamp = timestamp
        }
        // Recalculate total time if both runs have times
        if (typeof existingRacer.run1Time === "number" && typeof existingRacer.run2Time === "number") {
          existingRacer.totalTime = existingRacer.run1Time + existingRacer.run2Time
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
      console.error(`Error parsing line ${i}:`, err)
    }
  }

  // Remove the sorting logic to keep the race order exactly as returned from the API
  // Convert map to array
  const racers = Array.from(racersMap.values())
  console.log(`Fallback parser found ${racers.length} unique racers`)

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

  try {
    if (timeStr.includes(":")) {
      const [minutes, seconds] = timeStr.split(":")
      return {
        time: (Number.parseInt(minutes, 10) * 60 + Number.parseFloat(seconds)) * 1000,
        status: "",
      }
    } else {
      return {
        time: Number.parseFloat(timeStr) * 1000,
        status: "",
      }
    }
  } catch (e) {
    return { time: null, status: "" }
  }
}
