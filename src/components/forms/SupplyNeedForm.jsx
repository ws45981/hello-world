"use client";

import { useState } from "react";

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

const SFOT_STOCK_ROOMS = [
  "Main Supply Room (SFOT)",
  "Riser Supply Room (SFOT)",
  "OTC Supply (SFOT)",
];

const HHA_STOCK_ROOMS = [
  "Main Supply Room (HHA)",
  "OTC Supply (HHA)",
];

const SFOT_CONTAINERS = [
  "ALS Bag #1 (SFOT)",
  "ALS Bag #2 (SFOT)",
  "Airway Bag #1 (SFOT)",
  "Airway Bag #2 (SFOT)",
  "Cardiac Monitor #1 (SFOT)",
  "Cardiac Monitor #2 (SFOT)",
  "Medic Bag #1 (SFOT)",
  "Medic Bag #2 (SFOT)",
  "Medic Bag #3 (SFOT)",
  "Medic Bag #4 (SFOT)",
  "Medic Bag #5 (SFOT)",
  "Medic Bag #6 (SFOT)",
  "Medic Bag #7 (SFOT)",
  "Medic Bag #8 (SFOT)",
  "Medic Bag #9 (SFOT)",
  "Medic Bag #10 (SFOT)",
  "Medic Bag #11 (SFOT)",
  "Medic Bag #12 (SFOT)",
  "Medic Bag #13 (SFOT)",
  "Medic Bag #14 (SFOT)",
  "Medic Bag #15 (SFOT)",
  "Crash Cart (SFOT)",
  "Cart Box #1 (SFOT)",
  "Cart Box #2 (SFOT)",
  "Suction Unit #1 (Cart)(SFOT)",
  "Suction Unit #2 (Cart)(SFOT)",
  "Suction Unit #3 (Crash Cart)(SFOT)",
];

const HHA_CONTAINERS = [
  "ALS Bag #1 (HHA)",
  "Airway Bag #1 (HHA)",
  "Cardiac Monitor #1 (HHA)",
  "Medic Bag #1 (HHA)",
  "Medic Bag #2 (HHA)",
  "Medic Bag #3 (HHA)",
  "Medic Bag #4 (HHA)",
  "Medic Bag #555",
  "Crash Cart (HHA)",
  "Suction Unit #1 (HHA)",
  "Suction Unit #2 (HHA)",
];

const makeEmptyForm = () => ({
  date: formatDateInput(new Date()),
  time: formatTimeInput(new Date()),
  category: "Supply Need",
  location: "",
  storageType: "",
  storageLocation: "",
  description: "",
  additionalDetails: "",
  additionalDetailsNA: false,
  attachments: [],
});

export default function SupplyNeedForm({ user, onSubmit, uploading, onFileUpload, editingData, onCancelEdit }) {
  const [form, setForm] = useState(editingData || makeEmptyForm());

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  const getStorageOptions = () => {
    if (form.storageType === "Stock Room") {
      return form.location === "SFOT" ? SFOT_STOCK_ROOMS : HHA_STOCK_ROOMS;
    }
    if (form.storageType === "Container") {
      return form.location === "SFOT" ? SFOT_CONTAINERS : HHA_CONTAINERS;
    }
    return [];
  };

  const locationColor = form.location === "SFOT" ? "text-red-600 font-semibold" : form.location === "HHA" ? "text-blue-600 font-semibold" : "";

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

      {/* Location */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Location</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, location: "SFOT", storageType: "", storageLocation: "" }))}
            className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
              form.location === "SFOT"
                ? "border-red-600 bg-red-600 text-white"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            SFOT
          </button>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, location: "HHA", storageType: "", storageLocation: "" }))}
            className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
              form.location === "HHA"
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            HHA
          </button>
        </div>
      </div>

      {/* Storage Type */}
      {form.location && (
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Where is the supply needed? <span className={locationColor}>({form.location})</span>
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, storageType: "Stock Room", storageLocation: "" }))}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                form.storageType === "Stock Room"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Stock Room
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, storageType: "Container", storageLocation: "" }))}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                form.storageType === "Container"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Container
            </button>
          </div>
        </div>
      )}

      {/* Specific Location/Container */}
      {form.storageType && (
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Select {form.storageType} <span className={locationColor}>({form.location})</span>
          </label>
          <select
            className="w-full rounded-xl border border-slate-300 px-3 py-3"
            value={form.storageLocation}
            onChange={(e) => setForm((f) => ({ ...f, storageLocation: e.target.value }))}
            required
          >
            <option value="">— Select {form.storageType} —</option>
            {getStorageOptions().map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      )}

      {/* Supplies Needed */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Supplies Needed</label>
        <textarea
          className="min-h-36 w-full rounded-xl border border-slate-300 px-3 py-3"
          placeholder="List all supplies needed. For items currently in stock that are nearing expiration, please include the expiration date."
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          required
        />
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