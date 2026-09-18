import { useState } from "react";
import { Plus } from "lucide-react";
import {
  api,
  apiErrorMessage,
  DAY_NAMES_SHORT,
  MAX_SLOT_MINUTES,
  MIN_SLOT_MINUTES,
} from "../api";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import Input from "./ui/Input";

interface AddDoctorModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface FieldErrors {
  name?: string;
  specialization?: string;
  time?: string;
  duration?: string;
}

export default function AddDoctorModal({ open, onClose, onCreated }: AddDoctorModalProps) {
  const [name, setName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [slotDuration, setSlotDuration] = useState(30);
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setName("");
    setSpecialization("");
    setSlotDuration(30);
    setSelectedDays(new Set());
    setStart("09:00");
    setEnd("17:00");
    setFieldErrors({});
    setServerError("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function toggleDay(day: number) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = "Doctor name is required";
    if (!specialization.trim()) errors.specialization = "Specialization is required";
    if (selectedDays.size > 0 && start >= end) {
      errors.time = "Start time must be before end time";
    }
    if (!Number.isFinite(slotDuration) || slotDuration < MIN_SLOT_MINUTES || slotDuration > MAX_SLOT_MINUTES) {
      errors.duration = `Slot length must be between ${MIN_SLOT_MINUTES} and ${MAX_SLOT_MINUTES} minutes`;
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      await api.post("/doctors", {
        name: name.trim(),
        specialization: specialization.trim(),
        slot_duration_minutes: slotDuration,
        availability: Array.from(selectedDays).map((day) => ({
          day_of_week: day,
          start_time: `${start}:00`,
          end_time: `${end}:00`,
        })),
      });
      onCreated();
      handleClose();
    } catch (err) {
      setServerError(apiErrorMessage(err, "Failed to add doctor"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add Doctor">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Doctor name</label>
          <Input
            placeholder="e.g. Dr. Asha Mehta"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Specialization</label>
          <Input
            placeholder="e.g. Cardiology"
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
          />
          {fieldErrors.specialization && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.specialization}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">
            Appointment slot length (minutes)
          </label>
          <Input
            type="number"
            min={MIN_SLOT_MINUTES}
            max={MAX_SLOT_MINUTES}
            step={5}
            value={slotDuration}
            onChange={(e) => setSlotDuration(Number(e.target.value))}
            className="max-w-[140px]"
          />
          <p className="mt-1 text-[11px] text-text-muted">
            Between {MIN_SLOT_MINUTES} and {MAX_SLOT_MINUTES} minutes. Each appointment takes this long.
          </p>
          {fieldErrors.duration && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.duration}</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <label className="mb-2 block text-xs font-medium text-text-muted">
            Availability (optional — you can add more periods, including
            split hours, and breaks after creating the doctor)
          </label>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {DAY_NAMES_SHORT.map((label, day) => {
              const active = selectedDays.has(day);
              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`h-8 w-11 rounded-full text-xs font-medium transition-colors ${
                    active
                      ? "bg-primary text-white"
                      : "border border-border bg-white text-text-muted hover:border-primary"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              disabled={selectedDays.size === 0}
              className="h-9 rounded-md border border-border px-2 text-sm disabled:opacity-50"
            />
            <span className="text-sm text-text-muted">to</span>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              disabled={selectedDays.size === 0}
              className="h-9 rounded-md border border-border px-2 text-sm disabled:opacity-50"
            />
          </div>
          <p className="mt-2 text-[11px] text-text-muted">
            Same time range applies to every day you select above.
          </p>
          {fieldErrors.time && <p className="mt-1 text-xs text-red-600">{fieldErrors.time}</p>}
        </div>

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            <Plus size={15} />
            {submitting ? "Adding..." : "Add Doctor"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
