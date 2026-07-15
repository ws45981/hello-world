"use client";

import { useState } from "react";
import PersonnelSelector from "./PersonnelSelector";
import DateTimePicker from "./DateTimePicker";
import AttachmentPicker from "./AttachmentPicker";
import LocationSelector from "./LocationSelector";

const makeEmptyForm = () => ({
  date: new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" }),
  time: new Date().toLocaleTimeString("en-CA", { hour12: false, timeZone: "America/Chicago", hour: "2-digit", minute: "2-digit" }),
  category: "Questions/Clarification",
  location: "",
  description: "",
  involvedParties: [],
  involvedPartiesNA: false,
  additionalDetails: "",
  additionalDetailsNA: false,
  attachments: [],
});

export default function QuestionsClarificationForm({ user, onSubmit, onFileUpload, editingData, onCancelEdit }) {
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
    if (!form.description?.trim()) {
      return;
    }
    onSubmit({ ...form, id: editingData?.id });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      <DateTimePicker
        date={form.date}
        time={form.time}
        onDateChange={(val) => setForm((f) => ({ ...f, date: val }))}
        onTimeChange={(val) => setForm((f) => ({ ...f, time: val }))}
      />

      {/* Location */}
      <LocationSelector
        value={form.location}
        onChange={(val) => setForm((f) => ({ ...f, location: val }))}
      />

      {/* Question or Clarification Requested */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Question or Clarification Requested
        </label>
        <textarea
          className="min-h-36 w-full rounded-xl border border-slate-300 px-3 py-3"
          placeholder="Describe the question or clarification being requested in as much detail as possible."
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          required
        />
      </div>

      {/* Who Made This Request */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Who Made This Request?</span>
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
            label="Requesting Party"
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
      <AttachmentPicker
        attachments={form.attachments}
        onFileUpload={onFileUpload}
        onAdd={(urls) => setForm((f) => ({ ...f, attachments: [...f.attachments, ...urls] }))}
      />

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