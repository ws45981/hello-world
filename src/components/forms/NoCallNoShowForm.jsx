"use client";

import { useState } from "react";
import DateTimePicker from "./DateTimePicker";

const formatDateInput = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
};

const formatTimeInput = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-CA", {
    hour12: false,
    timeZone: "America/Chicago",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const makeEmptyForm = () => ({
  date: formatDateInput(new Date()),
  time: formatTimeInput(new Date()),
  category: "No Call, No Show",
  involvedParties: [],
  scheduledTime: "",
  communicationReceived: null,
  communicationDetails: "",
  additionalDetails: "",
  additionalDetailsNA: false,
});

export default function NoCallNoShowForm({ user, onSubmit, editingData, onCancelEdit }) {
  const [form, setForm] = useState(editingData || makeEmptyForm());
  const [submitError, setSubmitError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.involvedParties.length === 0) {
      setSubmitError("Please select a person before submitting.");
      return;
    }
    setSubmitError("");
    onSubmit(form);
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

      {/* Scheduled Time */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          What time was {employeeName} scheduled to begin their shift?
        </label>
        <div className="flex items-center gap-2">
          <select
            className="w-24 rounded-xl border border-slate-300 px-3 py-3"
            value={(form.scheduledTime || "00:00").split(":")[0]}
            onChange={(e) => {
              const minutes = (form.scheduledTime || "00:00").split(":")[1] || "00";
              setForm((f) => ({ ...f, scheduledTime: `${e.target.value}:${minutes}` }));
            }}
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={String(h).padStart(2, "0")}>{String(h).padStart(2, "0")}</option>
            ))}
          </select>
          <span className="text-slate-500">:</span>
          <select
            className="w-24 rounded-xl border border-slate-300 px-3 py-3"
            value={(form.scheduledTime || "00:00").split(":")[1] || "00"}
            onChange={(e) => {
              const hours = (form.scheduledTime || "00:00").split(":")[0] || "00";
              setForm((f) => ({ ...f, scheduledTime: `${hours}:${e.target.value}` }));
            }}
          >
            {Array.from({ length: 60 }, (_, m) => (
              <option key={m} value={String(m).padStart(2, "0")}>{String(m).padStart(2, "0")}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Communication Received */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Was any communication received from {employeeName}?
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, communicationReceived: true }))}
            className={`flex-1 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
              form.communicationReceived === true
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, communicationReceived: false, communicationDetails: "" }))}
            className={`flex-1 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
              form.communicationReceived === false
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            No
          </button>
        </div>
        {form.communicationReceived === true && (
          <textarea
            className="mt-3 min-h-24 w-full rounded-xl border border-slate-300 px-3 py-3"
            placeholder="Describe the communication received — when, how, and what was said..."
            value={form.communicationDetails}
            onChange={(e) => setForm((f) => ({ ...f, communicationDetails: e.target.value }))}
          />
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
      {submitError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          🚫 {submitError}
        </div>
      )}

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