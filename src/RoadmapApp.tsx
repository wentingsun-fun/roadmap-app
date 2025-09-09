// TODO: Paste your full RoadmapApp.tsx here (the version with editable time range, stages, lanes, and left header).
// After pasting, save and run:  npm run dev
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
// Removed external uuid dependency; use crypto.randomUUID instead
const uuid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Download, Upload, Calendar, Edit2, Flag } from "lucide-react";

/* ---------- Time Labels ---------- */
const MONTHS = [
  { label: "Jan", quarter: "Q1" }, { label: "Feb", quarter: "Q1" }, { label: "Mar", quarter: "Q1" },
  { label: "Apr", quarter: "Q2" }, { label: "May", quarter: "Q2" }, { label: "Jun", quarter: "Q2" },
  { label: "Jul", quarter: "Q3" }, { label: "Aug", quarter: "Q3" }, { label: "Sep", quarter: "Q3" },
  { label: "Oct", quarter: "Q4" }, { label: "Nov", quarter: "Q4" }, { label: "Dec", quarter: "Q4" },
] as const;

/* ---------- Types ---------- */
export type LaneId = string;
export type LaneMeta = { id: LaneId; label: string; color: string };

export type StageId = string;
export type StageMeta = { id: StageId; label: string; colorClass: string }; // tailwind bg-* class

type RoadmapItem = {
  id: string;
  title: string;
  description?: string;
  owner?: string;
  laneId: LaneId;
  stageId: StageId;
  // New granular date range (supports cross-year)
  startYear: number;
  startMonth: number;  // 0-11
  startDay: number;    // 1-31
  endYear: number;
  endMonth: number;    // 0-11
  endDay: number;      // 1-31
  progress?: number;   // 0-100
  milestones?: { label: string; month: number }[]; // milestones still month-based for simplicity
};

type Timeline = {
  leftTitle: string;      // was "Tasks" — now editable
  startYear: number;
  startMonth: number;     // 0-11
  endYear: number;
  endMonth: number;       // 0-11
  autoFit?: boolean;      // Auto-fit timeline to items' date range
};

/* ---------- Storage Keys ---------- */
const STORAGE_ITEMS = "roadmap.items.v2";
const STORAGE_LANES = "roadmap.lanes.v2";
const STORAGE_STAGES = "roadmap.stages.v1";
const STORAGE_TL = "roadmap.timeline.v2";

/* ---------- Defaults ---------- */
const DEFAULT_LANES: LaneMeta[] = [
  { id: "onboarding", label: "Onboarding", color: "#a855f7" },
  { id: "messaging", label: "Messaging", color: "#06b6d4" },
  { id: "analytics", label: "Analytics", color: "#22c55e" },
  { id: "admin", label: "Admin Console", color: "#f97316" },
];

const DEFAULT_STAGES: StageMeta[] = [
  { id: "planned",      label: "Planned",       colorClass: "bg-purple-500" },
  { id: "in-progress",  label: "In Progress",   colorClass: "bg-cyan-500" },
  { id: "under-review", label: "Under Review",  colorClass: "bg-amber-500" },
  { id: "completed",    label: "Completed",     colorClass: "bg-emerald-500" },
];

const thisYear = new Date().getFullYear();
const DEFAULT_TL: Timeline = { leftTitle: "Tasks", startYear: thisYear, startMonth: 0, endYear: thisYear, endMonth: 11, autoFit: true };

/* ---------- Persistence ---------- */
function load(): { items: RoadmapItem[]; lanes: LaneMeta[]; stages: StageMeta[]; tl: Timeline } {
  if (typeof window === "undefined") return { items: [], lanes: DEFAULT_LANES, stages: DEFAULT_STAGES, tl: DEFAULT_TL };
  try {
    const rawItems = JSON.parse(localStorage.getItem(STORAGE_ITEMS) || "[]") as any[];
    // Migration: older items had { year, startMonth, endMonth }
    const items: RoadmapItem[] = rawItems.map(it => {
      if (it && typeof it === 'object' && !('startYear' in it)) {
        return {
          id: it.id,
          title: it.title,
          description: it.description,
          owner: it.owner,
          laneId: it.laneId,
            stageId: it.stageId,
          startYear: it.year,
          startMonth: it.startMonth ?? 0,
          startDay: 1,
          endYear: it.year,
          endMonth: it.endMonth ?? it.startMonth ?? 0,
          endDay: 28,
          progress: it.progress,
          milestones: it.milestones,
        } as RoadmapItem;
      }
      return it as RoadmapItem;
    });
    const lanes = JSON.parse(localStorage.getItem(STORAGE_LANES) || "[]") as LaneMeta[];                    

    const stages = JSON.parse(localStorage.getItem(STORAGE_STAGES) || "[]") as StageMeta[];
    const tl = JSON.parse(localStorage.getItem(STORAGE_TL) || "null") as Timeline | null;

    return {
      items,
      lanes: lanes.length ? lanes : DEFAULT_LANES,
      stages: stages.length ? stages : DEFAULT_STAGES,
      tl: tl ?? DEFAULT_TL,
    };
  } catch {
    return { items: [], lanes: DEFAULT_LANES, stages: DEFAULT_STAGES, tl: DEFAULT_TL };
  }
}

function save(items: RoadmapItem[], lanes: LaneMeta[], stages: StageMeta[], tl: Timeline) {
  localStorage.setItem(STORAGE_ITEMS, JSON.stringify(items));
  localStorage.setItem(STORAGE_LANES, JSON.stringify(lanes));
  localStorage.setItem(STORAGE_STAGES, JSON.stringify(stages));
  localStorage.setItem(STORAGE_TL, JSON.stringify(tl));
}

/* ---------- Helpers ---------- */
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const monthName = (i: number) => MONTHS[((i % 12) + 12) % 12].label;
const quarterName = (i: number) => MONTHS[((i % 12) + 12) % 12].quarter;

/* ---------- Enhanced Date Helpers ---------- */
function toAbs(year: number, month: number) { return year * 12 + month; }

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function toAbsWithDays(year: number, month: number, day: number): number {
  // Convert to absolute position with fractional day precision
  const daysInThisMonth = daysInMonth(year, month);
  const dayFraction = (day - 1) / daysInThisMonth; // 0-based day as fraction
  return year * 12 + month + dayFraction;
}
function rangeToCols(tl: Timeline) { const start = toAbs(tl.startYear, tl.startMonth); const end = toAbs(tl.endYear, tl.endMonth); return Math.max(1, end - start + 1); }

// Calculate optimal timeline range to fit all items with some padding
function calculateOptimalTimelineRange(items: RoadmapItem[]): { startYear: number; startMonth: number; endYear: number; endMonth: number } {
  if (items.length === 0) {
    // Default to current year if no items
    const thisYear = new Date().getFullYear();
    return { startYear: thisYear, startMonth: 0, endYear: thisYear, endMonth: 11 };
  }

  // Find the earliest start date and latest end date among all items
  let earliestAbs = Infinity;
  let latestAbs = -Infinity;

  items.forEach(item => {
    const itemStart = toAbs(item.startYear, item.startMonth);
    const itemEnd = toAbs(item.endYear, item.endMonth);
    earliestAbs = Math.min(earliestAbs, itemStart);
    latestAbs = Math.max(latestAbs, itemEnd);
  });

  // Add padding: 1 month before earliest, 2 months after latest
  const paddedStart = earliestAbs - 1;
  const paddedEnd = latestAbs + 2;

  // Convert back to year/month
  const startYear = Math.floor(paddedStart / 12);
  const startMonth = paddedStart % 12;
  const endYear = Math.floor(paddedEnd / 12);
  const endMonth = paddedEnd % 12;

  return { startYear, startMonth, endYear, endMonth };
}

/* ============================================================
   App
============================================================ */
export default function RoadmapApp() {
  const [{ items, lanes, stages, tl }, setState] = useState(load());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoadmapItem | null>(null);
  const [laneMgrOpen, setLaneMgrOpen] = useState(false);
  const [stageMgrOpen, setStageMgrOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => { save(items, lanes, stages, tl); }, [items, lanes, stages, tl]);

  const laneById = useMemo(() => Object.fromEntries(lanes.map(l => [l.id, l])), [lanes]);
  const stageById = useMemo(() => Object.fromEntries(stages.map(s => [s.id, s])), [stages]);

  const itemsByLane = useMemo(() => {
    const map: Record<string, RoadmapItem[]> = Object.fromEntries(lanes.map(l => [l.id, []]));
  for (const it of items) (map[it.laneId] ?? (map[it.laneId] = [])).push(it);
  for (const id of Object.keys(map)) map[id] = [...map[id]].sort((a: RoadmapItem, b: RoadmapItem)=> toAbs(a.startYear, a.startMonth) - toAbs(b.startYear, b.startMonth));
    return map;
  }, [items, lanes]);

  // Calculate dynamic timeline range based on items
  const optimalRange = useMemo(() => calculateOptimalTimelineRange(items), [items]);

  // Use auto-fit timeline if enabled and we have items, otherwise use stored timeline for manual control
  const effectiveTimeline = (tl.autoFit !== false && items.length > 0) ? {
    ...tl,
    startYear: optimalRange.startYear,
    startMonth: optimalRange.startMonth,
    endYear: optimalRange.endYear,
    endMonth: optimalRange.endMonth
  } : tl;

  const cols = rangeToCols(effectiveTimeline);
  const gridTemplate = `repeat(${cols}, minmax(0, 1fr))`;
  const absStart = toAbs(effectiveTimeline.startYear, effectiveTimeline.startMonth);

  // Expandable timeline logic
  const maxVisibleLanes = 5;
  const shouldCollapse = lanes.length > maxVisibleLanes;
  const visibleLanes = shouldCollapse && !isExpanded ? lanes.slice(0, maxVisibleLanes) : lanes;
  const hiddenCount = lanes.length - maxVisibleLanes;

  // Proportional lane heights based on number of items with improved sizing
  const calculateLaneHeight = useMemo(() => {
    const minHeight = 100; // Increased minimum height for better text visibility
    const headerHeight = 20; // Lane header height
    const headerPadding = 12; // Top padding for header
    const headerBottomPadding = 4; // Bottom padding after header
    const itemGap = 4; // Gap between items

    return (laneId: string) => {
      const laneItems = itemsByLane[laneId] || [];
      if (laneItems.length === 0) return minHeight;

      // Calculate total height needed: header area + items + gaps
      const headerAreaHeight = headerPadding + headerHeight + headerBottomPadding; // 12 + 20 + 4 = 36px
      let itemsHeight = 0;

      laneItems.forEach((item, index) => {
        const titleLength = item.title.length;
        const charsPerLine = Math.max(20, Math.min(30, 60 - titleLength * 0.1)); // Match BarPill logic
        const estimatedLines = Math.ceil(titleLength / charsPerLine);
        const actualLines = Math.min(estimatedLines, 3); // Max 3 lines to prevent overlap
        const itemHeight = Math.min(32 + (actualLines - 1) * 16, 64); // Match BarPill sizing
        itemsHeight += itemHeight;
        if (index < laneItems.length - 1) itemsHeight += itemGap; // Gap between items
      });

      // Total height = header area + items height + bottom padding
      const totalHeight = headerAreaHeight + itemsHeight + 8; // Extra 8px bottom padding
      return Math.max(minHeight, totalHeight);
    };
  }, [itemsByLane, visibleLanes]);

  function upsert(item: RoadmapItem) {
    setState(prev => ({
      ...prev,
      items: prev.items.some(x => x.id === item.id) ? prev.items.map(x => x.id===item.id ? item : x) : [...prev.items, item],
    }));
  }
  const remove = (id: string) => setState(prev => ({ ...prev, items: prev.items.filter(x => x.id !== id) }));

  // Lanes
  const addLane = (label: string, color: string) =>
    setState(prev => ({ ...prev, lanes: [...prev.lanes, { id: label.toLowerCase().replace(/\s+/g,"-"), label, color }] }));
  const renameLane = (id: LaneId, label: string) =>
    setState(prev => ({ ...prev, lanes: prev.lanes.map(l => l.id===id? {...l,label} : l) }));
  const recolorLane = (id: LaneId, color: string) =>
    setState(prev => ({ ...prev, lanes: prev.lanes.map(l => l.id===id? {...l,color} : l) }));
  const reorderLanes = (next: LaneMeta[]) => setState(prev => ({ ...prev, lanes: next }));
  const deleteLane = (id: LaneId) => setState(prev => {
    const remaining = prev.lanes.filter(l => l.id!==id);
    const fallback = remaining[0]?.id;
    const rehomed = prev.items.map(it => it.laneId===id && fallback ? {...it,laneId:fallback} : it);
    return { ...prev, lanes: remaining, items: rehomed };
  });

  // Stages
  const addStage = (label: string, colorClass: string) =>
    setState(prev => ({ ...prev, stages: [...prev.stages, { id: label.toLowerCase().replace(/\s+/g,"-"), label, colorClass }] }));
  const renameStage = (id: StageId, label: string) =>
    setState(prev => ({ ...prev, stages: prev.stages.map(s => s.id===id? {...s,label} : s) }));
  const recolorStage = (id: StageId, colorClass: string) =>
    setState(prev => ({ ...prev, stages: prev.stages.map(s => s.id===id? {...s,colorClass} : s) }));
  const reorderStages = (next: StageMeta[]) => setState(prev => ({ ...prev, stages: next }));
  const deleteStage = (id: StageId) => setState(prev => {
    const remaining = prev.stages.filter(s => s.id!==id);
    const fallback = remaining[0]?.id;
    const reassigned = prev.items.map(it => it.stageId===id && fallback ? {...it, stageId:fallback} : it);
    return { ...prev, stages: remaining, items: reassigned };
  });

  // Timeline
  const setTimeline = (patch: Partial<Timeline>) => setState(prev => ({ ...prev, tl: { ...prev.tl, ...patch }}));

  function exportJSON() {
    const blob = new Blob([JSON.stringify({ items, lanes, stages, tl }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `roadmap-${tl.startYear}.json`; a.click(); URL.revokeObjectURL(url);
  }
  function importJSON(evt: React.ChangeEvent<HTMLInputElement>) {
    const f = evt.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const obj = JSON.parse(String(r.result));
        if (obj && Array.isArray(obj.items) && Array.isArray(obj.lanes) && Array.isArray(obj.stages) && obj.tl) {
          setState({ items: obj.items, lanes: obj.lanes, stages: obj.stages, tl: obj.tl });
        } else alert("Invalid roadmap file.");
      } catch { alert("Invalid roadmap file."); }
    };
    r.readAsText(f);
  }

  return (
    <div className="min-h-screen w-full bg-white p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Roadmap</h1>
            <p className="text-slate-600">Editable time range, stages, lanes, and header title.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <TimelineControls tl={tl} onChange={setTimeline} />
            <Dialog open={laneMgrOpen} onOpenChange={setLaneMgrOpen}>
              <DialogTrigger asChild><Button variant="outline" className="gap-2"><Edit2 className="h-4 w-4" /> Edit Lanes</Button></DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>Manage Swimlanes</DialogTitle></DialogHeader>
                <LaneManager lanes={lanes} onAdd={addLane} onRename={renameLane} onRecolor={recolorLane} onDelete={deleteLane} onReorder={reorderLanes} />
              </DialogContent>
            </Dialog>
            <Dialog open={stageMgrOpen} onOpenChange={setStageMgrOpen}>
              <DialogTrigger asChild><Button variant="outline" className="gap-2"><Edit2 className="h-4 w-4" /> Edit Stages</Button></DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>Manage Progress Stages</DialogTitle></DialogHeader>
                <StageManager stages={stages} onAdd={addStage} onRename={renameStage} onRecolor={recolorStage} onDelete={deleteStage} onReorder={reorderStages} />
              </DialogContent>
            </Dialog>
            <label className="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <Upload className="h-4 w-4" /> Import JSON
              <input type="file" accept="application/json" className="hidden" onChange={importJSON} />
            </label>
            <Button variant="secondary" onClick={exportJSON} className="gap-2"><Download className="h-4 w-4" /> Export JSON</Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Add Item</Button></DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>Add Roadmap Item</DialogTitle></DialogHeader>
                <ItemForm lanes={lanes} stages={stages} tl={tl} onSubmit={(payload) => { upsert({ ...payload, id: uuid() }); setOpen(false); }} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Legend */}
        <Card className="shadow-sm">
          <CardContent className="flex flex-wrap gap-3 p-3">
            {stages.map(s => (
              <span key={s.id} className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
                <span className={`h-2.5 w-2.5 rounded-full ${s.colorClass}`} />{s.label}
              </span>
            ))}
            <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"><Flag className="h-3.5 w-3.5" /> Milestone</span>
          </CardContent>
        </Card>

        {/* Timeline */}
        <div className="rounded-2xl border bg-white p-0 shadow-sm overflow-hidden relative">
          {tl.autoFit !== false && items.length > 0 && (
            <div className="absolute top-2 right-2 z-10">
              <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full border border-blue-200 flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                Auto-fit Active
              </div>
            </div>
          )}
          <QuarterHeader tl={effectiveTimeline} cols={cols} />
          <div className="grid grid-cols-[200px_1fr]">
            {/* Left: editable header title + lanes */}
            <div className="border-t">
              {/* Replaced editable Left Header Title input with static title display */}
              {/* Renamed to Title */}
              <div className="px-4 py-3 border-b">
                <div className="text-xs font-semibold tracking-wide text-slate-600 truncate">{tl.leftTitle}</div>
              </div>
              {visibleLanes.map((lane, i) => {
                const laneHeight = calculateLaneHeight(lane.id);
                return (
                  <div key={lane.id} className={`relative text-sm font-medium ${i !== 0 ? "border-t" : ""}`} style={{ height: `${laneHeight}px`, paddingTop: '12px', paddingBottom: '4px', paddingLeft: '16px', paddingRight: '16px' }}>
                    <div className="flex items-center" style={{ height: '20px' }}>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-1.5 rounded-full flex-shrink-0" style={{ background: lane.color }} />
                        <span className="truncate font-medium">{lane.label}</span>
                        {(itemsByLane[lane.id] || []).length > 1 && (
                          <span className="text-xs text-slate-500 ml-2 flex-shrink-0">({(itemsByLane[lane.id] || []).length} items)</span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
              {shouldCollapse && (
                <div className="border-t px-4 py-3 bg-slate-50">
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="h-8 text-xs text-slate-600 hover:text-slate-900"
                  >
                    {isExpanded ? (
                      <>▲ Show Less</>
                    ) : (
                      <>▼ Show {hiddenCount} More Lane{hiddenCount !== 1 ? 's' : ''}</>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Right: grid per lane */}
            <div className="border-l">
              {visibleLanes.map((lane, laneIdx) => {
                const laneHeight = calculateLaneHeight(lane.id);
                return (
                  <div key={lane.id} className={`timeline-grid relative grid overflow-hidden ${laneIdx !== 0 ? "border-t" : ""}`} style={{ gridTemplateColumns: gridTemplate, height: `${laneHeight}px` }}>
                    {Array.from({ length: cols }).map((_, i) => (
                      <div key={i} className="h-full border-l/20 border-l relative">
                        <div className="absolute top-1 left-1 roadmap-text text-[10px] font-medium text-slate-500 bg-white/60 px-1 rounded-sm shadow-sm" style={{ textShadow: '0 1px 1px rgba(255,255,255,0.8)' }}>
                          {monthName(effectiveTimeline.startMonth + i)} {/* month label */}
                        </div>
                      </div>
                    ))}
                    {/* Items positioned with stacking for multiple items */}
                    {(itemsByLane[lane.id] || []).map((it, itemIdx) => {
                      // Calculate cumulative position for this item - align with lane header positioning
                      // Start at 12px to match lane header top padding, plus 20px for header height, plus 4px gap
                      let cumulativeTop = 12 + 20 + 4; // Match lane header positioning: 12px padding + 20px header height + 4px gap
                      for (let i = 0; i < itemIdx; i++) {
                        const prevItem = (itemsByLane[lane.id] || [])[i];
                        const prevTitleLength = prevItem.title.length;
                        const charsPerLine = Math.max(20, Math.min(30, 60 - prevTitleLength * 0.1));
                        const prevEstimatedLines = Math.ceil(prevTitleLength / charsPerLine);
                        const actualLines = Math.min(prevEstimatedLines, 3); // Max 3 lines
                        const prevItemHeight = Math.min(32 + (actualLines - 1) * 16, 64); // Match new sizing
                        cumulativeTop += prevItemHeight + 4; // Add height + gap for spacing
                      }
                      
                      return (
                        <BarPill
                          key={it.id}
                          item={it}
                          laneColor={laneById[it.laneId]?.color || "#94a3b8"}
                          colorClass={stageById[it.stageId]?.colorClass || "bg-slate-400"}
                          onEdit={() => setEditing(it)}
                          onDelete={() => remove(it.id)}
                          onResize={(newStartDate, newEndDate) => {
                            // Update item with new dates, preserving day information
                            const updatedItem = {
                              ...it,
                              startYear: Math.floor(newStartDate / 12),
                              startMonth: newStartDate % 12,
                              startDay: it.startDay || 1, // Preserve existing day or default to 1
                              endYear: Math.floor(newEndDate / 12),
                              endMonth: newEndDate % 12,
                              endDay: it.endDay || 1, // Preserve existing day or default to 1
                            };
                            upsert(updatedItem);
                          }}
                          absStart={absStart}
                          cols={cols}
                          stackIndex={itemIdx}
                          verticalOffset={cumulativeTop}
                        />
                      );
                    })}
                  </div>
                );
              })}
              {shouldCollapse && (
                <div className={`border-t bg-slate-50 ${isExpanded ? 'hidden' : 'flex'} items-center justify-center`} style={{ height: "3rem" }}>
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsExpanded(true)}
                    className="h-8 text-xs text-slate-500 hover:text-slate-700"
                  >
                    ▼ Show {hiddenCount} more row{hiddenCount !== 1 ? 's' : ''}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o: boolean) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Roadmap Item</DialogTitle></DialogHeader>
          {editing && (
            <ItemForm
              initial={editing}
              lanes={lanes}
              stages={stages}
              tl={tl}
              onSubmit={(payload) => { setEditing(null); upsert({ ...editing, ...payload }); }}
              onDelete={() => { setEditing(null); remove(editing.id); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Header Bands (quarters across range) ---------- */
function QuarterHeader({ tl, cols }: { tl: Timeline; cols: number }) {
  const bands: { label: string; span: number }[] = [];
  let monthAbs = toAbs(tl.startYear, tl.startMonth);
  for (let i = 0; i < cols;) {
    const monthIdx = (monthAbs % 12 + 12) % 12;
    const q = quarterName(monthIdx);
    const remainingInQ = 3 - (monthIdx % 3);
    const span = Math.min(cols - i, remainingInQ);
    bands.push({ label: q, span });
    i += span; monthAbs += span;
  }
  return (
    <div className="grid grid-cols-[200px_1fr] border-b">
      <div className="px-4 py-3 text-xs font-semibold tracking-wide" />
      <div className="grid text-xs font-semibold" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {bands.map((b, idx) => (
          <div key={idx} className="relative text-center col-span-full" style={{ gridColumn: `span ${b.span} / span ${b.span}` }}>
            <div className="py-3" style={{ color: ["#7c3aed", "#0ea5e9", "#10b981", "#f97316"][idx % 4] }}>{b.label}</div>
            <div className={`absolute inset-0 -z-10 ${idx % 2 === 0 ? "bg-slate-50" : "bg-white"}`}></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Bar (pill) ---------- */
function BarPill({ item, laneColor, colorClass, onEdit, onDelete, onResize, absStart, cols, stackIndex = 0, verticalOffset = 8 }:{ item: RoadmapItem; laneColor: string; colorClass: string; onEdit: () => void; onDelete: () => void; onResize: (newStartDate: number, newEndDate: number) => void; absStart: number; cols: number; stackIndex?: number; verticalOffset?: number; }) {
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [originalStartDate, setOriginalStartDate] = useState(item.startYear * 12 + item.startMonth);
  const [originalEndDate, setOriginalEndDate] = useState(item.endYear * 12 + item.endMonth);
  // Use day-level precision for proportional positioning within months
  const itemAbsStart = toAbsWithDays(item.startYear, item.startMonth, item.startDay || 1);
  const itemAbsEnd = toAbsWithDays(item.endYear, item.endMonth, item.endDay || 1);
  const timelineAbsEnd = absStart + cols;

  // Check if item is visible in current timeline range
  if (itemAbsEnd < absStart || itemAbsStart > timelineAbsEnd) return null;

  // Calculate fractional grid positions for proportional placement
  const startOffset = Math.max(0, itemAbsStart - absStart);
  const endOffset = Math.min(cols, itemAbsEnd - absStart);

  // Calculate precise start date position within its month for better proportional placement
  const startDateDay = item.startDay || 1;
  const daysInStartMonth = daysInMonth(item.startYear, item.startMonth);
  const startDateFraction = (startDateDay - 1) / daysInStartMonth; // 0-based fraction within month

  // Calculate the month column where the start date should appear
  const startMonthAbs = toAbs(item.startYear, item.startMonth);
  const startMonthColumn = Math.max(0, Math.min(cols - 1, startMonthAbs - absStart));

  // Calculate the exact position within the start month column
  const startPositionInMonth = startMonthColumn + startDateFraction;

  // Calculate precise end date position within its month for better proportional placement
  const endDateDay = item.endDay || daysInMonth(item.endYear, item.endMonth);
  const daysInEndMonth = daysInMonth(item.endYear, item.endMonth);
  const endDateFraction = (endDateDay - 1) / daysInEndMonth; // 0-based fraction within month

  // Calculate the month column where the end date should appear
  const endMonthAbs = toAbs(item.endYear, item.endMonth);
  const endMonthColumn = Math.max(0, Math.min(cols - 1, endMonthAbs - absStart));

  // Calculate the exact position within the month column
  const endPositionInMonth = endMonthColumn + endDateFraction;

  // Calculate the actual duration in days for more accurate proportional sizing
  const calculateDaysBetween = (startYear: number, startMonth: number, startDay: number, endYear: number, endMonth: number, endDay: number): number => {
    const startDate = new Date(startYear, startMonth, startDay);
    const endDate = new Date(endYear, endMonth, endDay);
    const timeDiff = endDate.getTime() - startDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)); // Convert to days
  };

  const totalDays = calculateDaysBetween(item.startYear, item.startMonth, item.startDay || 1, item.endYear, item.endMonth, item.endDay || 1);

  // Calculate total timeline duration in days for proportional scaling
  const timelineStartYear = Math.floor(absStart / 12);
  const timelineStartMonth = absStart % 12;
  const timelineEndYear = Math.floor((absStart + cols) / 12);
  const timelineEndMonth = (absStart + cols) % 12;
  const timelineTotalDays = calculateDaysBetween(timelineStartYear, timelineStartMonth, 1, timelineEndYear, timelineEndMonth, daysInMonth(timelineEndYear, timelineEndMonth));

  // Convert to CSS grid column positions (1-based)
  const gridStart = Math.floor(startOffset) + 1;
  const gridEnd = Math.ceil(endOffset) + 1;

  // Calculate precise positioning within the grid cells for proportional dates
  const startFraction = startOffset % 1;
  const totalSpan = endOffset - startOffset;
  const gridSpan = gridEnd - gridStart;

  // Calculate dynamic height and width based on both text length and task duration
  const titleLength = item.title.length;

  // Calculate width based on actual day duration for more accurate proportions
  const timelineWidthPercent = (totalDays / timelineTotalDays) * 100;
  const gridBasedWidth = gridSpan > 0 ? (totalSpan / gridSpan) * 100 : timelineWidthPercent;

  // Determine minimum width based on content length to ensure readability
  const minWidthForContent = Math.max(60, titleLength * 2); // At least 60px, more for longer titles
  const minWidthPercent = (minWidthForContent / (gridSpan > 0 ? gridSpan * 100 : 100)) * 100; // Convert to percentage of available space

  const adjustedWidth = Math.max(
    Math.min(timelineWidthPercent, gridBasedWidth),
    Math.min(minWidthPercent, 100) // Cap minimum at 100% to prevent overflow
  );
  const charsPerLine = Math.max(20, Math.min(30, 60 - titleLength * 0.1)); // More conservative chars per line
  const estimatedLines = Math.ceil(titleLength / charsPerLine);
  const maxLines = 3; // Limit to 3 lines to prevent overlap
  const actualLines = Math.min(estimatedLines, maxLines);

  // Base height calculation from text content
  const textBasedHeight = 32 + (actualLines - 1) * 16;

  // Duration-based height adjustment (longer tasks get slightly taller for better visibility)
  const durationBonus = Math.min(totalDays * 0.5, 16); // Max 16px bonus for very long tasks

  const barHeight = Math.min(textBasedHeight + durationBonus, 64); // Cap at 64px

  const style: React.CSSProperties = {
    gridColumn: `${gridStart} / ${gridEnd}`,
    // Add sub-grid positioning for proportional date placement
    marginLeft: `${startFraction * 100}%`,
    width: `${adjustedWidth}%`,
    // Vertical stacking for multiple items in same lane - ensure proper containment
    position: 'absolute',
    top: `${verticalOffset}px`, // Use calculated cumulative offset
    zIndex: 10 + stackIndex,
    // Ensure item doesn't exceed the lane height
    maxHeight: `${barHeight}px`,
    overflow: 'hidden',
  };
  
  const progress = typeof item.progress === "number" ? clamp(item.progress, 0, 100) : undefined;
  
  // Determine optimal font size based on content, available space, and task duration
  // Base font size is more generous for better readability
  const baseFontSize = titleLength > 50 ? 11 : titleLength > 30 ? 12 : titleLength > 15 ? 13 : 14;

  // Adjust font size based on task width - less aggressive reduction for better readability
  const widthAdjustment = adjustedWidth < 20 ? -1 : adjustedWidth < 30 ? -0.5 : 0;
  const fontSize = Math.max(10, baseFontSize + widthAdjustment) + 'px'; // Minimum 10px for better readability

  // Better line height for improved readability
  const lineHeightRatio = titleLength > 40 ? '1.3' : '1.4';

  // Font weight adjustment for better contrast
  const fontWeight = adjustedWidth < 25 ? 600 : 500; // Slightly bolder for narrow tasks
  
  // Handle mouse events for dragging
  const handleMouseDown = (edge: 'start' | 'end') => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(edge);
    setDragStartX(e.clientX);
    setOriginalStartDate(item.startYear * 12 + item.startMonth);
    setOriginalEndDate(item.endYear * 12 + item.endMonth);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStartX;
    const timelineElement = document.querySelector('.timeline-grid');
    if (!timelineElement) return;
    
    const timelineWidth = timelineElement.getBoundingClientRect().width;
    const monthsPerPixel = cols / timelineWidth;
    const deltaMonths = Math.round(deltaX * monthsPerPixel);
    
    if (isDragging === 'start') {
      const newStartDate = Math.max(0, originalStartDate + deltaMonths);
      const currentEndDate = originalEndDate;
      if (newStartDate < currentEndDate) {
        onResize(newStartDate, currentEndDate);
      }
    } else if (isDragging === 'end') {
      const newEndDate = Math.max(originalStartDate + 1, originalEndDate + deltaMonths);
      onResize(originalStartDate, newEndDate);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  // Add global mouse event listeners when dragging
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStartX, originalStartDate, originalEndDate]);

  // Format dates for display
  const formatDate = (year: number, month: number, day: number) => {
    const date = new Date(year, month, day);
    const currentYear = new Date().getFullYear();
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: year !== currentYear ? 'numeric' : undefined
    });
  };

  // Get month name for better context
  const getMonthName = (month: number) => {
    return MONTHS[month]?.label || 'Unknown';
  };

  const startDateStr = formatDate(item.startYear, item.startMonth, item.startDay || 1);
  const endDateStr = formatDate(item.endYear, item.endMonth, item.endDay || daysInMonth(item.endYear, item.endMonth));

  return (
    <motion.div
      layout
      style={{...style, height: `${barHeight}px`}}
      className="relative group/task"
    >
      {/* Enhanced tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-40 opacity-0 group-hover/task:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div className="tooltip-container bg-slate-900 text-white text-sm px-3 py-2 rounded-lg shadow-xl border border-slate-700 whitespace-normal">
          <div className="font-semibold text-white mb-1 leading-tight">{item.title}</div>
          {item.description && (
            <div className="text-slate-300 text-xs mb-2 leading-relaxed">{item.description}</div>
          )}
          <div className="text-xs space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Duration:</span>
              <span className="text-white font-medium ml-2">{startDateStr} - {endDateStr}</span>
            </div>
            {item.owner && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Owner:</span>
                <span className="text-white ml-2">{item.owner}</span>
              </div>
            )}
            {item.progress !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Progress:</span>
                <span className="text-white ml-2">{item.progress}%</span>
              </div>
            )}
          </div>
        </div>
        <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900 mx-auto"></div>
      </div>
      {/* Left resize handle */}
      <div
        className="absolute left-0 top-0 w-1 h-full cursor-ew-resize z-20 hover:bg-white/30 flex items-center justify-center group"
        onMouseDown={handleMouseDown('start')}
      >
        <div className="w-0.5 h-3/4 bg-white/50 group-hover:bg-white/80 transition-colors" />
      </div>
      
      {/* Right resize handle */}
      <div
        className="absolute right-0 top-0 w-1 h-full cursor-ew-resize z-20 hover:bg-white/30 flex items-center justify-center group"
        onMouseDown={handleMouseDown('end')}
      >
        <div className="w-0.5 h-3/4 bg-white/50 group-hover:bg-white/80 transition-colors" />
      </div>

      <div className={`group h-full rounded-md ${colorClass} text-white shadow-sm flex items-center pl-0 pr-1 relative overflow-hidden ${isDragging ? 'opacity-80' : ''}`}>
        {/* Start date indicator */}
        {startOffset >= 0 && (
          <div
            className="absolute -top-6 z-30 opacity-0 group-hover/task:opacity-100 transition-opacity duration-200"
            style={{
              left: startPositionInMonth >= 0 && startPositionInMonth <= cols
                ? `${(startPositionInMonth / cols) * 100}%`
                : startPositionInMonth < 0 ? '0%' : '100%',
              transform: startPositionInMonth >= 0 && startPositionInMonth <= cols
                ? 'translateX(-50%)'
                : startPositionInMonth < 0 ? 'translateX(0%)' : 'translateX(-100%)'
            }}
          >
            <div className={`bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap border border-slate-600 ${startPositionInMonth < 0 || startPositionInMonth > cols ? 'opacity-60' : ''}`}>
              <div className="font-medium">{startDateStr}</div>
              <div className="text-slate-300 text-[10px]">
                Start • {getMonthName(item.startMonth)}
                {(startPositionInMonth < 0 || startPositionInMonth > cols) && (
                  <span className="text-amber-300 ml-1">⤴</span>
                )}
              </div>
            </div>
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800 mx-auto"></div>
          </div>
        )}

        {/* End date indicator */}
        {endOffset > 0 && (
          <div
            className="absolute -top-6 z-30 opacity-0 group-hover/task:opacity-100 transition-opacity duration-200"
            style={{
              left: endPositionInMonth >= 0 && endPositionInMonth <= cols
                ? `${(endPositionInMonth / cols) * 100}%`
                : endPositionInMonth < 0 ? '0%' : '100%',
              transform: endPositionInMonth >= 0 && endPositionInMonth <= cols
                ? 'translateX(-50%)'
                : endPositionInMonth < 0 ? 'translateX(0%)' : 'translateX(-100%)'
            }}
          >
            <div className={`bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap border border-slate-600 ${endPositionInMonth < 0 || endPositionInMonth > cols ? 'opacity-60' : ''}`}>
              <div className="font-medium">{endDateStr}</div>
              <div className="text-slate-300 text-[10px]">
                End • {getMonthName(item.endMonth)}
                {(endPositionInMonth < 0 || endPositionInMonth > cols) && (
                  <span className="text-amber-300 ml-1">⤴</span>
                )}
              </div>
            </div>
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800 mx-auto"></div>
          </div>
        )}
        <span className="h-full w-2 rounded-l-md shrink-0" style={{ background: laneColor }} />
        <div className="ml-2 flex-1 flex items-center justify-between min-w-0 h-full">
          <span
            className="roadmap-text leading-tight py-1 break-words hyphens-auto flex-1 pr-1 overflow-hidden text-white"
            style={{
              wordBreak: 'break-word',
              lineHeight: lineHeightRatio,
              fontSize: fontSize,
              fontWeight: fontWeight,
              display: '-webkit-box',
              WebkitLineClamp: actualLines, // Use actualLines instead of estimatedLines
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)', // Add text shadow for better contrast
              WebkitTextStroke: '0.3px rgba(0,0,0,0.2)' // Subtle text stroke for better definition
            }}
          >
            {item.title}
          </span>
          <div className="flex items-center gap-1 shrink-0 self-start mt-1">
            {typeof progress === "number" && <span className="text-[10px] font-bold opacity-95 bg-black/30 px-1.5 py-0.5 rounded text-white" style={{ textShadow: '0 1px 1px rgba(0,0,0,0.5)' }}>{progress}%</span>}
            <div className="hidden gap-0.5 group-hover:flex">
              <Button size="icon" variant="ghost" className="h-4 w-4 text-white/90 p-0" onClick={onEdit}>
                <Edit2 className="h-2.5 w-2.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-4 w-4 text-white/90 p-0" onClick={onDelete}>
                <Trash2 className="h-2.5 w-2.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      {item.milestones?.map((ms, i) => {
        // Milestones are month-based; anchor them to the item's startYear for absolute positioning
        const msAbs = toAbs(item.startYear, ms.month);
        if (msAbs < absStart || msAbs > absStart + cols) return null;
        const msOffset = msAbs - absStart;
        const pct = (msOffset - startOffset) / Math.max(0.1, endOffset - startOffset);
        return (
          <div key={i} className="absolute -top-5" style={{ left: `calc(${pct * 100}% - 6px)` }}>
            <Flag className="h-3.5 w-3.5 text-slate-700 drop-shadow-sm" />
            <div className="roadmap-text text-[10px] font-medium text-slate-700 whitespace-nowrap bg-white/80 px-1 rounded-sm shadow-sm" style={{ textShadow: '0 1px 1px rgba(255,255,255,0.8)' }}>{ms.label}</div>
          </div>
        );
      })}
    </motion.div>
  );
}

/* ---------- Controls & Forms ---------- */
function TimelineControls({ tl, onChange }: { tl: Timeline; onChange: (patch: Partial<Timeline>) => void }) {
  const [leftTitle, setLeftTitle] = useState(tl.leftTitle);
  const [sy, setSy] = useState(tl.startYear);
  const [sm, setSm] = useState(tl.startMonth);
  const [ey, setEy] = useState(tl.endYear);
  const [em, setEm] = useState(tl.endMonth);
  const [autoFit, setAutoFit] = useState(tl.autoFit !== false);
  useEffect(() => { onChange({ leftTitle }); }, [leftTitle]);
  useEffect(() => { onChange({ autoFit }); }, [autoFit]);
  useEffect(() => {
    const a = toAbs(sy, sm), b = toAbs(ey, em);
    if (a <= b) onChange({ startYear: sy, startMonth: sm, endYear: ey, endMonth: em });
    else onChange({ startYear: ey, startMonth: em, endYear: sy, endMonth: sm });
  }, [sy, sm, ey, em]);
  const startValue = `${sy}-${String(sm + 1).padStart(2,'0')}`;
  const endValue = `${ey}-${String(em + 1).padStart(2,'0')}`;
  const onStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [y,m] = e.target.value.split('-').map(Number); if(!isNaN(y) && !isNaN(m)) { setSy(y); setSm(m-1); }
  };
  const onEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [y,m] = e.target.value.split('-').map(Number); if(!isNaN(y) && !isNaN(m)) { setEy(y); setEm(m-1); }
  };
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-1">
        <Label className="text-sm text-slate-600">Title</Label>
        <Input className="w-[180px] h-8" value={leftTitle} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setLeftTitle(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-sm text-slate-600">Date Range</Label>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={startValue}
            onChange={onStartChange}
            className="h-8"
            disabled={autoFit}
          />
          <span className="text-slate-500">→</span>
          <Input
            type="month"
            value={endValue}
            onChange={onEndChange}
            className="h-8"
            disabled={autoFit}
          />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            id="autoFit"
            checked={autoFit}
            onChange={(e) => setAutoFit(e.target.checked)}
            className="rounded"
          />
          <Label htmlFor="autoFit" className="text-sm text-slate-600 cursor-pointer">
            Auto-fit to tasks {autoFit && <span className="text-xs text-blue-600 font-medium">(Active)</span>}
          </Label>
        </div>
      </div>
    </div>
  );
}

function ItemForm({ onSubmit, onDelete, initial, lanes, stages, tl }:{ onSubmit: (i: RoadmapItem) => void; onDelete?: () => void; initial?: RoadmapItem | null; lanes: LaneMeta[]; stages: StageMeta[]; tl: Timeline; }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [owner, setOwner] = useState(initial?.owner || "");
  const [laneId, setLaneId] = useState<LaneId>(initial?.laneId || lanes[0].id);
  const [stageId, setStageId] = useState<StageId>(initial?.stageId || stages[0].id);
  const defaultStartYear = initial?.startYear ?? tl.startYear;
  const defaultStartMonth = initial?.startMonth ?? tl.startMonth;
  const defaultStartDay = initial?.startDay ?? 1;
  const defaultEndYear = initial?.endYear ?? tl.startYear;
  const defaultEndMonth = initial?.endMonth ?? Math.min(tl.startMonth + 2, 11);
  const defaultEndDay = initial?.endDay ?? 28;
  const toISO = (y:number,m:number,d:number)=> `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const [startDate, setStartDate] = useState<string>(toISO(defaultStartYear, defaultStartMonth, defaultStartDay));
  const [endDate, setEndDate] = useState<string>(toISO(defaultEndYear, defaultEndMonth, defaultEndDay));
  const [milestones, setMilestones] = useState<{ label: string; month: number }[]>(initial?.milestones || []);
  const [progress, setProgress] = useState<number>(initial?.progress ?? 0);
  return (
    <form
      onSubmit={(evt) => {
        evt.preventDefault();
        const parse = (iso:string)=> { const [y,m,d] = iso.split('-').map(Number); return { y, m: m-1, d }; };
        const s = parse(startDate);
        const endParsed = parse(endDate);
        // normalize order
        let sAbs = toAbs(s.y, s.m), eAbs = toAbs(endParsed.y, endParsed.m);
        let start = s, end = endParsed;
        if (sAbs > eAbs || (sAbs===eAbs && s.d > endParsed.d)) { start = endParsed; end = s; }
        const payload: RoadmapItem = {
          id: initial?.id || uuid(),
          title: title.trim(),
          description: description.trim() || undefined,
          owner: owner.trim() || undefined,
          laneId,
          stageId,
          startYear: start.y,
          startMonth: start.m,
          startDay: clamp(start.d,1,31),
          endYear: end.y,
          endMonth: end.m,
          endDay: clamp(end.d,1,31),
          progress: Number.isFinite(progress) ? clamp(progress, 0, 100) : undefined,
          milestones: milestones.filter(m => m.label.trim()).map(m => ({ label: m.label.trim(), month: clamp(m.month, 0, 11) })),
        };
        onSubmit(payload);
      }}
      className="space-y-4"
    >
      <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setTitle(e.target.value)} placeholder="e.g., Market Analysis" required /></div>
      <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>)=>setDescription(e.target.value)} placeholder="Short context for stakeholders" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Lane</Label>
          <Select value={laneId} onValueChange={(v: string)=>setLaneId(v)}>
            <SelectTrigger><SelectValue placeholder="Choose lane" /></SelectTrigger>
            <SelectContent>{lanes.map(l => (<SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Stage</Label>
          <Select value={stageId} onValueChange={(v: string)=>setStageId(v)}>
            <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
            <SelectContent>{stages.map(s => (<SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>))}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={startDate} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setStartDate(e.target.value)} /></div>
        <div className="space-y-2"><Label>End Date</Label><Input type="date" value={endDate} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setEndDate(e.target.value)} /></div>
        <div className="space-y-2"><Label>Progress (%)</Label><Input type="number" min={0} max={100} value={progress} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setProgress(Number(e.target.value))} /></div>
      </div>
      <div className="space-y-2"><Label>Milestones</Label><MiniMilestonesEditor value={milestones} onChange={setMilestones} /></div>
      <div className="flex items-center justify-between">
  <div className="text-xs text-slate-500 inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {startDate} – {endDate}</div>
        <DialogFooter className="gap-2">{onDelete && (<Button type="button" variant="ghost" onClick={onDelete} className="text-red-600">Delete</Button>)}<Button type="submit">Save</Button></DialogFooter>
      </div>
    </form>
  );
}

function MiniMilestonesEditor({ value, onChange }: { value: { label: string; month: number }[]; onChange: (v: { label: string; month: number }[]) => void }) {
  const add = () => onChange([...value, { label: "Milestone", month: 1 }]);
  const update = (i: number, patch: Partial<{ label: string; month: number }>) => { const copy = value.slice(); copy[i] = { ...copy[i], ...patch }; onChange(copy); };
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  return (
    <div className="flex flex-col gap-2">
      {value.map((m, i) => (
        <div key={i} className="grid grid-cols-1 sm:grid-cols-7 gap-2 items-center">
          <div className="sm:col-span-4"><Input value={m.label} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>update(i,{ label: e.target.value })} /></div>
          <div className="sm:col-span-2">
            <Select value={String(m.month)} onValueChange={(v: string)=>update(i,{ month: Number(v) })}>
              <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
              <SelectContent>{MONTHS.map((mm, idx)=>(<SelectItem key={mm.label} value={String(idx)}>{mm.label}</SelectItem>))}</SelectContent>
            </Select>
          </div>
            <Button type="button" variant="ghost" onClick={()=>remove(i)} className="justify-self-start">Remove</Button>
        </div>
      ))}
      <Button type="button" variant="secondary" onClick={add} className="self-start"><Plus className="h-4 w-4 mr-1" />Add milestone</Button>
    </div>
  );
}

/* ---------- Managers ---------- */
function LaneManager({ lanes, onAdd, onRename, onRecolor, onDelete, onReorder }:{ lanes: LaneMeta[]; onAdd:(label:string,color:string)=>void; onRename:(id:LaneId,label:string)=>void; onRecolor:(id:LaneId,color:string)=>void; onDelete:(id:LaneId)=>void; onReorder:(next:LaneMeta[])=>void; }) {
  const [label, setLabel] = useState(""); const [color, setColor] = useState("#64748b");
  const move = (i:number,dir:-1|1)=>{ const j=i+dir; if(j<0||j>=lanes.length) return; const copy=lanes.slice(); [copy[i],copy[j]]=[copy[j],copy[i]]; onReorder(copy); };
  return (
    <div className="space-y-3">
      {lanes.map((l,i)=>(
        <div key={l.id} className="grid grid-cols-[1fr_120px_auto_auto] gap-2 items-center">
          <Input value={l.label} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>onRename(l.id, e.target.value)} />
          <Input type="color" value={l.color} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>onRecolor(l.id, e.target.value)} />
          <Button type="button" variant="ghost" onClick={()=>move(i,-1)}>↑</Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={()=>move(i,1)}>↓</Button>
            <Button type="button" variant="destructive" onClick={()=>onDelete(l.id)}>Delete</Button>
          </div>
        </div>
      ))}
      <div className="grid grid-cols-[1fr_120px_auto] gap-2 items-center">
        <Input placeholder="New lane label" value={label} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setLabel(e.target.value)} />
        <Input type="color" value={color} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setColor(e.target.value)} />
        <Button type="button" onClick={()=>{ if(label.trim()){ onAdd(label.trim(), color); setLabel(""); }}}>Add lane</Button>
      </div>
      <p className="text-xs text-slate-500">Deleting a lane reassigns its items to the first remaining lane.</p>
    </div>
  );
}

function StageManager({ stages, onAdd, onRename, onRecolor, onDelete, onReorder }:{ stages: StageMeta[]; onAdd:(label:string,colorClass:string)=>void; onRename:(id:StageId,label:string)=>void; onRecolor:(id:StageId,colorClass:string)=>void; onDelete:(id:StageId)=>void; onReorder:(next:StageMeta[])=>void; }) {
  const [label, setLabel] = useState(""); const [colorClass, setColorClass] = useState("bg-slate-500");
  const move = (i:number,dir:-1|1)=>{ const j=i+dir; if(j<0||j>=stages.length) return; const copy=stages.slice(); [copy[i],copy[j]]=[copy[j],copy[i]]; onReorder(copy); };
  return (
    <div className="space-y-3">
      {stages.map((s,i)=>(
        <div key={s.id} className="grid grid-cols-[1fr_220px_auto_auto] gap-2 items-center">
          <Input value={s.label} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>onRename(s.id, e.target.value)} />
          <Select value={s.colorClass} onValueChange={(v)=>onRecolor(s.id, v)}>
            <SelectTrigger><SelectValue placeholder="Color" /></SelectTrigger>
            <SelectContent>
              {["bg-purple-500","bg-cyan-500","bg-amber-500","bg-emerald-500","bg-rose-500","bg-indigo-500","bg-sky-500","bg-lime-500","bg-fuchsia-500"]
                .map(c => <SelectItem key={c} value={c}>{c.replace("bg-","")}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button type="button" variant="ghost" onClick={()=>move(i,-1)}>↑</Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={()=>move(i,1)}>↓</Button>
            <Button type="button" variant="destructive" onClick={()=>onDelete(s.id)}>Delete</Button>
          </div>
        </div>
      ))}
      <div className="grid grid-cols-[1fr_220px_auto] gap-2 items-center">
        <Input placeholder="New stage label" value={label} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setLabel(e.target.value)} />
        <Select value={colorClass} onValueChange={setColorClass}>
          <SelectTrigger><SelectValue placeholder="Color" /></SelectTrigger>
          <SelectContent>
            {["bg-purple-500","bg-cyan-500","bg-amber-500","bg-emerald-500","bg-rose-500","bg-indigo-500","bg-sky-500","bg-lime-500","bg-fuchsia-500"]
              .map(c => <SelectItem key={c} value={c}>{c.replace("bg-","")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button type="button" onClick={()=>{ if(label.trim()){ onAdd(label.trim(), colorClass); setLabel(""); }}}>Add stage</Button>
      </div>
      <p className="text-xs text-slate-500">Deleting a stage reassigns affected items to the first remaining stage.</p>
    </div>
  );
}
