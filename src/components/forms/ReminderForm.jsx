"use client";

import { useState } from "react";
import DateTimePicker from "./DateTimePicker";
import PersonnelSelector from "./PersonnelSelector";

const makeEmptyForm = () => ({
  date: new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" }),
  time: new Date().toLocaleTimeString("en-CA", { hour12: false, timeZone: "America/Chicago", hour: "2-digit", minute: "2-digit" }),
  category: "Reminder",
  description: "",
  involvedParties: [],
  involvedPartiesNA: false,
  additionalDetails: "",
  additionalDetailsNA: false,
  attachments: [],
});

export default function ReminderForm({ user, onSubmit, uploading, onFileUpload, editingData, onCancelEdit }) {
  const [form, setForm] = useState(editingData || makeEmptyForm());

  const handleInvolvedPartiesUpdate = (newEntry, replacedList) => {
    if (replacedList !== undefined) {
      setForm((f) => ({ ...f, involvedParties: replacedList }));
    } else if (newEntry) {
      setForm((f) => ({ ...f, involvedParties: [...f.involvedParties, newEntry] }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      <DateTimePicker
        date={form.date}
        time={form.time}
        onDateChange={(val) => setForm((f) => ({ ...f, date: val }))}
        onTimeChange={(val) => setForm((f) => ({ ...f, time: val }))}
      />

      {/* Reminder Details */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Reminder Details
        </label>
        <textarea
          className="min-h-36 w-full rounded-xl border border-slate-300 px-3 py-3"
          placeholder="Enter the details of the reminder, including any relevant dates, deadlines, or actions required."
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          required
        />
      </div>

      {/* Involved Parties */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Involved Parties</span>
          <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
            <input
              type="checkbox"
              checked={form.involvedPartiesNA}
              onChange={(e) => setForm((f) => ({ ...f, involvedPartiesNA: e.target.checked, involvedParties: [] }))}
            />
            N/A
          </label>
        </div>
        {!form.involvedPartiesNA && (
          <PersonnelSelector
            label="Involved Party"
            entries={form.involvedParties}
            onAdd={handleInvolvedPartiesUpdate}
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