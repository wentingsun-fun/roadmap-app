#!/usr/bin/env node
// Lightweight unit tests for fractional month positioning used in BarPill
// Runs with plain Node, no external deps

import assert from 'node:assert'

function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function toAbs(year, month) { return year * 12 + month; }
function toAbsWithDays(year, month, day) {
  const dim = daysInMonth(year, month);
  const frac = (day - 1) / dim;
  return year * 12 + month + frac;
}

function run() {
  let passed = 0, failed = 0;
  const cases = [
    {
      name: 'Oct 15 2025 start within Oct (0.4516 into month)',
      timeline: { startYear: 2025, startMonth: 9, cols: 3 },
      item: { startYear: 2025, startMonth: 9, startDay: 15, endYear: 2025, endMonth: 10, endDay: 28 },
      expectStartFraction: 14/31, // Oct 2025 has 31 days; 0-based index 14
    },
    {
      name: 'Jan 1 exact month start',
      timeline: { startYear: 2025, startMonth: 0, cols: 12 },
      item: { startYear: 2025, startMonth: 0, startDay: 1, endYear: 2025, endMonth: 0, endDay: 31 },
      expectStartFraction: 0,
    },
    {
      name: 'Feb 29 leap-year midpoint ~0.9655 for day 29 in 2024 Feb',
      timeline: { startYear: 2024, startMonth: 1, cols: 2 },
      item: { startYear: 2024, startMonth: 1, startDay: 29, endYear: 2024, endMonth: 1, endDay: 29 },
      expectStartFraction: 28/29,
    }
  ];

  for (const tc of cases) {
    try {
      const { startYear: tsy, startMonth: tsm, cols } = tc.timeline;
      const absStart = toAbs(tsy, tsm);
      const s = tc.item;

      const startAbs = toAbsWithDays(s.startYear, s.startMonth, s.startDay || 1);
      const endAbs = toAbsWithDays(s.endYear, s.endMonth, s.endDay || daysInMonth(s.endYear, s.endMonth));

      const startOffset = Math.max(0, startAbs - absStart);
      const endOffset = Math.min(cols, endAbs - absStart);

      const startMonthAbs = toAbs(s.startYear, s.startMonth);
      const startMonthColumn = Math.max(0, Math.min(cols - 1, startMonthAbs - absStart));
      const dim = daysInMonth(s.startYear, s.startMonth);
      const startFraction = ((s.startDay || 1) - 1) / dim;
      const startPositionInMonth = startMonthColumn + startFraction;

      // Validate fractional start within its month
      assert.ok(startOffset >= 0 && startOffset < 1, 'startOffset should fall within first visible month');
      assert.ok(Math.abs(startFraction - tc.expectStartFraction) < 1e-4, `startFraction mismatch: got ${startFraction}, want ${tc.expectStartFraction}`);
      // Absolute left percent across entire timeline
      const leftPct = (Math.max(0, startOffset) / cols) * 100;
      assert.ok(leftPct >= 0 && leftPct <= 100, 'leftPct should be within 0..100');

      passed++;
      console.log(`✓ ${tc.name}`);
    } catch (e) {
      failed++;
      console.error(`✗ ${tc.name}: ${e.message}`);
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

run();


