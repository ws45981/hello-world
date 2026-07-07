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

const makeEmptyForm = (category = "") => ({
  date: formatDateInput(new Date()),
  time: formatTimeInput(new Date()),
  category,
  categoryDescription: "",
  description: "",
  involvedParties: [],
  involvedPartiesNA: false,
  witnesses: [],
  witnessesNA: false,
  additionalDetails: "",
  additionalDetailsNA: false,
  attachments: [],
});

export default function IncidentForm({ category, categories, user, onSubmit, uploading, onFileUpload, editingData, onCancelEdit }) {
  const [form, setForm] = useState(editingData || makeEmptyForm(category));

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

      {/* Category */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Category</label>
        <select
          className="w-full rounded-xl border border-slate-300 px-3 py-3"
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value, categoryDescription: "" }))}
          required
        >
          <option value="">— Select a category —</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {form.category === "Other" && (
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Category Description</label>
          <input
            className="w-full rounded-xl border border-slate-300 px-3 py-3"
            placeholder="Please describe the category"
            value={form.categoryDescription}
            onChange={(e) => setForm((f) => ({ ...f, categoryDescription: e.target.value }))}
          />
        </div>
      )}

      {/* Incident Description */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Incident Description</label>
        <textarea
          className="min-h-36 w-full rounded-xl border border-slate-300 px-3 py-3"
          placeholder="Describe what happened, the circumstances, and the outcome..."
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
          onChange={onFileUpload}
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