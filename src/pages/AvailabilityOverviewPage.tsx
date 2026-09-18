import { useEffect, useState } from "react";
import { Clock, Stethoscope } from "lucide-react";
import { api, apiErrorMessage, DAY_NAMES, type DoctorAvailabilityGroup, type Paginated } from "../api";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import Card from "../components/ui/Card";
import Pagination from "../components/ui/Pagination";
import SearchInput from "../components/ui/SearchInput";
import Select from "../components/ui/Select";
import { AvailabilityCardSkeleton } from "../components/ui/Skeleton";

const LIMIT = 6;

export default function AvailabilityOverviewPage() {
  const [groups, setGroups] = useState<DoctorAvailabilityGroup[]>([]);
  const [meta, setMeta] = useState<Paginated<DoctorAvailabilityGroup>["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [specializationFilter, setSpecializationFilter] = useState("");
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get<string[]>("/doctors/specializations").then((res) => setSpecializations(res.data));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, specializationFilter]);

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .get<Paginated<DoctorAvailabilityGroup>>("/availability", {
        params: {
          page,
          limit: LIMIT,
          search: debouncedSearch || undefined,
          specialization: specializationFilter || undefined,
        },
      })
      .then((res) => {
        setGroups(res.data.data);
        setMeta(res.data.meta);
      })
      .catch((err) => setError(apiErrorMessage(err, "Failed to load availability")))
      .finally(() => setLoading(false));
  }, [page, debouncedSearch, specializationFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text">All Doctors&rsquo; Availability</h2>
        <p className="text-sm text-text-muted">
          A read-only overview of every doctor&rsquo;s weekly schedule, including split hours.
        </p>
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

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {loading &&
          Array.from({ length: LIMIT }).map((_, i) => <AvailabilityCardSkeleton key={i} />)}

        {!loading && groups.length === 0 && (
          <Card className="p-8 text-center text-sm text-text-muted sm:col-span-2">
            No doctors match your search.
          </Card>
        )}

        {!loading &&
          groups.map((group) => {
            const byDay = new Map<number, typeof group.slots>();
            for (const p of group.slots) {
              (byDay.get(p.day_of_week) ?? byDay.set(p.day_of_week, []).get(p.day_of_week)!).push(p);
            }

            return (
              <Card key={group.doctor_id} className="p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-primary">
                      <Stethoscope size={16} />
                    </div>
                    <div>
                      <div className="font-medium text-text">{group.name}</div>
                      <div className="text-xs text-text-muted">{group.specialization}</div>
                    </div>
                  </div>
                  <span className="rounded-full bg-surface px-2 py-1 text-[10px] font-medium text-text-muted">
                    {group.slot_duration_minutes} min slots
                  </span>
                </div>

                {byDay.size === 0 ? (
                  <p className="text-sm text-text-muted">No availability set yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {DAY_NAMES.map((dayName, day) => {
                      const dayPeriods = byDay.get(day);
                      if (!dayPeriods?.length) return null;
                      return (
                        <li
                          key={day}
                          className="flex items-center justify-between rounded-lg bg-surface px-3 py-1.5 text-sm"
                        >
                          <span className="font-medium text-text">{dayName}</span>
                          <span className="flex items-center gap-1 text-right text-text-muted">
                            <Clock size={13} className="shrink-0" />
                            {dayPeriods
                              .map((p) => `${p.start_time.slice(0, 5)}–${p.end_time.slice(0, 5)}`)
                              .join(", ")}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            );
          })}
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
