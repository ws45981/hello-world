"use client";

import { useState } from "react";
import PersonnelSelector from "./PersonnelSelector";

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
  witnesses: [],
  witnessesNA: false,
  additionalDetails: "",
  additionalDetailsNA: false,
  attachments: [],
});

export default function NoCallNoShowForm({ user, onSubmit, uploading, onFileUpload, editingData, onCancelEdit }) {
  const [form, setForm] = useState(editingData || makeEmptyForm());

  const handleInvolvedPartiesUpdate = (newEntry, replacedList) => {
    if (replacedList !== undefined) {
      setForm((f) => ({ ...f, involvedParties: replacedList }));
    } else if (newEntry) {
      setForm((f) => ({ ...f, involvedParties: [...f.involvedParties, newEntry] }));
    }
  };

  const handleWitnessesUpdate = (newEntry, replacedList) => {
    if (replacedList !== undefined) {
      setForm((f) => ({ ...f, witnesses: replacedList }));
    } else if (newEntry) {
      setForm((f) => ({ ...f, witnesses: [...f.witnesses, newEntry] }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  const employeeName = form.involvedParties[0]?.name || "the employee";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Date & Time */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Date</label>
          <div className="flex gap-2">
            <input
              type="date"
              className="flex-1 rounded-xl border border-slate-300 px-3 py-3"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              required
            />
            <button
              type="button"
              className="rounded-xl border border-slate-300 px-3 py-3 text-sm hover:bg-slate-50"
              onClick={() => setForm((f) => ({ ...f, date: formatDateInput(new Date()) }))}
            >
              Now
            </button>
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Time (CST)</label>
          <div className="flex items-center gap-2">
            <select
              className="w-24 rounded-xl border border-slate-300 px-3 py-3"
              value={(form.time || "00:00").split(":")[0]}
              onChange={(e) => {
                const minutes = (form.time || "00:00").split(":")[1] || "00";
                setForm((f) => ({ ...f, time: `${e.target.value}:${minutes}` }));
              }}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={String(h).padStart(2, "0")}>{String(h).padStart(2, "0")}</option>
              ))}
            </select>
            <span className="text-slate-500">:</span>
            <select
              className="w-24 rounded-xl border border-slate-300 px-3 py-3"
              value={(form.time || "00:00").split(":")[1] || "00"}
              onChange={(e) => {
                const hours = (form.time || "00:00").split(":")[0] || "00";
                setForm((f) => ({ ...f, time: `${hours}:${e.target.value}` }));
              }}
            >
              {Array.from({ length: 60 }, (_, m) => (
                <option key={m} value={String(m).padStart(2, "0")}>{String(m).padStart(2, "0")}</option>
              ))}
            </select>
            <button
              type="button"
              className="rounded-xl border border-slate-300 px-3 py-3 text-sm hover:bg-slate-50"
              onClick={() => setForm((f) => ({ ...f, time: formatTimeInput(new Date()) }))}
            >
              Now
            </button>
          </div>
        </div>
      </div>

      {/* Personnel Name */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Personnel Name</label>
        <PersonnelSelector
          label="Personnel"
          entries={form.involvedParties}
          onAdd={handleInvolvedPartiesUpdate}
          maxEntries={1}
        />
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

      {/* Witnesses */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Witnesses</span>
          <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
            <input
              type="checkbox"
              checked={form.witnessesNA}
              onChange={(e) => setForm((f) => ({ ...f, witnessesNA: e.target.checked, witnesses: [] }))}
            />
            N/A
          </label>
        </div>
        {!form.witnessesNA && (
          <PersonnelSelector
            label="Witness"
            entries={form.witnesses}
            onAdd={handleWitnessesUpdate}
            maxEntries={10}
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

      {/* Attachments */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Attachments</label>
        <input
          type="file"
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
          capture={typeof window !== "undefined" && /Mobi|Android/i.test(navigator.userAgent) ? "environment" : undefined}
          className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm"
          onChange={async (e) => {
            const url = await onFileUpload(e);
            if (url) setForm((f) => ({ ...f, attachments: [...f.attachments, url] }));
          }}
        />
        {uploading && <p className="mt-2 text-sm text-slate-500">Uploading...</p>}
        {form.attachments.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {form.attachments.map((a, i) => <li key={i}>📎 {a}</li>)}
          </ul>
        )}
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