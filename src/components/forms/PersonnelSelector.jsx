"use client";

import { useState } from "react";

export default function PersonnelSelector({ label, entries, onAdd, maxEntries = 10, emsOnly = false }) {
  const [type, setType] = useState("");
  const [selectedPersonnel, setSelectedPersonnel] = useState("");
  const [otherName, setOtherName] = useState("");
  const [otherRole, setOtherRole] = useState("");
  const [error, setError] = useState("");

  const canAdd = entries.length < maxEntries;
  const showEmsOnly = emsOnly || false;

  const handleAdd = () => {
    setError("");

    if (!type) {
      setError("Please select a type first.");
      return;
    }

    if (type === "ems") {
      if (!selectedPersonnel) {
        setError("Please select a person.");
        return;
      }
      onAdd({ type: "ems", name: selectedPersonnel, role: "Safety/EMS Personnel" });
      setSelectedPersonnel("");
    } else {
      if (!otherName.trim()) {
        setError("Please enter a name.");
        return;
      }
      onAdd({ type: "other", name: otherName.trim(), role: otherRole.trim() });
      setOtherName("");
      setOtherRole("");
    }

    setType("");
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">{label}</label>

      {entries.length > 0 && (
        <ul className="space-y-2">
          {entries.map((entry, index) => (
            <li
              key={index}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm"
            >
              <span>
                <span className="font-medium">{entry.name}</span>
                {entry.role && (
                  <span className="ml-2 text-slate-500">— {entry.role}</span>
                )}
              </span>
              <button
                type="button"
                className="ml-4 text-rose-500 hover:text-rose-700 text-xs"
                onClick={() => {
                  const updated = entries.filter((_, i) => i !== index);
                  onAdd(null, updated);
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {canAdd && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-500 uppercase tracking-wide">
              Type of {label}
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setType("ems")}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                  type === "ems"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Safety/EMS Personnel
              </button>
              {!showEmsOnly && (
                <button
                  type="button"
                  onClick={() => setType("other")}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                    type === "other"
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Other Personnel
                </button>
              )}
            </div>
          </div>

          {type === "ems" && (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Select Person
              </label>
              <select
                className="w-full rounded-xl border border-slate-300 px-3 py-3 text-slate-900"
                value={selectedPersonnel}
                onChange={(e) => setSelectedPersonnel(e.target.value)}
              >
                <option value="">— Select personnel —</option>
                {[...(window.__EMS_PERSONNEL__ || [])].sort((a, b) =>
                  a.preferred_name.localeCompare(b.preferred_name)
                ).map((person) => (
                  <option key={person.id} value={person.preferred_name}>
                    {person.preferred_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {type === "other" && (
            <div className="space-y-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Name
                </label>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-3"
                  placeholder="Enter full name"
                  value={otherName}
                  onChange={(e) => setOtherName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Role / Job Title
                </label>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-3"
                  placeholder="Enter role or job title"
                  value={otherRole}
                  onChange={(e) => setOtherRole(e.target.value)}
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-rose-600">{error}</p>
          )}

          {type && (
            <button
              type="button"
              onClick={handleAdd}
              className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              + Add {label}
            </button>
          )}
        </div>
      )}

      {!canAdd && (
        <p className="text-sm text-slate-500">Maximum of {maxEntries} entries reached.</p>
      )}
    </div>
  );
}