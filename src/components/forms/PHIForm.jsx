"use client";

import { useState } from "react";
import PersonnelSelector from "./PersonnelSelector";
import DateTimePicker from "./DateTimePicker";
import AttachmentPicker from "./AttachmentPicker";
import LocationSelector from "./LocationSelector";

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

const COMMUNICATION_METHODS = [
  "In Person",
  "Phone Call",
  "Text Message",
  "Email",
  "Teams Chat",
  "Other",
];

const makeEmptyForm = () => ({
  date: formatDateInput(new Date()),
  time: formatTimeInput(new Date()),
  category: "PHI",
  location: "",
  phiRequested: "",
  communicationMethod: "",
  otherCommunicationMethod: "",
  informationProvided: "",
  description: "",
  involvedParties: [],
  involvedPartiesNA: false,
  witnesses: [],
  witnessesNA: false,
  additionalDetails: "",
  additionalDetailsNA: false,
  attachments: [],
});

export default function PHIForm({ categories, user, onSubmit, uploading, onFileUpload, editingData, onCancelEdit }) {
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

      {/* PHI Requested */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Specific PHI Requested
        </label>
        <textarea
          className="min-h-28 w-full rounded-xl border border-slate-300 px-3 py-3"
          placeholder="Please detail the exact information that was requested and how it was requested. Provide direct quotes to the best of your ability."
          value={form.phiRequested}
          onChange={(e) => setForm((f) => ({ ...f, phiRequested: e.target.value }))}
          required
        />
      </div>

      {/* Communication Method */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          How was this request made?
        </label>
        <div className="flex flex-wrap gap-2">
          {COMMUNICATION_METHODS.map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setForm((f) => ({ ...f, communicationMethod: method, otherCommunicationMethod: "" }))}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                form.communicationMethod === method
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {method}
            </button>
          ))}
        </div>
        {form.communicationMethod === "Other" && (
          <input
            className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-3"
            placeholder="Please describe the means of communication used"
            value={form.otherCommunicationMethod}
            onChange={(e) => setForm((f) => ({ ...f, otherCommunicationMethod: e.target.value }))}
          />
        )}
      </div>

      {/* Information Provided */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          What information was disclosed?
        </label>
        <textarea
          className="min-h-28 w-full rounded-xl border border-slate-300 px-3 py-3"
          placeholder="Please provide a thorough and accurate account of what information was shared in response to this request."
          value={form.informationProvided}
          onChange={(e) => setForm((f) => ({ ...f, informationProvided: e.target.value }))}
          required
        />
      </div>

      {/* Incident Description */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Incident Description
        </label>
        <textarea
          className="min-h-36 w-full rounded-xl border border-slate-300 px-3 py-3"
          placeholder="Describe the circumstances surrounding this incident, what led up to it, and what ultimately happened or resulted from it."
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
      <AttachmentPicker
        attachments={form.attachments}
        onFileUpload={onFileUpload}
        onAdd={(urls) => setForm((f) => ({ ...f, attachments: [...f.attachments, ...urls] }))}
      />

      {/* Submit */}
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={uploading}
          className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-700 disabled:bg-slate-300"
        >
          {uploading ? "Waiting for upload..." : editingData ? "Save Changes" : "Submit Incident"}
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