"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";

type Guest = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  category: string;
  inviteType: string;
  rsvpStatus: string;
  plusOne: boolean;
  dietaryRestrictions?: string | null;
  notes?: string | null;
};

type Assignments = Record<string, string[]>;

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

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const PRESETS = [
  { label: "10 × 10", numTables: 10, seatsPerTable: 10 },
  { label: "12 × 10", numTables: 12, seatsPerTable: 10 },
  { label: "14 × 10", numTables: 14, seatsPerTable: 10 },
  { label: "10 × 12", numTables: 10, seatsPerTable: 12 },
];

type GuestForm = {
  firstName: string;
  lastName: string;
  category: string;
  inviteType: string;
  rsvpStatus: string;
  plusOne: boolean;
  dietaryRestrictions: string;
  notes: string;
};

const emptyForm: GuestForm = {
  firstName: "",
  lastName: "",
  category: "FAMILY",
  inviteType: "CEREMONY_RECEPTION",
  rsvpStatus: "CONFIRMED",
  plusOne: false,
  dietaryRestrictions: "",
  notes: "",
};

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

  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [tableInput, setTableInput] = useState("");
  const tableInputRef = useRef<HTMLInputElement>(null);

  const [modalGuest, setModalGuest] = useState<Guest | "new" | null>(null);
  const [form, setForm] = useState<GuestForm>(emptyForm);
  const [submittingGuest, setSubmittingGuest] = useState(false);

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

  const seatsAtTable = useCallback(
    (tableNum: number) => {
      const ids = assignments[String(tableNum)] || [];
      return ids.reduce((sum, id) => {
        const g = guestsById.get(id);
        return sum + (g ? seatsFor(g) : 0);
      }, 0);
    },
    [assignments, guestsById]
  );

  const markDirty = () => setDirty(true);

  const removeFromAll = (next: Assignments, guestId: string) => {
    Object.keys(next).forEach((k) => {
      next[k] = (next[k] || []).filter((id) => id !== guestId);
    });
  };

  const moveGuest = useCallback(
    (guestId: string, target: number | null) => {
      const guest = guestsById.get(guestId);
      if (!guest) return false;

      if (target !== null) {
        if (target < 1 || target > numTables) {
          alert(`Table ${target} doesn't exist (1–${numTables}).`);
          return false;
        }
        const currentSeats = seatsAtTable(target);
        const alreadyHere = (assignments[String(target)] || []).includes(guestId);
        if (!alreadyHere && currentSeats + seatsFor(guest) > seatsPerTable) {
          alert(
            `Table ${target} doesn't have enough seats for ${guest.firstName}${
              guest.plusOne ? " (+1)" : ""
            }.`
          );
          return false;
        }
      }

      const next: Assignments = { ...assignments };
      Object.keys(next).forEach((k) => (next[k] = [...(next[k] || [])]));
      removeFromAll(next, guestId);
      if (target !== null) {
        const k = String(target);
        next[k] = [...(next[k] || []), guestId];
      }
      setAssignments(next);
      markDirty();
      return true;
    },
    [assignments, guestsById, numTables, seatsPerTable, seatsAtTable]
  );

  // Click-to-assign: select then click table or type number
  const onSelectGuest = (guestId: string) => {
    setSelectedGuestId((prev) => (prev === guestId ? null : guestId));
    setTableInput("");
  };

  useEffect(() => {
    if (selectedGuestId) {
      const t = setTimeout(() => tableInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [selectedGuestId]);

  const commitTableInput = () => {
    if (!selectedGuestId) return;
    const trimmed = tableInput.trim().toLowerCase();
    if (!trimmed) return;
    if (trimmed === "u" || trimmed === "unassign" || trimmed === "0") {
      moveGuest(selectedGuestId, null);
      setSelectedGuestId(null);
      setTableInput("");
      return;
    }
    const n = parseInt(trimmed, 10);
    if (Number.isNaN(n)) {
      alert("Type a table number, or 'u' to unassign.");
      return;
    }
    const ok = moveGuest(selectedGuestId, n);
    if (ok) {
      setSelectedGuestId(null);
      setTableInput("");
    }
  };

  // Keyboard: Esc deselects; digits go to the input via focus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedGuestId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onTableClick = (tableNum: number) => {
    if (!selectedGuestId) return;
    const ok = moveGuest(selectedGuestId, tableNum);
    if (ok) setSelectedGuestId(null);
  };

  const onUnassignClick = () => {
    if (!selectedGuestId) return;
    moveGuest(selectedGuestId, null);
    setSelectedGuestId(null);
  };

  // Drag-drop (kept as alternative)
  const handleDragStart = (e: React.DragEvent, guestId: string, from: string) => {
    dragData.current = { guestId, from };
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", guestId);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const handleDropOnTable = (e: React.DragEvent, tableNum: number) => {
    e.preventDefault();
    const data = dragData.current;
    if (!data) return;
    moveGuest(data.guestId, tableNum);
    dragData.current = null;
  };
  const handleDropOnUnassigned = (e: React.DragEvent) => {
    e.preventDefault();
    const data = dragData.current;
    if (!data) return;
    moveGuest(data.guestId, null);
    dragData.current = null;
  };

  // Chart actions
  const newChart = () => {
    if (dirty && !confirm("Discard unsaved changes?")) return;
    setChartId(null);
    setChartName("Untitled Chart");
    setNumTables(10);
    setSeatsPerTable(10);
    setAssignments({});
    setDirty(false);
    setSelectedGuestId(null);
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
    setSelectedGuestId(null);
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

  const safeFileBase = () =>
    (chartName || "seating-chart").replace(/[^a-z0-9-_]+/gi, "_");

  const downloadFile = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const csvEscape = (val: string) => {
    if (val == null) return "";
    const s = String(val);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const buildExportRows = () => {
    const rows: {
      table: string;
      seat: number;
      firstName: string;
      lastName: string;
      plusOne: string;
      rsvp: string;
      dietary: string;
      category: string;
    }[] = [];
    for (let t = 1; t <= numTables; t++) {
      const ids = assignments[String(t)] || [];
      let seat = 0;
      for (const id of ids) {
        const g = guestsById.get(id);
        if (!g) continue;
        seat += 1;
        rows.push({
          table: `Table ${t}`,
          seat,
          firstName: g.firstName,
          lastName: g.lastName,
          plusOne: g.plusOne ? "Yes" : "",
          rsvp: g.rsvpStatus,
          dietary: g.dietaryRestrictions || "",
          category: g.category,
        });
        if (g.plusOne) {
          seat += 1;
          rows.push({
            table: `Table ${t}`,
            seat,
            firstName: `(+1 of ${g.firstName} ${g.lastName})`,
            lastName: "",
            plusOne: "",
            rsvp: g.rsvpStatus,
            dietary: "",
            category: g.category,
          });
        }
      }
    }
    return rows;
  };

  const exportCsv = () => {
    const rows = buildExportRows();
    const header = [
      "Table",
      "Seat",
      "First Name",
      "Last Name",
      "Plus One",
      "RSVP",
      "Dietary",
      "Category",
    ];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.table,
          r.seat,
          r.firstName,
          r.lastName,
          r.plusOne,
          r.rsvp,
          r.dietary,
          r.category,
        ]
          .map((v) => csvEscape(String(v)))
          .join(",")
      );
    }
    downloadFile(`${safeFileBase()}.csv`, lines.join("\n"), "text/csv");
  };

  const exportTxt = () => {
    const lines: string[] = [];
    lines.push(chartName);
    lines.push("=".repeat(Math.max(chartName.length, 10)));
    lines.push(`${numTables} tables × ${seatsPerTable} seats   |   ${totalAssigned} assigned of ${totalCapacity}`);
    lines.push(`Exported ${new Date().toLocaleString()}`);
    lines.push("");
    for (let t = 1; t <= numTables; t++) {
      const ids = assignments[String(t)] || [];
      const used = seatsAtTable(t);
      lines.push(`Table ${t}  (${used}/${seatsPerTable})`);
      lines.push("-".repeat(20));
      if (ids.length === 0) {
        lines.push("  (empty)");
      } else {
        for (const id of ids) {
          const g = guestsById.get(id);
          if (!g) continue;
          const tags: string[] = [];
          if (g.plusOne) tags.push("+1");
          if (g.dietaryRestrictions) tags.push(`diet: ${g.dietaryRestrictions}`);
          if (g.rsvpStatus !== "CONFIRMED") tags.push(g.rsvpStatus);
          const tagStr = tags.length ? `  [${tags.join(", ")}]` : "";
          lines.push(`  - ${g.firstName} ${g.lastName}${tagStr}`);
        }
      }
      lines.push("");
    }
    // Unseated bucket
    const unseated = guests
      .filter((g) => g.rsvpStatus !== "DECLINED" && !assignedIds.has(g.id))
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
    if (unseated.length > 0) {
      lines.push("UNSEATED (non-declined)");
      lines.push("-".repeat(20));
      for (const g of unseated) {
        const tag = g.plusOne ? " (+1)" : "";
        lines.push(`  - ${g.firstName} ${g.lastName}${tag}`);
      }
    }
    downloadFile(`${safeFileBase()}.txt`, lines.join("\n"), "text/plain");
  };

  const exportPrint = () => {
    const win = window.open("", "_blank");
    if (!win) {
      alert("Pop-up blocked. Allow pop-ups for this site to use Print View.");
      return;
    }
    const tableHtml: string[] = [];
    for (let t = 1; t <= numTables; t++) {
      const ids = assignments[String(t)] || [];
      const used = seatsAtTable(t);
      const items = ids
        .map((id) => {
          const g = guestsById.get(id);
          if (!g) return "";
          const plus = g.plusOne ? ' <span class="plus">+1</span>' : "";
          const diet = g.dietaryRestrictions
            ? ` <span class="diet">🍽 ${escapeHtml(g.dietaryRestrictions)}</span>`
            : "";
          return `<li>${escapeHtml(g.firstName)} ${escapeHtml(g.lastName)}${plus}${diet}</li>`;
        })
        .join("");
      tableHtml.push(`
        <section class="card">
          <header>
            <h2>Table ${t}</h2>
            <span class="count">${used}/${seatsPerTable}</span>
          </header>
          <ol>${items || '<li class="empty">— empty —</li>'}</ol>
        </section>
      `);
    }
    const unseated = guests
      .filter((g) => g.rsvpStatus !== "DECLINED" && !assignedIds.has(g.id))
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
    const unseatedHtml = unseated.length
      ? `<section class="card unseated">
          <header><h2>Unseated</h2><span class="count">${unseated.length}</span></header>
          <ol>${unseated
            .map((g) => `<li>${escapeHtml(g.firstName)} ${escapeHtml(g.lastName)}${g.plusOne ? ' <span class="plus">+1</span>' : ""}</li>`)
            .join("")}</ol>
        </section>`
      : "";
    win.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(chartName)} — Seating</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 24px; color: #111; }
  h1 { margin: 0 0 4px; }
  .meta { color: #666; font-size: 13px; margin-bottom: 20px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .card { border: 1px solid #ddd; border-radius: 8px; padding: 10px 12px; break-inside: avoid; }
  .card header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #eee; padding-bottom: 4px; margin-bottom: 6px; }
  .card h2 { margin: 0; font-size: 15px; }
  .card .count { font-size: 12px; color: #666; }
  .card ol { margin: 0; padding-left: 22px; font-size: 13px; line-height: 1.5; }
  .card .empty { color: #aaa; list-style: none; margin-left: -18px; }
  .plus { color: #7c3aed; font-weight: 600; font-size: 11px; }
  .diet { color: #b45309; font-size: 11px; }
  .unseated { grid-column: 1 / -1; background: #fffbeb; border-color: #fde68a; }
  .actions { margin-bottom: 16px; }
  .actions button { padding: 8px 14px; font-size: 14px; border: 1px solid #7c3aed; background: #7c3aed; color: white; border-radius: 6px; cursor: pointer; }
  @media print {
    .actions { display: none; }
    body { margin: 12mm; }
    .grid { grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .card { font-size: 11px; }
  }
</style></head>
<body>
  <h1>${escapeHtml(chartName)}</h1>
  <div class="meta">${numTables} tables × ${seatsPerTable} seats &nbsp;|&nbsp; ${totalAssigned} assigned of ${totalCapacity} &nbsp;|&nbsp; ${new Date().toLocaleString()}</div>
  <div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
  <div class="grid">${tableHtml.join("")}${unseatedHtml}</div>
</body></html>`);
    win.document.close();
  };

  // Guest CRUD (synced with /api/guests)
  const openAddGuest = () => {
    setForm(emptyForm);
    setModalGuest("new");
  };
  const openEditGuest = (g: Guest) => {
    setForm({
      firstName: g.firstName,
      lastName: g.lastName,
      category: g.category,
      inviteType: g.inviteType,
      rsvpStatus: g.rsvpStatus,
      plusOne: g.plusOne,
      dietaryRestrictions: g.dietaryRestrictions || "",
      notes: g.notes || "",
    });
    setModalGuest(g);
  };
  const closeGuestModal = () => {
    setModalGuest(null);
    setForm(emptyForm);
  };

  const submitGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingGuest(true);
    try {
      const payload = { ...form };
      const isNew = modalGuest === "new";
      const url = isNew ? "/api/guests" : `/api/guests/${(modalGuest as Guest).id}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("save failed");
      const saved: Guest = await res.json();
      setGuests((prev) => {
        if (isNew) return [...prev, saved].sort((a, b) => a.lastName.localeCompare(b.lastName));
        return prev.map((g) => (g.id === saved.id ? saved : g));
      });
      closeGuestModal();
    } catch (err) {
      console.error(err);
      alert("Failed to save guest");
    } finally {
      setSubmittingGuest(false);
    }
  };

  const deleteGuest = async () => {
    if (modalGuest === null || modalGuest === "new") return;
    const g = modalGuest as Guest;
    if (!confirm(`Delete ${g.firstName} ${g.lastName}? This removes them from all seating charts as well.`))
      return;
    setSubmittingGuest(true);
    try {
      const res = await fetch(`/api/guests/${g.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      setGuests((prev) => prev.filter((x) => x.id !== g.id));
      // also remove from current chart's assignments
      const next: Assignments = { ...assignments };
      Object.keys(next).forEach((k) => (next[k] = (next[k] || []).filter((id) => id !== g.id)));
      setAssignments(next);
      markDirty();
      if (selectedGuestId === g.id) setSelectedGuestId(null);
      closeGuestModal();
    } catch (err) {
      console.error(err);
      alert("Failed to delete guest");
    } finally {
      setSubmittingGuest(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading seating chart...</p>
      </div>
    );
  }

  const selectedGuest = selectedGuestId ? guestsById.get(selectedGuestId) : null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Seating Chart</h1>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-xs text-orange-600 font-medium">Unsaved changes</span>}
          <div className="flex items-center gap-1 mr-1 pr-2 border-r border-gray-300">
            <button onClick={exportCsv} title="Download CSV" className="px-2 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">CSV</button>
            <button onClick={exportTxt} title="Download text list" className="px-2 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">TXT</button>
            <button onClick={exportPrint} title="Open print/PDF view" className="px-2 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Print</button>
          </div>
          <button onClick={newChart} className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">New</button>
          <button onClick={duplicateChart} disabled={saving} className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">Duplicate</button>
          {chartId && (
            <button onClick={deleteChart} className="px-3 py-2 text-sm border border-red-300 text-red-700 rounded-md hover:bg-red-50">Delete</button>
          )}
          <button onClick={saveChart} disabled={saving} className="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Chart Name</label>
            <input type="text" value={chartName} onChange={(e) => { setChartName(e.target.value); markDirty(); }} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Load Chart</label>
            <select value={chartId || ""} onChange={(e) => e.target.value && loadChart(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900">
              <option value="">— Select —</option>
              {charts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1"># Tables</label>
            <input type="number" min={1} max={50} value={numTables} onChange={(e) => { setNumTables(Math.max(1, parseInt(e.target.value) || 1)); markDirty(); }} className="w-24 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Seats / Table</label>
            <input type="number" min={1} max={30} value={seatsPerTable} onChange={(e) => { setSeatsPerTable(Math.max(1, parseInt(e.target.value) || 1)); markDirty(); }} className="w-24 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="block text-xs font-medium text-gray-700">Presets</label>
            <div className="flex gap-1">
              {PRESETS.map((p) => (
                <button key={p.label} onClick={() => applyPreset(p.numTables, p.seatsPerTable)} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">{p.label}</button>
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

      {/* Selection bar */}
      {selectedGuest && (
        <div className="sticky top-2 z-30 bg-purple-600 text-white rounded-lg shadow-lg p-3 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <span className="text-xs opacity-80">Move</span>
            <div className="font-semibold">
              {selectedGuest.firstName} {selectedGuest.lastName}
              {selectedGuest.plusOne && <span className="text-purple-200"> +1</span>}
            </div>
          </div>
          <span className="text-xs opacity-80">→</span>
          <div className="flex items-center gap-1">
            <span className="text-xs opacity-80">Table</span>
            <input
              ref={tableInputRef}
              type="text"
              inputMode="numeric"
              value={tableInput}
              onChange={(e) => setTableInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); commitTableInput(); }
              }}
              placeholder="#"
              className="w-16 px-2 py-1 rounded text-gray-900 text-center font-semibold"
            />
            <button onClick={commitTableInput} className="px-3 py-1 text-sm bg-white text-purple-700 rounded font-medium hover:bg-purple-50">Go</button>
          </div>
          <button onClick={onUnassignClick} className="px-3 py-1 text-sm border border-white/40 rounded hover:bg-purple-700">Unassign</button>
          <button onClick={() => setSelectedGuestId(null)} className="px-3 py-1 text-sm border border-white/40 rounded hover:bg-purple-700">Cancel (Esc)</button>
          <span className="text-xs opacity-80 hidden md:block">Tip: click a table to drop them there</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-3 h-[70vh] flex flex-col" onDragOver={handleDragOver} onDrop={handleDropOnUnassigned}>
          <div className="mb-2">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-semibold text-gray-900 text-sm">Unassigned Guests</h2>
              <button onClick={openAddGuest} className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700">+ Add Guest</button>
            </div>
            <input type="text" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm mb-2 text-gray-900" />
            <select value={rsvpFilter} onChange={(e) => setRsvpFilter(e.target.value)} className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-900">
              <option value="EXCLUDE_DECLINED">All except declined</option>
              <option value="CONFIRMED_ONLY">Confirmed only</option>
              <option value="ALL">All guests</option>
            </select>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {unassigned.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">All visible guests are seated.</p>
            ) : (
              unassigned.map((g) => (
                <GuestTile
                  key={g.id}
                  guest={g}
                  from="unassigned"
                  selected={selectedGuestId === g.id}
                  onSelect={onSelectGuest}
                  onEdit={openEditGuest}
                  onDragStart={handleDragStart}
                />
              ))
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 content-start">
          {Array.from({ length: numTables }, (_, i) => i + 1).map((tableNum) => {
            const ids = assignments[String(tableNum)] || [];
            const used = seatsAtTable(tableNum);
            const over = used > seatsPerTable;
            const canDrop = !!selectedGuestId;
            return (
              <div
                key={tableNum}
                onClick={() => onTableClick(tableNum)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropOnTable(e, tableNum)}
                className={`bg-white rounded-lg shadow-sm border-2 p-3 min-h-[180px] flex flex-col transition-all ${
                  over
                    ? "border-red-400"
                    : used === seatsPerTable
                    ? "border-green-400"
                    : "border-gray-200"
                } ${canDrop ? "cursor-pointer hover:border-purple-500 hover:shadow-md" : ""}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-gray-900 text-sm">Table {tableNum}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${over ? "text-red-600" : "text-gray-600"}`}>{used}/{seatsPerTable}</span>
                    {ids.length > 0 && (
                      <button onClick={(e) => { e.stopPropagation(); clearTable(tableNum); }} className="text-xs text-gray-400 hover:text-red-600" title="Clear table">✕</button>
                    )}
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  {ids.length === 0 ? (
                    <p className={`text-xs text-center py-6 border-2 border-dashed rounded ${canDrop ? "border-purple-300 text-purple-500" : "border-gray-200 text-gray-300"}`}>
                      {canDrop ? "Click to seat here" : "Drop guests here"}
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
                          selected={selectedGuestId === id}
                          onSelect={onSelectGuest}
                          onEdit={openEditGuest}
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

      {/* Add/Edit guest modal */}
      {modalGuest !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={closeGuestModal}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-gray-900">
              {modalGuest === "new" ? "Add Guest" : "Edit Guest"}
            </h2>
            <form onSubmit={submitGuest} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
                  <input type="text" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Last Name *</label>
                  <input type="text" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">RSVP</label>
                  <select value={form.rsvpStatus} onChange={(e) => setForm({ ...form, rsvpStatus: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900">
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option value="PENDING">PENDING</option>
                    <option value="DECLINED">DECLINED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900">
                    <option value="FAMILY">FAMILY</option>
                    <option value="FRIEND">FRIEND</option>
                    <option value="WORK">WORK</option>
                    <option value="VENDOR">VENDOR</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center">
                <input type="checkbox" id="plusOneSeat" checked={form.plusOne} onChange={(e) => setForm({ ...form, plusOne: e.target.checked })} className="mr-2" />
                <label htmlFor="plusOneSeat" className="text-sm text-gray-700">Plus One (counts as 2 seats)</label>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Dietary Restrictions</label>
                <input type="text" value={form.dietaryRestrictions} onChange={(e) => setForm({ ...form, dietaryRestrictions: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900" />
              </div>
              <div className="flex gap-2 pt-2">
                {modalGuest !== "new" && (
                  <button type="button" onClick={deleteGuest} disabled={submittingGuest} className="px-3 py-2 text-sm border border-red-300 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50">Delete</button>
                )}
                <div className="flex-1" />
                <button type="button" onClick={closeGuestModal} disabled={submittingGuest} className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={submittingGuest} className="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50">
                  {submittingGuest ? "Saving..." : modalGuest === "new" ? "Add" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function GuestTile({
  guest,
  from,
  selected,
  onSelect,
  onEdit,
  onDragStart,
  compact,
}: {
  guest: Guest;
  from: string;
  selected: boolean;
  onSelect: (id: string) => void;
  onEdit: (g: Guest) => void;
  onDragStart: (e: React.DragEvent, guestId: string, from: string) => void;
  compact?: boolean;
}) {
  const rsvpColor =
    guest.rsvpStatus === "CONFIRMED"
      ? "bg-green-50 border-green-200"
      : guest.rsvpStatus === "DECLINED"
      ? "bg-red-50 border-red-200"
      : "bg-yellow-50 border-yellow-200";
  const ring = selected ? "ring-2 ring-purple-500 ring-offset-1" : "";
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, guest.id, from)}
      onClick={(e) => { e.stopPropagation(); onSelect(guest.id); }}
      className={`${rsvpColor} ${ring} border rounded px-2 py-1 cursor-pointer hover:shadow-sm transition-all ${compact ? "text-xs" : "text-sm"}`}
      title={`${guest.firstName} ${guest.lastName} • ${guest.category} • ${guest.rsvpStatus}${
        guest.dietaryRestrictions ? ` • ${guest.dietaryRestrictions}` : ""
      }`}
    >
      <div className="flex justify-between items-center gap-1">
        <span className="font-medium text-gray-900 truncate">
          {guest.firstName} {guest.lastName}
          {guest.plusOne && <span className="text-purple-600"> +1</span>}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {guest.dietaryRestrictions && (
            <span className="text-[10px] text-amber-700" title={guest.dietaryRestrictions}>🍽</span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(guest); }}
            className="text-[10px] text-gray-400 hover:text-purple-600 px-1"
            title="Edit guest"
          >
            ✎
          </button>
        </div>
      </div>
    </div>
  );
}
