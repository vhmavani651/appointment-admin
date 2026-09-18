import { useEffect, useState } from "react";
import { CalendarPlus, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  api,
  apiErrorMessage,
  MAX_SLOT_MINUTES,
  MIN_SLOT_MINUTES,
  type Doctor,
  type Paginated,
} from "../api";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import AddDoctorModal from "../components/AddDoctorModal";
import DoctorAvailabilityEditor from "../components/DoctorAvailabilityEditor";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import Input from "../components/ui/Input";
import Pagination from "../components/ui/Pagination";
import SearchInput from "../components/ui/SearchInput";
import Select from "../components/ui/Select";
import { DoctorCardSkeleton } from "../components/ui/Skeleton";

const LIMIT = 6;

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [meta, setMeta] = useState<Paginated<Doctor>["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [specializationFilter, setSpecializationFilter] = useState("");
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editSpecialization, setEditSpecialization] = useState("");
  const [editSlotDuration, setEditSlotDuration] = useState(30);
  const [editSaving, setEditSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Doctor | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, specializationFilter]);

  useEffect(() => {
    api.get<string[]>("/doctors/specializations").then((res) => setSpecializations(res.data));
  }, []);

  function loadDoctors() {
    setLoading(true);
    setListError("");
    api
      .get<Paginated<Doctor>>("/doctors", {
        params: {
          page,
          limit: LIMIT,
          search: debouncedSearch || undefined,
          specialization: specializationFilter || undefined,
        },
      })
      .then((res) => {
        setDoctors(res.data.data);
        setMeta(res.data.meta);
      })
      .catch((err) => setListError(apiErrorMessage(err, "Failed to load doctors")))
      .finally(() => setLoading(false));
  }

  useEffect(loadDoctors, [page, debouncedSearch, specializationFilter]);

  function startEdit(doctor: Doctor) {
    setEditingId(doctor.id);
    setEditName(doctor.name);
    setEditSpecialization(doctor.specialization);
    setEditSlotDuration(doctor.slot_duration_minutes);
  }

  async function saveEdit(id: number) {
    if (
      !editName.trim() ||
      !editSpecialization.trim() ||
      editSlotDuration < MIN_SLOT_MINUTES ||
      editSlotDuration > MAX_SLOT_MINUTES
    ) {
      return;
    }
    setEditSaving(true);
    try {
      await api.put(`/doctors/${id}`, {
        name: editName,
        specialization: editSpecialization,
        slot_duration_minutes: editSlotDuration,
      });
      setEditingId(null);
      loadDoctors();
    } finally {
      setEditSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/doctors/${deleteTarget.id}`);
      if (expandedId === deleteTarget.id) setExpandedId(null);
      setDeleteTarget(null);
      loadDoctors();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <AddDoctorModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onCreated={() => {
          loadDoctors();
          api.get<string[]>("/doctors/specializations").then((res) => setSpecializations(res.data));
        }}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete doctor"
        message={`Delete ${deleteTarget?.name ?? "this doctor"}? This permanently removes their availability, breaks, and ALL patient appointments (past and upcoming) with them. This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-text">Doctors</h2>
          <p className="text-sm text-text-muted">Add doctors and set their weekly availability.</p>
        </div>
        <Button onClick={() => setAddModalOpen(true)}>
          <Plus size={16} />
          Add Doctor
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or specialization..." />
        <Select value={specializationFilter} onChange={(e) => setSpecializationFilter(e.target.value)}>
          <option value="">All specializations</option>
          {specializations.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      {listError && <p className="text-sm text-red-600">{listError}</p>}

      <div className="space-y-3">
        {loading &&
          Array.from({ length: LIMIT }).map((_, i) => <DoctorCardSkeleton key={i} />)}

        {!loading && doctors.length === 0 && (
          <Card className="p-8 text-center text-sm text-text-muted">
            No doctors match your search.
          </Card>
        )}

        {!loading &&
          doctors.map((doctor) => (
            <Card key={doctor.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {editingId === doctor.id ? (
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="max-w-[220px]"
                    />
                    <Input
                      value={editSpecialization}
                      onChange={(e) => setEditSpecialization(e.target.value)}
                      className="max-w-[220px]"
                    />
                    <Input
                      type="number"
                      min={MIN_SLOT_MINUTES}
                      max={MAX_SLOT_MINUTES}
                      step={5}
                      value={editSlotDuration}
                      onChange={(e) => setEditSlotDuration(Number(e.target.value))}
                      className="max-w-[90px]"
                      title="Slot length (minutes)"
                    />
                    <Button className="h-9" onClick={() => saveEdit(doctor.id)} loading={editSaving}>
                      <Check size={14} />
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-9"
                      onClick={() => setEditingId(null)}
                      disabled={editSaving}
                    >
                      <X size={15} />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light text-sm font-semibold text-primary">
                        {doctor.name
                          .replace(/^Dr\.?\s*/i, "")
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-text">{doctor.name}</div>
                        <div className="flex items-center gap-1.5 text-xs text-text-muted">
                          {doctor.specialization}
                          <span className="rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                            {doctor.slot_duration_minutes} min slots
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant={expandedId === doctor.id ? "filled" : "outlined"}
                        className="h-9"
                        onClick={() => setExpandedId(expandedId === doctor.id ? null : doctor.id)}
                      >
                        <CalendarPlus size={15} />
                        {expandedId === doctor.id ? "Hide availability" : "Set availability"}
                      </Button>
                      <Button variant="ghost" className="h-9 w-9 p-0" onClick={() => startEdit(doctor)}>
                        <Pencil size={15} />
                      </Button>
                      <Button
                        variant="danger"
                        className="h-9 w-9 p-0"
                        onClick={() => setDeleteTarget(doctor)}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {expandedId === doctor.id && (
                <div className="mt-4">
                  <DoctorAvailabilityEditor doctorId={doctor.id} />
                </div>
              )}
            </Card>
          ))}
      </div>

      {meta && !loading && (
        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          limit={meta.limit}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
