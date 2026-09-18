import { NavLink, Route, Routes, Navigate } from "react-router-dom";
import { CalendarClock, Stethoscope } from "lucide-react";
import DoctorsPage from "./pages/DoctorsPage";
import AvailabilityOverviewPage from "./pages/AvailabilityOverviewPage";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
    isActive ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-100"
  }`;

export default function App() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-10 border-b border-border bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
              <Stethoscope size={18} />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight text-text">Admin Portal</h1>
              <p className="text-xs text-text-muted leading-tight">Appointment Booking System</p>
            </div>
          </div>
          <nav className="flex items-center gap-1.5">
            <NavLink to="/doctors" className={navLinkClass}>
              <Stethoscope size={15} />
              Doctors
            </NavLink>
            <NavLink to="/availability" className={navLinkClass}>
              <CalendarClock size={15} />
              All Availability
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <Routes>
          <Route path="/" element={<Navigate to="/doctors" replace />} />
          <Route path="/doctors" element={<DoctorsPage />} />
          <Route path="/availability" element={<AvailabilityOverviewPage />} />
        </Routes>
      </main>
    </div>
  );
}
