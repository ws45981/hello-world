"use client";

import { useState } from "react";
import DateTimePicker from "./DateTimePicker";

const makeEmptyForm = () => ({
  date: new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" }),
  time: new Date().toLocaleTimeString("en-CA", { hour12: false, timeZone: "America/Chicago", hour: "2-digit", minute: "2-digit" }),
  category: "Request to Leave Early",
  involvedParties: [],
  scheduledUntil: "",
  requestGranted: null,
  departureTime: "",
  denialReason: "",
  additionalDetails: "",
  additionalDetailsNA: false,
});

export default function RequestToLeaveForm({ user, onSubmit, editingData, onCancelEdit }) {
  const [form, setForm] = useState(editingData || makeEmptyForm());

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, id: editingData?.id });
  };

  const personnel = typeof window !== "undefined" ? (window.__EMS_PERSONNEL__ || []) : [];
  const sortedPersonnel = [...personnel].sort((a, b) =>
    (a.preferred_name || "").localeCompare(b.preferred_name || "")
  );

  const selectedName = form.involvedParties[0]?.name || "";
  const employeeName = selectedName || "the employee";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      <DateTimePicker
        date={form.date}
        time={form.time}
        onDateChange={(val) => setForm((f) => ({ ...f, date: val }))}
        onTimeChange={(val) => setForm((f) => ({ ...f, time: val }))}
      />

      {/* Select Person */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Select Person</label>
        <select
          className="w-full rounded-xl border border-slate-300 px-3 py-3"
          value={selectedName}
          onChange={(e) => setForm((f) => ({
            ...f,
            involvedParties: e.target.value
              ? [{ type: "ems", name: e.target.value, role: "Safety/EMS Personnel" }]
              : []
          }))}
          required
        >
          <option value="">— Select personnel —</option>
          {sortedPersonnel.map((person) => (
            <option key={person.id} value={person.preferred_name}>
              {person.preferred_name} {person.last_name}
            </option>
          ))}
        </select>
      </div>

      {/* Scheduled Until */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          What time was {employeeName} scheduled to work until?
        </label>
        <div className="flex items-center gap-2">
          <select
            className="w-24 rounded-xl border border-slate-300 px-3 py-3"
            value={(form.scheduledUntil || "00:00").split(":")[0]}
            onChange={(e) => {
              const minutes = (form.scheduledUntil || "00:00").split(":")[1] || "00";
              setForm((f) => ({ ...f, scheduledUntil: `${e.target.value}:${minutes}` }));
            }}
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={String(h).padStart(2, "0")}>{String(h).padStart(2, "0")}</option>
            ))}
          </select>
          <span className="text-slate-500">:</span>
          <select
            className="w-24 rounded-xl border border-slate-300 px-3 py-3"
            value={(form.scheduledUntil || "00:00").split(":")[1] || "00"}
            onChange={(e) => {
              const hours = (form.scheduledUntil || "00:00").split(":")[0] || "00";
              setForm((f) => ({ ...f, scheduledUntil: `${hours}:${e.target.value}` }));
            }}
          >
            {Array.from({ length: 60 }, (_, m) => (
              <option key={m} value={String(m).padStart(2, "0")}>{String(m).padStart(2, "0")}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Request Granted */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Was the request granted?
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, requestGranted: true, denialReason: "" }))}
            className={`flex-1 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
              form.requestGranted === true
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, requestGranted: false, departureTime: "" }))}
            className={`flex-1 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
              form.requestGranted === false
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            No
          </button>
        </div>

        {/* Departure Time - shown when granted */}
        {form.requestGranted === true && (
          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              What time did {employeeName} leave for the day?
            </label>
            <div className="flex items-center gap-2">
              <select
                className="w-24 rounded-xl border border-slate-300 px-3 py-3"
                value={(form.departureTime || "00:00").split(":")[0]}
                onChange={(e) => {
                  const minutes = (form.departureTime || "00:00").split(":")[1] || "00";
                  setForm((f) => ({ ...f, departureTime: `${e.target.value}:${minutes}` }));
                }}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={String(h).padStart(2, "0")}>{String(h).padStart(2, "0")}</option>
                ))}
              </select>
              <span className="text-slate-500">:</span>
              <select
                className="w-24 rounded-xl border border-slate-300 px-3 py-3"
                value={(form.departureTime || "00:00").split(":")[1] || "00"}
                onChange={(e) => {
                  const hours = (form.departureTime || "00:00").split(":")[0] || "00";
                  setForm((f) => ({ ...f, departureTime: `${hours}:${e.target.value}` }));
                }}
              >
                {Array.from({ length: 60 }, (_, m) => (
                  <option key={m} value={String(m).padStart(2, "0")}>{String(m).padStart(2, "0")}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Denial Reason - shown when not granted */}
        {form.requestGranted === false && (
          <div className="mt-3">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Why was the request not approved?
            </label>
            <textarea
              className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-3"
              placeholder="Please explain the reason the request was not approved..."
              value={form.denialReason}
              onChange={(e) => setForm((f) => ({ ...f, denialReason: e.target.value }))}
            />
          </div>
        )}
      </div>

      {/* Additional Details */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700">Additional Details</label>
          <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
            <input
              type="checkbox"
              checked={form.additionalDetailsNA}
              onChange={(e) => setForm((f) => ({ ...f, additionalDetailsNA: e.target.checked, additionalDetails: "" }))}
            />
            N/A
          </label>
        </div>
        <textarea
          className={`min-h-28 w-full rounded-xl border border-slate-300 px-3 py-3 ${form.additionalDetailsNA ? "bg-slate-100 text-slate-400" : ""}`}
          value={form.additionalDetails}
          onChange={(e) => setForm((f) => ({ ...f, additionalDetails: e.target.value }))}
          disabled={form.additionalDetailsNA}
          placeholder="Any additional context or follow-up needed..."
        />
      </div>

      {/* Submit */}
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-700"
        >
          {editingData ? "Save Changes" : "Submit Incident"}
        </button>
        {editingData && (
          <button
            type="button"
            className="rounded-xl border border-slate-300 px-6 py-3 font-medium hover:bg-slate-50"
            onClick={onCancelEdit}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}