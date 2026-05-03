"use client";

import { useState, useEffect, useMemo, useRef } from "react";

type Guest = {
  id: string;
  firstName: string;
  lastName: string;
  category: string;
  rsvpStatus: string;
  plusOne: boolean;
  dietaryRestrictions?: string;
};

type Assignments = Record<string, string[]>; // tableNumber -> guestIds

type SeatingChart = {
  id: string;
  name: string;
  numTables: number;
  seatsPerTable: number;
  assignments: Assignments;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

const seatsFor = (g: Guest) => 1 + (g.plusOne ? 1 : 0);

const PRESETS = [
  { label: "10 × 10", numTables: 10, seatsPerTable: 10 },
  { label: "12 × 10", numTables: 12, seatsPerTable: 10 },
  { label: "10 × 12", numTables: 10, seatsPerTable: 12 },
  { label: "8 × 8", numTables: 8, seatsPerTable: 8 },
];

export default function SeatingPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [charts, setCharts] = useState<SeatingChart[]>([]);
  const [loading, setLoading] = useState(true);

  const [chartId, setChartId] = useState<string | null>(null);
  const [chartName, setChartName] = useState("Untitled Chart");
  const [numTables, setNumTables] = useState(10);
  const [seatsPerTable, setSeatsPerTable] = useState(10);
  const [assignments, setAssignments] = useState<Assignments>({});

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rsvpFilter, setRsvpFilter] = useState<string>("EXCLUDE_DECLINED");
  const [search, setSearch] = useState("");
  const dragData = useRef<{ guestId: string; from: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/guests").then((r) => r.json()),
      fetch("/api/seating").then((r) => r.json()),
    ])
      .then(([g, c]) => {
        setGuests(g);
        setCharts(c);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load seating data:", err);
        setLoading(false);
      });
  }, []);

  const guestsById = useMemo(() => {
    const m = new Map<string, Guest>();
    guests.forEach((g) => m.set(g.id, g));
    return m;
  }, [guests]);

  const assignedIds = useMemo(() => {
    const s = new Set<string>();
    Object.values(assignments).forEach((ids) => ids.forEach((id) => s.add(id)));
    return s;
  }, [assignments]);

  const visibleGuests = useMemo(() => {
    return guests.filter((g) => {
      if (rsvpFilter === "EXCLUDE_DECLINED" && g.rsvpStatus === "DECLINED") return false;
      if (rsvpFilter === "CONFIRMED_ONLY" && g.rsvpStatus !== "CONFIRMED") return false;
      if (search) {
        const s = search.toLowerCase();
        if (!`${g.firstName} ${g.lastName}`.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [guests, rsvpFilter, search]);

  const unassigned = useMemo(
    () => visibleGuests.filter((g) => !assignedIds.has(g.id)),
    [visibleGuests, assignedIds]
  );

  const totalSeatsNeeded = useMemo(
    () =>
      guests
        .filter((g) => g.rsvpStatus !== "DECLINED")
        .reduce((sum, g) => sum + seatsFor(g), 0),
    [guests]
  );
  const totalCapacity = numTables * seatsPerTable;
  const totalAssigned = useMemo(() => {
    let n = 0;
    Object.values(assignments).forEach((ids) =>
      ids.forEach((id) => {
        const g = guestsById.get(id);
        if (g) n += seatsFor(g);
      })
    );
    return n;
  }, [assignments, guestsById]);

  const seatsAtTable = (tableNum: number) => {
    const ids = assignments[String(tableNum)] || [];
    return ids.reduce((sum, id) => {
      const g = guestsById.get(id);
      return sum + (g ? seatsFor(g) : 0);
    }, 0);
  };

  const markDirty = () => setDirty(true);

  const removeFromAll = (next: Assignments, guestId: string) => {
    Object.keys(next).forEach((k) => {
      next[k] = (next[k] || []).filter((id) => id !== guestId);
    });
  };

  const handleDragStart = (e: React.DragEvent, guestId: string, from: string) => {
    dragData.current = { guestId, from };
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", guestId);
  };

  const handleDropOnTable = (e: React.DragEvent, tableNum: number) => {
    e.preventDefault();
    const data = dragData.current;
    if (!data) return;
    const guest = guestsById.get(data.guestId);
    if (!guest) return;

    const key = String(tableNum);
    const currentSeats = seatsAtTable(tableNum);
    const alreadyHere = (assignments[key] || []).includes(guest.id);
    if (!alreadyHere && currentSeats + seatsFor(guest) > seatsPerTable) {
      alert(`Table ${tableNum} doesn't have enough seats for ${guest.firstName}${guest.plusOne ? " (+1)" : ""}.`);
      dragData.current = null;
      return;
    }

    const next: Assignments = { ...assignments };
    Object.keys(next).forEach((k) => (next[k] = [...(next[k] || [])]));
    removeFromAll(next, guest.id);
    next[key] = [...(next[key] || []), guest.id];
    setAssignments(next);
    markDirty();
    dragData.current = null;
  };

  const handleDropOnUnassigned = (e: React.DragEvent) => {
    e.preventDefault();
    const data = dragData.current;
    if (!data) return;
    const next: Assignments = { ...assignments };
    Object.keys(next).forEach((k) => (next[k] = [...(next[k] || [])]));
    removeFromAll(next, data.guestId);
    setAssignments(next);
    markDirty();
    dragData.current = null;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const newChart = () => {
    if (dirty && !confirm("Discard unsaved changes?")) return;
    setChartId(null);
    setChartName("Untitled Chart");
    setNumTables(10);
    setSeatsPerTable(10);
    setAssignments({});
    setDirty(false);
  };

  const loadChart = (id: string) => {
    if (dirty && !confirm("Discard unsaved changes?")) return;
    const chart = charts.find((c) => c.id === id);
    if (!chart) return;
    setChartId(chart.id);
    setChartName(chart.name);
    setNumTables(chart.numTables);
    setSeatsPerTable(chart.seatsPerTable);
    setAssignments((chart.assignments as Assignments) || {});
    setDirty(false);
  };

  const saveChart = async () => {
    setSaving(true);
    try {
      const payload = { name: chartName, numTables, seatsPerTable, assignments };
      const res = chartId
        ? await fetch(`/api/seating/${chartId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/seating", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) throw new Error("save failed");
      const saved: SeatingChart = await res.json();
      setChartId(saved.id);
      setCharts((prev) => {
        const others = prev.filter((c) => c.id !== saved.id);
        return [saved, ...others];
      });
      setDirty(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save chart");
    } finally {
      setSaving(false);
    }
  };

  const duplicateChart = async () => {
    setSaving(true);
    try {
      const payload = {
        name: `${chartName} (copy)`,
        numTables,
        seatsPerTable,
        assignments,
      };
      const res = await fetch("/api/seating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("duplicate failed");
      const saved: SeatingChart = await res.json();
      setCharts((prev) => [saved, ...prev]);
      setChartId(saved.id);
      setChartName(saved.name);
      setDirty(false);
    } catch (err) {
      console.error(err);
      alert("Failed to duplicate chart");
    } finally {
      setSaving(false);
    }
  };

  const deleteChart = async () => {
    if (!chartId) return;
    if (!confirm(`Delete "${chartName}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/seating/${chartId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      setCharts((prev) => prev.filter((c) => c.id !== chartId));
      newChart();
    } catch (err) {
      console.error(err);
      alert("Failed to delete chart");
    }
  };

  const applyPreset = (numT: number, seatsT: number) => {
    setNumTables(numT);
    setSeatsPerTable(seatsT);
    markDirty();
  };

  const clearTable = (tableNum: number) => {
    const next: Assignments = { ...assignments };
    next[String(tableNum)] = [];
    setAssignments(next);
    markDirty();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading seating chart...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Seating Chart</h1>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="text-xs text-orange-600 font-medium">Unsaved changes</span>
          )}
          <button
            onClick={newChart}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            New
          </button>
          <button
            onClick={duplicateChart}
            disabled={saving}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Duplicate
          </button>
          {chartId && (
            <button
              onClick={deleteChart}
              className="px-3 py-2 text-sm border border-red-300 text-red-700 rounded-md hover:bg-red-50"
            >
              Delete
            </button>
          )}
          <button
            onClick={saveChart}
            disabled={saving}
            className="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Chart Name</label>
            <input
              type="text"
              value={chartName}
              onChange={(e) => {
                setChartName(e.target.value);
                markDirty();
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Load Chart</label>
            <select
              value={chartId || ""}
              onChange={(e) => e.target.value && loadChart(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900"
            >
              <option value="">— Select —</option>
              {charts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1"># Tables</label>
            <input
              type="number"
              min={1}
              max={50}
              value={numTables}
              onChange={(e) => {
                setNumTables(Math.max(1, parseInt(e.target.value) || 1));
                markDirty();
              }}
              className="w-24 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Seats / Table</label>
            <input
              type="number"
              min={1}
              max={30}
              value={seatsPerTable}
              onChange={(e) => {
                setSeatsPerTable(Math.max(1, parseInt(e.target.value) || 1));
                markDirty();
              }}
              className="w-24 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="block text-xs font-medium text-gray-700">Presets</label>
            <div className="flex gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p.numTables, p.seatsPerTable)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-gray-600 pt-2 border-t">
          <span>Capacity: <strong className="text-gray-900">{totalCapacity}</strong></span>
          <span>Assigned: <strong className="text-gray-900">{totalAssigned}</strong></span>
          <span>Need (non-declined): <strong className={totalSeatsNeeded > totalCapacity ? "text-red-600" : "text-gray-900"}>{totalSeatsNeeded}</strong></span>
          <span>Unassigned (visible): <strong className="text-gray-900">{unassigned.reduce((s, g) => s + seatsFor(g), 0)}</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        <div
          className="bg-white rounded-lg shadow-sm border p-3 h-[70vh] flex flex-col"
          onDragOver={handleDragOver}
          onDrop={handleDropOnUnassigned}
        >
          <div className="mb-2">
            <h2 className="font-semibold text-gray-900 text-sm mb-2">Unassigned Guests</h2>
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm mb-2 text-gray-900"
            />
            <select
              value={rsvpFilter}
              onChange={(e) => setRsvpFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-900"
            >
              <option value="EXCLUDE_DECLINED">All except declined</option>
              <option value="CONFIRMED_ONLY">Confirmed only</option>
              <option value="ALL">All guests</option>
            </select>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {unassigned.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">All visible guests are seated.</p>
            ) : (
              unassigned.map((g) => <GuestTile key={g.id} guest={g} from="unassigned" onDragStart={handleDragStart} />)
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 content-start">
          {Array.from({ length: numTables }, (_, i) => i + 1).map((tableNum) => {
            const ids = assignments[String(tableNum)] || [];
            const used = seatsAtTable(tableNum);
            const over = used > seatsPerTable;
            return (
              <div
                key={tableNum}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropOnTable(e, tableNum)}
                className={`bg-white rounded-lg shadow-sm border-2 ${
                  over ? "border-red-400" : used === seatsPerTable ? "border-green-400" : "border-gray-200"
                } p-3 min-h-[180px] flex flex-col`}
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-gray-900 text-sm">Table {tableNum}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${over ? "text-red-600" : "text-gray-600"}`}>
                      {used}/{seatsPerTable}
                    </span>
                    {ids.length > 0 && (
                      <button
                        onClick={() => clearTable(tableNum)}
                        className="text-xs text-gray-400 hover:text-red-600"
                        title="Clear table"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  {ids.length === 0 ? (
                    <p className="text-xs text-gray-300 text-center py-6 border-2 border-dashed border-gray-200 rounded">
                      Drop guests here
                    </p>
                  ) : (
                    ids.map((id) => {
                      const guest = guestsById.get(id);
                      if (!guest) return null;
                      return (
                        <GuestTile
                          key={id}
                          guest={guest}
                          from={String(tableNum)}
                          onDragStart={handleDragStart}
                          compact
                        />
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function GuestTile({
  guest,
  from,
  onDragStart,
  compact,
}: {
  guest: Guest;
  from: string;
  onDragStart: (e: React.DragEvent, guestId: string, from: string) => void;
  compact?: boolean;
}) {
  const rsvpColor =
    guest.rsvpStatus === "CONFIRMED"
      ? "bg-green-50 border-green-200"
      : guest.rsvpStatus === "DECLINED"
      ? "bg-red-50 border-red-200"
      : "bg-yellow-50 border-yellow-200";
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, guest.id, from)}
      className={`${rsvpColor} border rounded px-2 py-1 cursor-move hover:shadow-sm transition-shadow ${
        compact ? "text-xs" : "text-sm"
      }`}
      title={`${guest.firstName} ${guest.lastName} • ${guest.category} • ${guest.rsvpStatus}${
        guest.dietaryRestrictions ? ` • ${guest.dietaryRestrictions}` : ""
      }`}
    >
      <div className="flex justify-between items-center gap-1">
        <span className="font-medium text-gray-900 truncate">
          {guest.firstName} {guest.lastName}
          {guest.plusOne && <span className="text-purple-600"> +1</span>}
        </span>
        {guest.dietaryRestrictions && (
          <span className="text-[10px] text-amber-700" title={guest.dietaryRestrictions}>🍽</span>
        )}
      </div>
    </div>
  );
}
