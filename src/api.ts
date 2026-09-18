import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
});

export interface Doctor {
  id: number;
  name: string;
  specialization: string;
  slot_duration_minutes: number;
  created_at?: string;
}

export interface AvailabilityPeriod {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface DoctorAvailabilityGroup {
  doctor_id: number;
  name: string;
  specialization: string;
  slot_duration_minutes: number;
  slots: AvailabilityPeriod[];
}

export interface DoctorBreak {
  id: number;
  break_date: string;
  start_time: string;
  end_time: string;
}

export interface AffectedAppointment {
  id: number;
  previousSlot: string;
  newSlot: string | null;
  status: "rescheduled" | "cancelled";
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const MIN_SLOT_MINUTES = 5;
export const MAX_SLOT_MINUTES = 120;

export function apiErrorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { error?: string } } }).response?.data
    ?.error;
  return message ?? fallback;
}
