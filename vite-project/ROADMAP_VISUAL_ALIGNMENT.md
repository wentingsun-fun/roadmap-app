## Visual Alignment Improvement Plan

### Goals
- **Horizontal alignment**: Bars align precisely to month gridlines at start/end dates.
- **Vertical alignment**: Items stack to consistent baselines within lanes without overlap.
- **Clarity**: Reduce clutter; a single header owns month labels; subtle quarter banding.
- **Usability**: Predictable snapping and clear resize handles; readable typography.

### Key Issues
- Variable bar heights create uneven baselines.
- Month labels repeat in each lane cell and add clutter.
- Gridlines are per-cell; continuity across lanes appears inconsistent.
- Vertical spacing is estimated from text length, causing drift.
- Resize handles and date chips don’t snap clearly to grid.

### Specifications

- **Baseline grid, spacing, sizing**
  - Use 8px spacing system.
  - Lane header: top 12px, header line 20px, gap 4px → headerBaseline 36px.
  - Fixed task rows: rowHeight 40px, rowGap 6px. Min lane height grows by rows.
  - Title truncated to 2 lines; row height does not change with text.

- **Row packing (collision-free stacking)**
  - Pack per-lane via interval scheduling: first row where `startAbs >= lastEndAbs` else new row.
  - Top offset: `headerBaseline + rowIndex * (rowHeight + rowGap)`.
  - Lane height: `headerBaseline + rowsCount * rowHeight + (rowsCount - 1) * rowGap + 8`.

- **Gridlines and columns**
  - Render monthly lines with a single backdrop layer on the right grid.
  - Keep quarter banding subtle behind all lanes.
  - Left label column set to 240px.

- **Month labels and header**
  - Remove month labels from lane cells.
  - Keep labels only in the sticky header row.

- **Snapping and alignment guides**
  - Default snap to month boundaries during drag/resize; Alt/Option disables snap.
  - Show vertical ghost line and date chips aligned to nearest month.

- **Handles and hit targets**
  - 8px wide handles; overlay so content width doesn’t shift.

- **Typography**
  - Title: 13px default; 12px if bar width < 140px; 2-line clamp; line-height 1.35; ellipsis.
  - Progress chip 10px/600 at top-right with adequate padding.

- **Contrast**
  - Maintain WCAG AA contrast on stage colors; fallback to text stroke or dark text as needed.

- **Performance**
  - Compute placements in `useMemo` per lane. Cache months-per-pixel via ResizeObserver.

### Acceptance Tests
- Bars snap to gridlines; date chips/ghost lines match saved dates.
- No vertical overlaps; stable row indices for unaffected items.
- Only header shows month labels; quarter banding is subtle.
- Resize/drag feel precise; handles easy to target.
- Text stays readable; no overflow beyond 2 lines; row height fixed.

### Task List
- [x] Implement row packing per lane and fixed rowHeight/rowGap.
- [x] Derive lane height from rowsCount; remove cumulative height logic.
- [x] Remove per-lane month labels; add months in header and make header sticky.
- [x] Normalize bar typography and clamp to two lines; fix row height.
- [x] Standardize left column width to 240px and lane header padding.
- [x] Add single grid-wide monthly vertical lines via background gradient.
- [x] Add snapping to month boundaries with Alt/Option to disable.
- [x] Show vertical ghost alignment line and date chips during drag/hover.
- [x] Ensure contrast safety on stage colors; auto-adjust readability.
- [x] Cache timeline width and months-per-pixel; add resize observer.
- [ ] QA on large datasets; confirm smooth drag and correct packing.
- [ ] Optional: add zoom levels (quarter/month/week) and snap modes.


