import { describe, expect, it } from "vitest"
import {
  FINALS_CODE_FREEZE_HOURS,
  FINALS_DURATION_HOURS,
  findRaceWindow,
  getCurrentStageIndex,
  getRaceWindow,
  getStageWarnings,
  isHackathonStatus,
  isRegistrationOpen,
  isSelectionOpen,
  openSeatCopy,
  raceDurationHours,
  registrationClosedCopy,
  validateRaceWindow,
} from "@/botcamp/lib/hackathon-stages"

const NOW = new Date("2026-06-01T00:00:00Z")

describe("isRegistrationOpen", () => {
  it("is open only in the REGISTRATION stage", () => {
    for (const status of ["DRAFT", "COMING_SOON", "COUNTDOWN", "ACTIVE", "JUDGING", "COMPLETED"]) {
      expect(isRegistrationOpen({ status, registrationEnd: null }, NOW)).toBe(false)
    }
    expect(isRegistrationOpen({ status: "REGISTRATION", registrationEnd: null }, NOW)).toBe(true)
  })

  it("closes past registrationEnd even while the stage is still REGISTRATION", () => {
    expect(
      isRegistrationOpen({ status: "REGISTRATION", registrationEnd: "2026-05-31T23:59:59Z" }, NOW),
    ).toBe(false)
    expect(
      isRegistrationOpen({ status: "REGISTRATION", registrationEnd: "2026-06-30T00:00:00Z" }, NOW),
    ).toBe(true)
  })
})

describe("getRaceWindow", () => {
  const finalsSession = [{ slug: "finals", date: new Date("2026-10-06T00:00:00Z") }]

  it("uses the hackathon's own race dates over the finals session", () => {
    const race = getRaceWindow({
      raceStart: "2027-03-01T12:00:00Z",
      raceEnd: "2027-03-02T12:00:00Z",
      sessions: finalsSession,
    })
    expect(race.start.toISOString()).toBe("2027-03-01T12:00:00.000Z")
    expect(raceDurationHours(race)).toBe(24)
    expect(race.codeFreeze.getTime()).toBe(race.start.getTime() - FINALS_CODE_FREEZE_HOURS * 3_600_000)
  })

  it("runs FINALS_DURATION_HOURS from Race Start when Race End isn't set", () => {
    const race = getRaceWindow({ raceStart: "2027-03-01T12:00:00Z", raceEnd: null })
    expect(raceDurationHours(race)).toBe(FINALS_DURATION_HOURS)
  })

  it("falls back to the finals session's date when the race dates are unset", () => {
    const race = getRaceWindow({ raceStart: null, raceEnd: null, sessions: finalsSession })
    expect(race.start).toEqual(finalsSession[0].date)
    expect(raceDurationHours(race)).toBe(FINALS_DURATION_HOURS)
  })

  it("has no window with neither — findRaceWindow is null, getRaceWindow throws", () => {
    expect(findRaceWindow({ raceStart: null, raceEnd: null, sessions: [] })).toBeNull()
    expect(() => getRaceWindow({ slug: "x", raceStart: null, raceEnd: null })).toThrow(/Race Start/)
  })
})

describe("validateRaceWindow", () => {
  it("accepts an empty or ordered window", () => {
    expect(validateRaceWindow(null, null)).toBeNull()
    expect(validateRaceWindow("2027-03-01T00:00:00Z", null)).toBeNull()
    expect(validateRaceWindow("2027-03-01T00:00:00Z", "2027-03-03T00:00:00Z")).toBeNull()
  })

  it("rejects an end without a start, an inverted window, and bad dates", () => {
    expect(validateRaceWindow(null, "2027-03-03T00:00:00Z")).not.toBeNull()
    expect(validateRaceWindow("2027-03-03T00:00:00Z", "2027-03-01T00:00:00Z")).not.toBeNull()
    expect(validateRaceWindow("not a date", null)).not.toBeNull()
  })
})

describe("getCurrentStageIndex", () => {
  const dates = {
    registrationStart: null,
    registrationEnd: null,
    startDate: "2026-08-01T00:00:00Z",
    endDate: "2026-10-07T00:00:00Z",
  }

  it("follows the admin-selected stage", () => {
    expect(getCurrentStageIndex({ ...dates, status: "COMING_SOON" }, NOW)).toBe(-1)
    expect(getCurrentStageIndex({ ...dates, status: "COUNTDOWN" }, NOW)).toBe(2)
    expect(getCurrentStageIndex({ ...dates, status: "ACTIVE" }, NOW)).toBe(3)
    expect(getCurrentStageIndex({ ...dates, status: "COMPLETED" }, NOW)).toBe(4)
  })

  it("never runs ahead of Selection & Judging while registration is open", () => {
    const late = new Date("2026-12-01T00:00:00Z")
    expect(getCurrentStageIndex({ ...dates, status: "REGISTRATION" }, late)).toBe(2)
  })

  it("opens selection at the registration deadline for editions with race dates", () => {
    const next = {
      registrationStart: "2027-01-01T00:00:00Z",
      registrationEnd: "2027-02-15T00:00:00Z",
      startDate: "2027-02-01T00:00:00Z",
      endDate: "2027-03-05T00:00:00Z",
      raceStart: "2027-03-01T00:00:00Z",
      raceEnd: "2027-03-03T00:00:00Z",
      status: "REGISTRATION",
    }
    expect(getCurrentStageIndex(next, new Date("2027-02-05T00:00:00Z"))).toBe(1)
    expect(getCurrentStageIndex(next, new Date("2027-02-20T00:00:00Z"))).toBe(2)
    expect(getCurrentStageIndex({ ...next, registrationEnd: null }, new Date("2027-02-20T00:00:00Z"))).toBe(1)
  })
})

describe("isHackathonStatus", () => {
  it("accepts every stage and rejects anything else", () => {
    expect(isHackathonStatus("COUNTDOWN")).toBe(true)
    expect(isHackathonStatus("LIVE")).toBe(false)
    expect(isHackathonStatus(undefined)).toBe(false)
  })
})

describe("getStageWarnings", () => {
  const ready = {
    teamsCount: 5,
    sessionsCount: 3,
    registrationStart: "2026-05-01T00:00:00Z",
    registrationEnd: "2026-07-01T00:00:00Z",
    raceStart: "2026-08-01T00:00:00Z",
    raceEnd: "2026-08-03T00:00:00Z",
    openSeats: 0,
    raceAgentsCount: 10,
    voteLinked: true,
    faqCustomized: true,
  }

  it("has nothing to flag for a fully set-up hackathon", () => {
    for (const s of ["COMING_SOON", "REGISTRATION", "COUNTDOWN", "ACTIVE", "COMPLETED"] as const) {
      expect(getStageWarnings(s, ready, NOW)).toEqual([])
    }
  })

  it("flags missing race dates and open seats before the countdown", () => {
    const warnings = getStageWarnings("COUNTDOWN", { ...ready, raceStart: null, openSeats: 2 }, NOW)
    expect(warnings).toHaveLength(2)
    expect(warnings[1]).toContain("2 seats are still open")
    expect(warnings[1]).toContain("can't fill them")
  })

  it("flags a live race with no registered agents", () => {
    expect(getStageWarnings("ACTIVE", { ...ready, raceAgentsCount: 0 }, NOW)).toHaveLength(1)
  })

  it("flags a race with no HBOT Snapshot proposal linked", () => {
    expect(getStageWarnings("ACTIVE", { ...ready, voteLinked: false }, NOW)).toHaveLength(1)
    expect(getStageWarnings("COMPLETED", { ...ready, voteLinked: false }, NOW)).toHaveLength(1)
  })
})

describe("isSelectionOpen", () => {
  it("lets teams pick only in the Open stage", () => {
    expect(isSelectionOpen({ status: "REGISTRATION" })).toBe(true)
    for (const status of ["DRAFT", "COMING_SOON", "COUNTDOWN", "ACTIVE", "JUDGING", "COMPLETED"]) {
      expect(isSelectionOpen({ status })).toBe(false)
    }
  })
})

describe("openSeatCopy", () => {
  it("only invites applications while registration is open", () => {
    expect(openSeatCopy("REGISTRATION", true).desc).toContain("Apply")
    expect(openSeatCopy("REGISTRATION", false).label).toBe("Seat Pending")
    expect(openSeatCopy("COUNTDOWN", false).label).toBe("Unfilled")
    expect(openSeatCopy("ACTIVE", false).label).toBe("Unfilled")
  })
})

describe("registrationClosedCopy", () => {
  const h = {
    registrationStart: "2027-01-10T00:00:00Z",
    registrationEnd: "2027-02-01T00:00:00Z",
    raceStart: "2027-03-01T12:00:00Z",
    raceEnd: "2027-03-03T12:00:00Z",
  }

  it("tells builders whether it's too early, too late, or the race is on", () => {
    expect(registrationClosedCopy({ ...h, status: "COMING_SOON" }, "Registration").description).toContain(
      "Jan 10, 2027",
    )
    expect(registrationClosedCopy({ ...h, status: "COUNTDOWN" }, "Applications").description).toContain(
      "Mar 1, 2027",
    )
    expect(registrationClosedCopy({ ...h, status: "COMPLETED" }, "Applications").title).toBe(
      "This Hackathon Has Ended",
    )
  })
})
