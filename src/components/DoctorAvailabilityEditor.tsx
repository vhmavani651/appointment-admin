import { useEffect, useState } from "react";
import { AlertTriangle, CalendarOff, Clock, Plus, Trash2 } from "lucide-react";
import {
  api,
  apiErrorMessage,
  DAY_NAMES,
  type AffectedAppointment,
  type AvailabilityPeriod,
  type DoctorBreak,
} from "../api";
import Button from "./ui/Button";
import Select from "./ui/Select";
import Skeleton from "./ui/Skeleton";

interface Props {
  doctorId: number;
}

export default function DoctorAvailabilityEditor({ doctorId }: Props) {
  const [periods, setPeriods] = useState<AvailabilityPeriod[]>([]);
  const [breaks, setBreaks] = useState<DoctorBreak[]>([]);
  const [loading, setLoading] = useState(true);

  const [newDay, setNewDay] = useState(1);
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("17:00");
  const [periodError, setPeriodError] = useState("");
  const [addingPeriod, setAddingPeriod] = useState(false);
  const [deletingPeriodId, setDeletingPeriodId] = useState<number | null>(null);

  const [breakDate, setBreakDate] = useState("");
  const [breakStart, setBreakStart] = useState("10:00");
  const [breakEnd, setBreakEnd] = useState("11:00");
  const [breakError, setBreakError] = useState("");
  const [addingBreak, setAddingBreak] = useState(false);
  const [deletingBreakId, setDeletingBreakId] = useState<number | null>(null);
  const [rescheduleSummary, setRescheduleSummary] = useState<AffectedAppointment[] | null>(null);

  function loadAll() {
    setLoading(true);
    Promise.all([
      api.get<AvailabilityPeriod[]>(`/doctors/${doctorId}/availability`),
      api.get<DoctorBreak[]>(`/doctors/${doctorId}/breaks`),
    ])
      .then(([availRes, breaksRes]) => {
        setPeriods(availRes.data);
        setBreaks(breaksRes.data);
      })
      .finally(() => setLoading(false));
  }

  useEffect(loadAll, [doctorId]);

  async function addPeriod() {
    setPeriodError("");
    if (newStart >= newEnd) {
      setPeriodError("Start time must be before end time");
      return;
    }
    setAddingPeriod(true);
    try {
      await api.post(`/doctors/${doctorId}/availability`, {
        day_of_week: newDay,
        start_time: `${newStart}:00`,
        end_time: `${newEnd}:00`,
      });
      loadAll();
    } catch (err) {
      setPeriodError(apiErrorMessage(err, "Failed to add period"));
    } finally {
      setAddingPeriod(false);
    }
  }

  async function deletePeriod(periodId: number) {
    setDeletingPeriodId(periodId);
    try {
      await api.delete(`/doctors/${doctorId}/availability/${periodId}`);
      loadAll();
    } finally {
      setDeletingPeriodId(null);
    }
  }

  async function addBreak() {
    setBreakError("");
    setRescheduleSummary(null);
    if (!breakDate) {
      setBreakError("Pick a date for the break");
      return;
    }
    if (breakStart >= breakEnd) {
      setBreakError("Start time must be before end time");
      return;
    }
    setAddingBreak(true);
    try {
      const res = await api.post<{ affectedAppointments: AffectedAppointment[] }>(
        `/doctors/${doctorId}/breaks`,
        { break_date: breakDate, start_time: `${breakStart}:00`, end_time: `${breakEnd}:00` }
      );
      setRescheduleSummary(res.data.affectedAppointments);
      loadAll();
    } catch (err) {
      setBreakError(apiErrorMessage(err, "Failed to add break"));
    } finally {
      setAddingBreak(false);
    }
  }

  async function deleteBreak(breakId: number) {
    setDeletingBreakId(breakId);
    try {
      await api.delete(`/doctors/${doctorId}/breaks/${breakId}`);
      loadAll();
    } finally {
      setDeletingBreakId(null);
    }
  }

  const periodsByDay = new Map<number, AvailabilityPeriod[]>();
  for (const p of periods) {
    (periodsByDay.get(p.day_of_week) ?? periodsByDay.set(p.day_of_week, []).get(p.day_of_week)!).push(p);
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="grid gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
      {/* Periods */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-text">
          <Clock size={15} className="text-primary" />
          Availability periods
        </div>

        {periods.length === 0 ? (
          <p className="mb-3 text-sm text-text-muted">No periods set yet.</p>
        ) : (
          <div className="mb-3 space-y-2">
            {DAY_NAMES.map((dayName, day) => {
              const dayPeriods = periodsByDay.get(day);
              if (!dayPeriods?.length) return null;
              return (
                <div key={day} className="rounded-lg border border-border bg-white px-3 py-2">
                  <div className="mb-1 text-xs font-semibold text-text-muted">{dayName}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {dayPeriods.map((p) => (
                      <span
                        key={p.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-2.5 py-1 text-xs font-medium text-primary"
                      >
                        {p.start_time.slice(0, 5)} – {p.end_time.slice(0, 5)}
                        <button
                          onClick={() => deletePeriod(p.id)}
                          disabled={deletingPeriodId === p.id}
                          className="text-primary/60 hover:text-red-600"
                          aria-label="Remove period"
                        >
                          <Trash2 size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-2">
          <Select value={newDay} onChange={(e) => setNewDay(Number(e.target.value))} className="h-9">
            {DAY_NAMES.map((d, i) => (
              <option key={i} value={i}>
                {d}
              </option>
            ))}
          </Select>
          <input
            type="time"
            value={newStart}
            onChange={(e) => setNewStart(e.target.value)}
            className="h-9 rounded-md border border-border px-2 text-sm"
          />
          <span className="text-sm text-text-muted">to</span>
          <input
            type="time"
            value={newEnd}
            onChange={(e) => setNewEnd(e.target.value)}
            className="h-9 rounded-md border border-border px-2 text-sm"
          />
          <Button className="h-9 px-3 py-0 text-xs" onClick={addPeriod} loading={addingPeriod}>
            <Plus size={13} />
            Add period
          </Button>
        </div>
        {periodError && <p className="mt-1 text-xs text-red-600">{periodError}</p>}
        <p className="mt-1 text-[11px] text-text-muted">
          Add split hours by adding two periods for the same day (e.g. 9–1 and 2–5).
        </p>
      </div>

      <div className="border-t border-border" />

      {/* Breaks */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-text">
          <CalendarOff size={15} className="text-primary" />
          Breaks
        </div>

        {rescheduleSummary && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            {rescheduleSummary.length === 0 ? (
              <p>No booked appointments were affected by this break.</p>
            ) : (
              <>
                <p className="mb-1 flex items-center gap-1.5 font-semibold">
                  <AlertTriangle size={13} />
                  {rescheduleSummary.length} appointment{rescheduleSummary.length > 1 ? "s" : ""} affected
                </p>
                <ul className="space-y-0.5">
                  {rescheduleSummary.map((a) => (
                    <li key={a.id}>
                      #{a.id}: {a.previousSlot.slice(0, 5)} →{" "}
                      {a.status === "rescheduled"
                        ? `moved to ${a.newSlot?.slice(0, 5)}`
                        : "cancelled (no slot available)"}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {breaks.length === 0 ? (
          <p className="mb-3 text-sm text-text-muted">No breaks scheduled.</p>
        ) : (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {breaks.map((b) => (
              <span
                key={b.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700"
              >
                {b.break_date} · {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
                <button
                  onClick={() => deleteBreak(b.id)}
                  disabled={deletingBreakId === b.id}
                  className="text-red-700/60 hover:text-red-900"
                  aria-label="Remove break"
                >
                  <Trash2 size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-2">
          <input
            type="date"
            value={breakDate}
            onChange={(e) => setBreakDate(e.target.value)}
            className="h-9 rounded-md border border-border px-2 text-sm"
          />
          <input
            type="time"
            value={breakStart}
            onChange={(e) => setBreakStart(e.target.value)}
            className="h-9 rounded-md border border-border px-2 text-sm"
          />
          <span className="text-sm text-text-muted">to</span>
          <input
            type="time"
            value={breakEnd}
            onChange={(e) => setBreakEnd(e.target.value)}
            className="h-9 rounded-md border border-border px-2 text-sm"
          />
          <Button variant="danger" className="h-9 px-3 py-0 text-xs" onClick={addBreak} loading={addingBreak}>
            <Plus size={13} />
            Add break
          </Button>
        </div>
        {breakError && <p className="mt-1 text-xs text-red-600">{breakError}</p>}
        <p className="mt-1 text-[11px] text-text-muted">
          Any booked appointment inside the break is automatically moved to the nearest free slot, or cancelled if none exists that day.
        </p>
      </div>
    </div>
  );
}
