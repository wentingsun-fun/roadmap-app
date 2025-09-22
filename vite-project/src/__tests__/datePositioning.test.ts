import { describe, it, expect } from 'vitest'

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function toAbs(year: number, month: number) {
  return year * 12 + month
}

function toAbsWithDays(year: number, month: number, day: number) {
  const dim = daysInMonth(year, month)
  const fraction = (day - 1) / dim
  return year * 12 + month + fraction
}

describe('fractional month positioning', () => {
  it('positions a mid-month start proportionally within the month', () => {
    const startYear = 2025
    const startMonth = 9 // Oct (0-based)
    const startDay = 15
    const endYear = 2025
    const endMonth = 10 // Nov
    const endDay = 28

    const absStartTimeline = toAbs(2025, 9) // timeline starts Oct 2025
    const cols = 3 // Oct, Nov, Dec

    const startAbs = toAbsWithDays(startYear, startMonth, startDay)
    const endAbs = toAbsWithDays(endYear, endMonth, endDay)

    const startOffset = Math.max(0, startAbs - absStartTimeline)
    const endOffset = Math.min(cols, endAbs - absStartTimeline)

    const startDateDay = startDay
    const dim = daysInMonth(startYear, startMonth)
    const startFraction = (startDateDay - 1) / dim

    // The start month column index relative to timeline
    const startMonthColumn = Math.max(0, Math.min(cols - 1, toAbs(startYear, startMonth) - absStartTimeline))
    const startPositionInMonth = startMonthColumn + startFraction

    // In October 2025, 31 days => 14/31 ≈ 0.4516 (0-based; 15th is day index 14)
    expect(dim).toBe(31)
    expect(Number(startFraction.toFixed(4))).toBeCloseTo(14 / 31, 4)
    // Ensure the startOffset reflects a position within first month
    expect(startOffset).toBeGreaterThanOrEqual(0)
    expect(startOffset).toBeLessThan(1)
    // Absolute left percent against total timeline width
    const leftPct = (Math.max(0, startOffset) / cols) * 100
    expect(Number(leftPct.toFixed(1))).toBeCloseTo((14 / 31) * (100 / 3), 1)

    // Width should be purely proportional to the span in months
    const totalSpan = endOffset - startOffset
    expect(totalSpan).toBeGreaterThan(1) // spans > 1 month (Oct 15 -> Nov 28)
  })
})


