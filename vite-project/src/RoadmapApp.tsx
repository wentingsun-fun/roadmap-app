import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Download, Upload, Calendar, Edit2, Flag, FileText, LayoutDashboard, Clock, ChevronRight } from "lucide-react";

const uuid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

/* ---------- Roadmap Meta Type ---------- */
export type RoadmapMeta = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

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
  notes?: string;      // Detailed notes for the task
};

type Timeline = {
  leftTitle: string;      // was "Tasks" — now editable
  startYear: number;
  startMonth: number;     // 0-11
  endYear: number;
  endMonth: number;       // 0-11
  autoFit?: boolean;      // Auto-fit timeline to items' date range
  zoom?: 'quarter' | 'month' | 'week';
};

/* ---------- Storage Keys ---------- */
const STORAGE_ROADMAPS_LIST = "roadmap.list.v1";
const STORAGE_CURRENT_ROADMAP = "roadmap.current.v1";
const getStorageKey = (roadmapId: string, type: string) => `roadmap.${roadmapId}.${type}`;

/* ---------- Multi-Roadmap Storage ---------- */
export function loadRoadmapsList(): RoadmapMeta[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_ROADMAPS_LIST) || "[]") as RoadmapMeta[];
  } catch {
    return [];
  }
}

export function saveRoadmapsList(roadmaps: RoadmapMeta[]) {
  localStorage.setItem(STORAGE_ROADMAPS_LIST, JSON.stringify(roadmaps));
}

export function getCurrentRoadmapId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_CURRENT_ROADMAP);
}

export function setCurrentRoadmapId(id: string | null) {
  if (id) {
    localStorage.setItem(STORAGE_CURRENT_ROADMAP, id);
  } else {
    localStorage.removeItem(STORAGE_CURRENT_ROADMAP);
  }
}

export function createNewRoadmap(name: string, description?: string): RoadmapMeta {
  const now = new Date().toISOString();
  const roadmap: RoadmapMeta = {
    id: uuid(),
    name,
    description,
    createdAt: now,
    updatedAt: now,
  };
  
  const list = loadRoadmapsList();
  list.push(roadmap);
  saveRoadmapsList(list);
  
  // Initialize empty roadmap data
  saveRoadmapData(roadmap.id, [], DEFAULT_LANES, DEFAULT_STAGES, DEFAULT_TL);
  
  return roadmap;
}

export function deleteRoadmap(id: string) {
  const list = loadRoadmapsList();
  saveRoadmapsList(list.filter(r => r.id !== id));
  
  // Clean up roadmap data from localStorage
  localStorage.removeItem(getStorageKey(id, "items"));
  localStorage.removeItem(getStorageKey(id, "lanes"));
  localStorage.removeItem(getStorageKey(id, "stages"));
  localStorage.removeItem(getStorageKey(id, "timeline"));
  
  // If this was the current roadmap, clear it
  if (getCurrentRoadmapId() === id) {
    setCurrentRoadmapId(null);
  }
}

export function updateRoadmapMeta(id: string, updates: Partial<Pick<RoadmapMeta, 'name' | 'description'>>) {
  const list = loadRoadmapsList();
  const idx = list.findIndex(r => r.id === id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
    saveRoadmapsList(list);
  }
}

function saveRoadmapData(roadmapId: string, items: RoadmapItem[], lanes: LaneMeta[], stages: StageMeta[], tl: Timeline) {
  localStorage.setItem(getStorageKey(roadmapId, "items"), JSON.stringify(items));
  localStorage.setItem(getStorageKey(roadmapId, "lanes"), JSON.stringify(lanes));
  localStorage.setItem(getStorageKey(roadmapId, "stages"), JSON.stringify(stages));
  localStorage.setItem(getStorageKey(roadmapId, "timeline"), JSON.stringify(tl));
}

/* ---------- Defaults ---------- */
const DEFAULT_LANES: LaneMeta[] = [
  { id: "onboarding", label: "Onboarding", color: "#0d9488" },
  { id: "messaging", label: "Messaging", color: "#06b6d4" },
  { id: "analytics", label: "Analytics", color: "#22c55e" },
  { id: "admin", label: "Admin Console", color: "#0891b2" },
];

const DEFAULT_STAGES: StageMeta[] = [
  { id: "planned",      label: "Planned",       colorClass: "bg-slate-200" },
  { id: "in-progress",  label: "In Progress",   colorClass: "bg-cyan-200" },
  { id: "under-review", label: "Under Review",  colorClass: "bg-teal-200" },
  { id: "completed",    label: "Completed",     colorClass: "bg-emerald-200" },
];

const thisYear = new Date().getFullYear();
const DEFAULT_TL: Timeline = { leftTitle: "Tasks", startYear: thisYear, startMonth: 0, endYear: thisYear, endMonth: 11, autoFit: true, zoom: 'month' };

/* ---------- Persistence ---------- */
function load(roadmapId: string): { items: RoadmapItem[]; lanes: LaneMeta[]; stages: StageMeta[]; tl: Timeline } {
  if (typeof window === "undefined") return { items: [], lanes: DEFAULT_LANES, stages: DEFAULT_STAGES, tl: DEFAULT_TL };
  try {
    const rawItems = JSON.parse(localStorage.getItem(getStorageKey(roadmapId, "items")) || "[]") as any[];
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
    const lanes = JSON.parse(localStorage.getItem(getStorageKey(roadmapId, "lanes")) || "[]") as LaneMeta[];                    

    const stages = JSON.parse(localStorage.getItem(getStorageKey(roadmapId, "stages")) || "[]") as StageMeta[];
    const tl = JSON.parse(localStorage.getItem(getStorageKey(roadmapId, "timeline")) || "null") as Timeline | null;

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

function save(roadmapId: string, items: RoadmapItem[], lanes: LaneMeta[], stages: StageMeta[], tl: Timeline) {
  saveRoadmapData(roadmapId, items, lanes, stages, tl);
  // Update the roadmap's updatedAt timestamp
  updateRoadmapMeta(roadmapId, {});
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
// Determine if a Tailwind bg-* color likely needs darkening overlay for contrast
function shouldDarkenStage(colorClass: string | undefined): boolean {
  if (!colorClass) return false;
  return /(amber|yellow|lime|cyan|sky|stone|zinc|slate)-[345]/.test(colorClass) || /(amber|yellow|lime|cyan|sky)-500/.test(colorClass);
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
type RoadmapAppProps = {
  roadmapId: string;
  roadmapName: string;
  onBack: () => void;
};

export default function RoadmapApp({ roadmapId, roadmapName, onBack }: RoadmapAppProps) {
  const [{ items, lanes, stages, tl }, setState] = useState(() => load(roadmapId));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoadmapItem | null>(null);
  const [laneMgrOpen, setLaneMgrOpen] = useState(false);
  const [stageMgrOpen, setStageMgrOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => { save(roadmapId, items, lanes, stages, tl); }, [roadmapId, items, lanes, stages, tl]);

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
  const rightGridRef = useRef<HTMLDivElement>(null);
  const [timelineWidth, setTimelineWidth] = useState<number>(0);
  useEffect(() => {
    if (!rightGridRef.current) return;
    const el = rightGridRef.current;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = entry.contentRect.width;
      setTimelineWidth(width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const monthsPerPixel = useMemo(() => {
    return timelineWidth > 0 ? cols / timelineWidth : 0;
  }, [cols, timelineWidth]);

  // Zoom helpers: determine guide line background based on zoom
  const gridBackground = useMemo(() => {
    if (cols <= 0) return undefined;
    if (effectiveTimeline.zoom === 'quarter') {
      // broader columns: emphasize quarter bands (already in header). Keep subtle monthly lines.
      return `repeating-linear-gradient(to right, rgba(15,23,42,0.05) 0, rgba(15,23,42,0.05) 1px, transparent 1px, transparent calc(100% / ${cols}))`;
    }
    if (effectiveTimeline.zoom === 'week') {
      // add weekly subdivisions (approx 4.3 weeks per month). Render minor lines at 1/4 of each month width
      const minor = `repeating-linear-gradient(to right, rgba(15,23,42,0.04) 0, rgba(15,23,42,0.04) 1px, transparent 1px, transparent calc(100% / (${cols} * 4)))`;
      const major = `repeating-linear-gradient(to right, rgba(15,23,42,0.08) 0, rgba(15,23,42,0.08) 1px, transparent 1px, transparent calc(100% / ${cols}))`;
      return `${minor}, ${major}`;
    }
    // month
    return `repeating-linear-gradient(to right, rgba(15,23,42,0.06) 0, rgba(15,23,42,0.06) 1px, transparent 1px, transparent calc(100% / ${cols}))`;
  }, [cols, effectiveTimeline.zoom]);

  // Expandable timeline logic
  const maxVisibleLanes = 5;
  const shouldCollapse = lanes.length > maxVisibleLanes;
  const visibleLanes = shouldCollapse && !isExpanded ? lanes.slice(0, maxVisibleLanes) : lanes;
  const hiddenCount = lanes.length - maxVisibleLanes;

  // Fixed layout constants and row-packing per lane
  const HEADER_TOP = 12; // px
  const HEADER_LINE = 20; // px
  const HEADER_GAP = 4; // px
  const HEADER_BASELINE = HEADER_TOP + HEADER_LINE + HEADER_GAP; // 36px
  const ROW_HEIGHT = 40; // px
  const ROW_GAP = 6; // px
  const BOTTOM_PADDING = 8; // px

  const laneLayouts = useMemo(() => {
    const layouts: Record<string, { rowsCount: number; placements: Record<string, number> }> = {};
    for (const lane of lanes) {
      const laneItems = (itemsByLane[lane.id] || []).slice().sort((a: RoadmapItem, b: RoadmapItem) =>
        toAbsWithDays(a.startYear, a.startMonth, a.startDay || 1) - toAbsWithDays(b.startYear, b.startMonth, b.startDay || 1)
      );
      const rows: number[] = [];
      const placements: Record<string, number> = {};
      for (const it of laneItems) {
        const start = toAbsWithDays(it.startYear, it.startMonth, it.startDay || 1);
        const end = toAbsWithDays(it.endYear, it.endMonth, it.endDay || daysInMonth(it.endYear, it.endMonth));
        let rowIndex = rows.findIndex((lastEnd) => start >= lastEnd);
        if (rowIndex === -1) { rowIndex = rows.length; rows.push(end); }
        else { rows[rowIndex] = end; }
        placements[it.id] = rowIndex;
      }
      layouts[lane.id] = { rowsCount: Math.max(1, rows.length), placements };
    }
    return layouts;
  }, [itemsByLane, lanes]);

  const getLaneHeight = (laneId: string) => {
    const rowsCount = laneLayouts[laneId]?.rowsCount ?? 1;
    return HEADER_BASELINE + rowsCount * ROW_HEIGHT + (rowsCount - 1) * ROW_GAP + BOTTOM_PADDING;
  };

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

  // Merge multiple roadmap JSON payloads into a single longer-term roadmap
  function mergeRoadmaps(payloads: { items: RoadmapItem[]; lanes: LaneMeta[]; stages: StageMeta[]; tl: Timeline }[]) {
    // Merge lanes by id (first occurrence wins)
    const laneMap = new Map<string, LaneMeta>();
    for (const p of payloads) for (const l of p.lanes) if (!laneMap.has(l.id)) laneMap.set(l.id, l);
    const mergedLanes = Array.from(laneMap.values());

    // Merge stages by id (first occurrence wins)
    const stageMap = new Map<string, StageMeta>();
    for (const p of payloads) for (const s of p.stages) if (!stageMap.has(s.id)) stageMap.set(s.id, s);
    const mergedStages = Array.from(stageMap.values());

    // Merge items; if duplicate id occurs with different content, assign a new id
    const itemMap = new Map<string, RoadmapItem>();
    for (const p of payloads) {
      for (const it of p.items) {
        const existing = itemMap.get(it.id);
        if (!existing) { itemMap.set(it.id, it); continue; }
        const changed = JSON.stringify(existing) !== JSON.stringify(it);
        if (changed) { itemMap.set(uuid(), { ...it, id: uuid() }); } // keep both with new id
      }
    }
    const mergedItems = Array.from(itemMap.values());

    // Compute a combined timeline that auto-fits all items
    const range = calculateOptimalTimelineRange(mergedItems);
    const mergedTl: Timeline = { leftTitle: tl.leftTitle || 'Tasks', autoFit: true, ...range };

    setState({ items: mergedItems, lanes: mergedLanes, stages: mergedStages, tl: mergedTl });
  }

  function importMergeJSONs(evt: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(evt.target.files || []);
    if (!files.length) return;
    Promise.all(files.map(f => f.text().then(txt => ({ name: f.name, json: JSON.parse(txt) }))))
      .then(list => {
        const payloads = list.map(({ json }) => json).filter((obj: any) => obj && Array.isArray(obj.items) && Array.isArray(obj.lanes) && Array.isArray(obj.stages) && obj.tl);
        if (!payloads.length) { alert('No valid roadmap JSON files selected.'); return; }
        mergeRoadmaps(payloads);
      })
      .catch(() => alert('Failed to parse one or more files.'));
  }

  // expose zoom to DOM for quick checks
  useEffect(() => {
    document.body.setAttribute('data-zoom', effectiveTimeline.zoom || 'month');
    return () => { document.body.removeAttribute('data-zoom'); };
  }, [effectiveTimeline.zoom]);

  return (
    <div className="min-h-screen w-full bg-background text-foreground p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Roadmaps
              </button>
              <h1 className="text-3xl font-semibold tracking-tight">{roadmapName}</h1>
              <p className="text-muted-foreground">Editable time range, stages, lanes, and header title.</p>
            </div>
            <TimelineControls tl={tl} onChange={setTimeline} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
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
            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <Upload className="h-4 w-4" /> Import JSON
              <input type="file" accept="application/json" className="hidden" onChange={importJSON} />
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <Upload className="h-4 w-4" /> Merge JSONs
              <input type="file" accept="application/json" multiple className="hidden" onChange={importMergeJSONs} />
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
        <div className="rounded-2xl border bg-card text-card-foreground p-0 shadow-sm overflow-hidden relative">
          {tl.autoFit !== false && items.length > 0 && (
            <div className="absolute top-2 right-2 z-10">
              <div className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full border border-primary/20 flex items-center gap-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                Auto-fit Active
              </div>
            </div>
          )}
          <QuarterHeader tl={effectiveTimeline} cols={cols} leftTitle={tl.leftTitle} />
          <div className="grid grid-cols-[240px_1fr]">
            {/* Left: lanes */}
            <div>
              {visibleLanes.map((lane, i) => {
                const laneHeight = getLaneHeight(lane.id);
                return (
                  <div
                    key={lane.id}
                    className={`relative text-sm font-medium ${i !== 0 ? "border-t" : ""}`}
                    style={{
                      height: `${laneHeight}px`,
                      paddingTop: `${HEADER_TOP}px`,
                      paddingBottom: `${HEADER_GAP}px`,
                      paddingLeft: '16px',
                      paddingRight: '16px',
                    }}
                  >
                    <div className="flex items-center" style={{ height: `${HEADER_LINE}px` }}>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-1.5 rounded-full flex-shrink-0" style={{ background: lane.color }} />
                        <span className="truncate font-semibold">{lane.label}</span>
                        {(itemsByLane[lane.id] || []).length > 1 && (
                          <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">({(itemsByLane[lane.id] || []).length} items)</span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
              {shouldCollapse && (
                <div className="border-t px-4 py-3 bg-muted">
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
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
            <div className="border-l" ref={rightGridRef}>
              {visibleLanes.map((lane, laneIdx) => {
                const laneHeight = getLaneHeight(lane.id);
                return (
                  <div
                    key={lane.id}
                    className={`timeline-grid relative grid overflow-hidden ${laneIdx !== 0 ? "border-t" : ""}`}
                    style={{ gridTemplateColumns: gridTemplate, height: `${laneHeight}px`, paddingTop: `${HEADER_BASELINE}px`, backgroundImage: gridBackground }}
                  >
                    {/* Items positioned with stacking for multiple items */}
                    {(itemsByLane[lane.id] || []).map((it, itemIdx) => {
                      const rowIndex = laneLayouts[lane.id]?.placements[it.id] ?? 0;
                      const cumulativeTop = rowIndex * (ROW_HEIGHT + ROW_GAP);
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
                          stackIndex={rowIndex}
                          verticalOffset={cumulativeTop}
                          rowHeight={ROW_HEIGHT}
                          monthsPerPixel={monthsPerPixel}
                        />
                      );
                    })}
                  </div>
                );
              })}
              {shouldCollapse && (
                <div className={`border-t bg-muted ${isExpanded ? 'hidden' : 'flex'} items-center justify-center`} style={{ height: "3rem" }}>
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsExpanded(true)}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
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
function QuarterHeader({ tl, cols, leftTitle }: { tl: Timeline; cols: number; leftTitle: string }) {
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
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="grid grid-cols-[240px_1fr] border-b">
        <div className="px-4 py-2 text-[11px] font-semibold tracking-wide text-muted-foreground">&nbsp;</div>
        <div className="grid text-xs font-semibold" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {bands.map((b, idx) => (
            <div key={idx} className="relative text-center col-span-full" style={{ gridColumn: `span ${b.span} / span ${b.span}` }}>
              <div className="py-2" style={{ color: ["#0d9488", "#06b6d4", "#0891b2", "#14b8a6"][idx % 4] }}>{b.label}</div>
              <div className={`absolute inset-0 -z-10 ${idx % 2 === 0 ? "bg-muted" : "bg-background"}`}></div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-[240px_1fr] border-b">
        <div className="px-4 py-2 text-[11px] font-medium text-muted-foreground">Month</div>
        <div className="grid text-[11px] text-muted-foreground" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="text-center py-1 select-none">
              {monthName(tl.startMonth + i)}
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-[240px_1fr] border-b border-t">
        <div className="px-4 py-3">
          <div className="text-xs font-semibold tracking-wide text-muted-foreground truncate">{leftTitle}</div>
        </div>
        <div></div>
      </div>
    </div>
  );
}

/* ---------- Bar (pill) ---------- */
function BarPill({ item, laneColor, colorClass, onEdit, onDelete, onResize, absStart, cols, stackIndex = 0, verticalOffset = 8, rowHeight, monthsPerPixel }:{ item: RoadmapItem; laneColor: string; colorClass: string; onEdit: () => void; onDelete: () => void; onResize: (newStartDate: number, newEndDate: number) => void; absStart: number; cols: number; stackIndex?: number; verticalOffset?: number; rowHeight?: number; monthsPerPixel?: number; }) {
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [originalStartDate, setOriginalStartDate] = useState(item.startYear * 12 + item.startMonth);
  const [originalEndDate, setOriginalEndDate] = useState(item.endYear * 12 + item.endMonth);
  const [ghostCol, setGhostCol] = useState<number | null>(null);
  const [showNotes, setShowNotes] = useState(false);
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

  // Calculate absolute proportional positioning across the entire lane width
  const totalSpan = endOffset - startOffset; // in months (can be fractional)
  const leftPct = (Math.max(0, startOffset) / cols) * 100;
  const widthPct = (Math.max(0, totalSpan) / cols) * 100;

  // Calculate dynamic height and width based on both text length and task duration
  const titleLength = item.title.length;

  // Width: exact fractional month span relative to entire timeline
  const gridBasedWidth = widthPct;

  // Purely proportional width based on exact fractional month span
  const adjustedWidth = Math.max(0, Math.min(gridBasedWidth, 100));
  const charsPerLine = Math.max(20, Math.min(30, 60 - titleLength * 0.1)); // More conservative chars per line
  const estimatedLines = Math.ceil(titleLength / charsPerLine);
  const maxLines = 3; // Limit to 3 lines to prevent overlap
  const actualLines = Math.min(estimatedLines, maxLines);

  // Base height calculation from text content
  const textBasedHeight = 32 + (actualLines - 1) * 16;

  // Duration-based height adjustment (longer tasks get slightly taller for better visibility)
  const durationBonus = Math.min(totalDays * 0.5, 16); // Max 16px bonus for very long tasks

  const barHeight = rowHeight !== undefined ? rowHeight : Math.min(textBasedHeight + durationBonus, 64); // Fixed when provided

  const style: React.CSSProperties = {
    // Absolute proportional positioning relative to total timeline width
    left: `${leftPct}%`,
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
  const widthAdjustment = 0; // keep font based on content only; width no longer forces min size
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
    let mpp = monthsPerPixel;
    if (!mpp) {
      const timelineElement = document.querySelector('.timeline-grid');
      if (!timelineElement) return;
      const timelineWidth = (timelineElement as HTMLElement).getBoundingClientRect().width;
      mpp = cols / timelineWidth;
    }
    const altKey = (e as any).altKey || (e as any).metaKey;
    const rawDeltaMonths = deltaX * (mpp || 0);
  let deltaMonths = altKey ? Math.round(rawDeltaMonths * 10) / 10 : Math.round(rawDeltaMonths);
  // zoom-aware: in week zoom, allow quarter-month increments (~week)
  if (!altKey && (cols > 0)) {
    // infer step based on grid density: if zoom is week (months subdivided by 4), allow 0.25 steps
    const step = (document.body.getAttribute('data-zoom') === 'week') ? 0.25 : 1;
    deltaMonths = Math.round((rawDeltaMonths) / step) * step;
  }
    
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

    // show ghost column guideline (snaps to integer month when not alt-dragging)
    const tentative = isDragging === 'start' ? originalStartDate + deltaMonths : originalEndDate + deltaMonths;
    const snapped = altKey ? tentative : Math.round(tentative);
    setGhostCol(snapped);
  };

  const handleMouseUp = () => {
    setIsDragging(null);
    setGhostCol(null);
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
      style={{...style, height: `${barHeight}px`}}
      className="relative group/task"
    >
      {ghostCol !== null && (
        <div
          className="pointer-events-none absolute inset-y-0 w-px bg-primary/50"
          style={{ left: `calc(${((ghostCol - absStart) / cols) * 100}% )` }}
        />
      )}
      {/* Enhanced tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-40 opacity-0 group-hover/task:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div className="tooltip-container bg-foreground text-background text-sm px-3 py-2 rounded-lg shadow-xl border border-border whitespace-normal">
          <div className="font-semibold text-background mb-1 leading-tight">{item.title}</div>
          {item.description && (
            <div className="text-background/80 dark:text-foreground/80 text-xs mb-2 leading-relaxed">{item.description}</div>
          )}
          <div className="text-xs space-y-1">
            <div className="flex justify-between items-center">
              <span className="opacity-80">Duration:</span>
              <span className="font-medium ml-2">{startDateStr} - {endDateStr}</span>
            </div>
            {item.owner && (
              <div className="flex justify-between items-center">
                <span className="opacity-80">Owner:</span>
                <span className="ml-2">{item.owner}</span>
              </div>
            )}
            {item.progress !== undefined && (
              <div className="flex justify-between items-center">
                <span className="opacity-80">Progress:</span>
                <span className="ml-2">{item.progress}%</span>
              </div>
            )}
            {item.notes && (
              <div className="mt-2 pt-2 border-t border-background/20">
                <div className="opacity-80 mb-1">Notes:</div>
                <div className="text-xs leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">{item.notes}</div>
              </div>
            )}
          </div>
        </div>
        <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-foreground mx-auto"></div>
      </div>
      {/* Left resize handle */}
      <div
        className="absolute left-0 top-0 w-1 h-full cursor-ew-resize z-20 hover:bg-white/30 flex items-center justify-center group"
        onMouseDown={handleMouseDown('start')}
      >
        <div className="w-0.5 h-3/4 bg-white/60 group-hover:bg-white/80 transition-colors" />
      </div>
      
      {/* Right resize handle */}
      <div
        className="absolute right-0 top-0 w-1 h-full cursor-ew-resize z-20 hover:bg-white/30 flex items-center justify-center group"
        onMouseDown={handleMouseDown('end')}
      >
        <div className="w-0.5 h-3/4 bg-white/60 group-hover:bg-white/80 transition-colors" />
      </div>

      <div className={`group h-full rounded-md ${colorClass} shadow-sm flex items-center pl-0 pr-1 relative overflow-hidden border border-slate-300 ${isDragging ? 'opacity-80' : ''}`}>
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
            <div className={`bg-foreground text-background text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap border border-border ${startPositionInMonth < 0 || startPositionInMonth > cols ? 'opacity-60' : ''}`}>
              <div className="font-medium">{startDateStr}</div>
              <div className="opacity-80 text-[10px]">
                Start • {getMonthName(item.startMonth)}
                {(startPositionInMonth < 0 || startPositionInMonth > cols) && (
                  <span className="text-amber-300 ml-1">⤴</span>
                )}
              </div>
            </div>
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-foreground mx-auto"></div>
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
            <div className={`bg-foreground text-background text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap border border-border ${endPositionInMonth < 0 || endPositionInMonth > cols ? 'opacity-60' : ''}`}>
              <div className="font-medium">{endDateStr}</div>
              <div className="opacity-80 text-[10px]">
                End • {getMonthName(item.endMonth)}
                {(endPositionInMonth < 0 || endPositionInMonth > cols) && (
                  <span className="text-amber-300 ml-1">⤴</span>
                )}
              </div>
            </div>
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-foreground mx-auto"></div>
          </div>
        )}
        <span className="h-full w-2 rounded-l-md shrink-0" style={{ background: laneColor }} />
        <div className="ml-2 flex-1 flex items-center justify-between min-w-0 h-full">
          <span
            className="roadmap-text leading-tight py-1 break-words hyphens-auto flex-1 pr-2 overflow-hidden"
            style={{
              wordBreak: 'break-word',
              lineHeight: '1.35',
              fontSize: adjustedWidth < 35 ? '12px' : '13px',
              fontWeight: 500,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: '#374151'
            }}
          >
            {item.title}
          </span>
          <div className="flex items-center gap-1 shrink-0 self-start mt-1">
            {typeof progress === "number" && <span className="text-[10px] font-bold opacity-95 bg-black/30 px-1.5 py-0.5 rounded text-white" style={{ textShadow: '0 1px 1px rgba(0,0,0,0.5)' }}>{progress}%</span>}
            {item.notes && (
              <Button 
                size="icon" 
                variant="ghost" 
                className={`h-5 w-5 p-0 ${showNotes ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500/80 hover:bg-blue-600'}`}
                onClick={(e) => { e.stopPropagation(); setShowNotes(v => !v); }}
              >
                <FileText className="h-3 w-3 text-white" />
              </Button>
            )}
            <div className="hidden gap-1 group-hover:flex">
              <div className="h-6 w-6 flex items-center justify-center cursor-pointer" onClick={onEdit}>
                <Edit2 className="h-4 w-4" fill="#334155" stroke="#334155" strokeWidth={0} />
              </div>
              <div className="h-6 w-6 flex items-center justify-center cursor-pointer" onClick={onDelete}>
                <Trash2 className="h-4 w-4" fill="#dc2626" stroke="#dc2626" strokeWidth={0} />
              </div>
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
            <Flag className="h-3.5 w-3.5 text-foreground drop-shadow-sm" />
            <div className="roadmap-text text-[10px] font-medium text-foreground whitespace-nowrap bg-background/80 px-1 rounded-sm shadow-sm" style={{ textShadow: '0 1px 1px rgba(255,255,255,0.8)' }}>{ms.label}</div>
          </div>
        );
      })}
      {/* Expandable notes section */}
      {showNotes && item.notes && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-md p-2 shadow-lg z-50 text-xs text-slate-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
          <div className="font-semibold mb-1">Notes:</div>
          {item.notes}
        </div>
      )}
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
    <div className="flex flex-wrap items-start gap-4">
      <div className="space-y-1">
        <Label className="text-sm">Title</Label>
        <Input className="w-[180px] h-8" value={leftTitle} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setLeftTitle(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-sm">Date Range</Label>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={startValue}
            onChange={onStartChange}
            className="h-8"
            disabled={autoFit}
          />
          <span className="text-muted-foreground">→</span>
          <Input
            type="month"
            value={endValue}
            onChange={onEndChange}
            className="h-8"
            disabled={autoFit}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-sm">&nbsp;</Label>
        <div className="flex items-center gap-2 h-8">
          <input
            type="checkbox"
            id="autoFit"
            checked={autoFit}
            onChange={(e) => setAutoFit(e.target.checked)}
            className="rounded"
          />
          <Label htmlFor="autoFit" className="text-sm cursor-pointer">
            Auto-fit to tasks {autoFit && <span className="text-xs text-primary font-medium">(Active)</span>}
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
  const [notes, setNotes] = useState(initial?.notes || "");
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
          notes: notes.trim() || undefined,
        };
        onSubmit(payload);
      }}
      className="space-y-4"
    >
      <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setTitle(e.target.value)} placeholder="e.g., Market Analysis" required /></div>
      <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>)=>setDescription(e.target.value)} placeholder="Short context for stakeholders" rows={2} /></div>
      <div className="space-y-2"><Label>Detailed Notes (Optional)</Label><Textarea value={notes} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>)=>setNotes(e.target.value)} placeholder="Add detailed implementation notes, requirements, or context..." rows={3} /></div>
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
  <div className="text-xs text-muted-foreground inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {startDate} – {endDate}</div>
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
      <p className="text-xs text-muted-foreground">Deleting a lane reassigns its items to the first remaining lane.</p>
    </div>
  );
}

function StageManager({ stages, onAdd, onRename, onRecolor, onDelete, onReorder }:{ stages: StageMeta[]; onAdd:(label:string,colorClass:string)=>void; onRename:(id:StageId,label:string)=>void; onRecolor:(id:StageId,colorClass:string)=>void; onDelete:(id:StageId)=>void; onReorder:(next:StageMeta[])=>void; }) {
  const [label, setLabel] = useState(""); const [colorClass, setColorClass] = useState("bg-teal-200");
  const move = (i:number,dir:-1|1)=>{ const j=i+dir; if(j<0||j>=stages.length) return; const copy=stages.slice(); [copy[i],copy[j]]=[copy[j],copy[i]]; onReorder(copy); };
  const colors = ["bg-slate-200","bg-cyan-200","bg-teal-200","bg-emerald-200","bg-sky-200","bg-blue-200","bg-indigo-200","bg-rose-200","bg-amber-200","bg-slate-300","bg-cyan-300","bg-teal-300","bg-emerald-300"];
  return (
    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
      {stages.map((s,i)=>(
        <div key={s.id} className="flex flex-col gap-2">
          <Input className="w-full" value={s.label} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>onRename(s.id, e.target.value)} />
          <div className="flex items-center gap-2">
            <div className="flex gap-1 flex-wrap">
              {colors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onRecolor(s.id, c)}
                  className={`h-7 w-7 rounded ${c} ${s.colorClass === c ? 'ring-2 ring-offset-1 ring-slate-900' : ''}`}
                  title={c.replace("bg-","")}
                />
              ))}
            </div>
            <div className="flex gap-1 ml-auto">
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={()=>move(i,-1)}>↑</Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={()=>move(i,1)}>↓</Button>
              <Button type="button" variant="destructive" size="icon" className="h-7 w-7" onClick={()=>onDelete(s.id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          </div>
        </div>
      ))}
      <div className="flex flex-col gap-2 pt-2 border-t">
        <Input className="w-full" placeholder="New stage label" value={label} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setLabel(e.target.value)} />
        <div className="flex items-center gap-2">
          <div className="flex gap-1 flex-wrap">
            {colors.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColorClass(c)}
                className={`h-7 w-7 rounded ${c} ${colorClass === c ? 'ring-2 ring-offset-1 ring-slate-900' : ''}`}
                title={c.replace("bg-","")}
              />
            ))}
          </div>
          <Button type="button" className="ml-auto" onClick={()=>{ if(label.trim()){ onAdd(label.trim(), colorClass); setLabel(""); }}}>Add</Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Deleting a stage reassigns affected items to the first remaining stage.</p>
    </div>
  );
}

/* ============================================================
   Roadmap Home - Landing page with all roadmaps
============================================================ */
export function RoadmapHome({ onSelectRoadmap }: { onSelectRoadmap: (id: string, name: string) => void }) {
  const [roadmaps, setRoadmaps] = useState<RoadmapMeta[]>(() => loadRoadmapsList());
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const roadmap = createNewRoadmap(newName.trim(), newDescription.trim() || undefined);
    setRoadmaps(loadRoadmapsList());
    setCreateOpen(false);
    setNewName("");
    setNewDescription("");
    // Automatically open the new roadmap
    onSelectRoadmap(roadmap.id, roadmap.name);
  };

  const handleDelete = (id: string) => {
    deleteRoadmap(id);
    setRoadmaps(loadRoadmapsList());
    setDeleteConfirm(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Color palette for roadmap cards
  const cardColors = [
    'from-teal-500/20 to-cyan-500/10 border-teal-500/30',
    'from-blue-500/20 to-indigo-500/10 border-blue-500/30',
    'from-emerald-500/20 to-green-500/10 border-emerald-500/30',
    'from-purple-500/20 to-pink-500/10 border-purple-500/30',
    'from-amber-500/20 to-orange-500/10 border-amber-500/30',
    'from-rose-500/20 to-red-500/10 border-rose-500/30',
  ];

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-700 dark:from-teal-900 dark:via-cyan-900 dark:to-blue-950">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptMCAwdi02aC02djZoNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40"></div>
        <div className="relative mx-auto max-w-7xl px-6 py-16 sm:py-24">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
              <LayoutDashboard className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
              Roadmap Planner
            </h1>
          </div>
          <p className="text-lg text-white/80 max-w-2xl">
            Create, manage, and visualize your project roadmaps. Plan your features, track progress, and stay organized.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Action Bar */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold">Your Roadmaps</h2>
            <p className="text-muted-foreground">
              {roadmaps.length === 0 
                ? "Get started by creating your first roadmap" 
                : `${roadmaps.length} roadmap${roadmaps.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2 shadow-lg shadow-primary/25">
                <Plus className="h-5 w-5" />
                New Roadmap
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl">Create New Roadmap</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Roadmap Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Q1 2025 Product Roadmap"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of this roadmap..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={!newName.trim()}>
                  Create Roadmap
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Roadmaps Grid */}
        {roadmaps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
              <LayoutDashboard className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No roadmaps yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Create your first roadmap to start planning and tracking your projects, features, and milestones.
            </p>
            <Button size="lg" onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-5 w-5" />
              Create Your First Roadmap
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roadmaps.map((roadmap, idx) => (
              <motion.div
                key={roadmap.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className={`group relative overflow-hidden border-2 hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br ${cardColors[idx % cardColors.length]}`}>
                  <CardContent className="p-6" onClick={() => onSelectRoadmap(roadmap.id, roadmap.name)}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold truncate group-hover:text-primary transition-colors">
                          {roadmap.name}
                        </h3>
                        {roadmap.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {roadmap.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 ml-2" />
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-4 pt-4 border-t border-border/50">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Created {formatDate(roadmap.createdAt)}</span>
                      </div>
                    </div>
                  </CardContent>
                  
                  {/* Delete button */}
                  <button
                    className="absolute top-3 right-3 p-2 rounded-lg bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(roadmap.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-destructive">Delete Roadmap</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground py-4">
            Are you sure you want to delete this roadmap? This action cannot be undone and all associated data will be permanently removed.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Delete Roadmap
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
