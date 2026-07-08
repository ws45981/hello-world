"use client";

import { useState } from "react";

export default function PersonnelSelector({ label, entries, onAdd, maxEntries = 10, emsOnly = false }) {
  const [type, setType] = useState("");
  const [selectedPersonnel, setSelectedPersonnel] = useState("");
  const [otherName, setOtherName] = useState("");
  const [otherRole, setOtherRole] = useState("");
  const [error, setError] = useState("");
  const [readyToAdd, setReadyToAdd] = useState(false);

  const canAdd = entries.length < maxEntries;

  const formatEntryLabel = (entry) => {
    if (entry.type === "ems") {
      return `${entry.name}${entry.certification ? `, ${entry.certification}` : ""} - Safety/EMS Personnel`;
    }
    return `${entry.name}${entry.role ? ` - ${entry.role}` : " - Other Personnel"}`;
  };

  const handleTypeSelect = (selectedType) => {
    setType(selectedType);
    setSelectedPersonnel("");
    setOtherName("");
    setOtherRole("");
    setReadyToAdd(false);
    setError("");
  };

  const handleAdd = () => {
    setError("");

    if (type === "ems") {
      if (!selectedPersonnel) {
        setError("Please select a person.");
        return;
      }
      const parsed = JSON.parse(selectedPersonnel);
      onAdd({ type: "ems", name: parsed.name, certification: parsed.certification, role: "Safety/EMS Personnel" });
      setSelectedPersonnel("");
    } else {
      if (!otherName.trim()) {
        setError("Please enter a name.");
        return;
      }
      onAdd({ type: "other", name: otherName.trim(), role: otherRole.trim() || "Other Personnel" });
      setOtherName("");
      setOtherRole("");
    }

    setType("");
    setReadyToAdd(false);
  };

  const personnel = typeof window !== "undefined" ? (window.__EMS_PERSONNEL__ || []) : [];
  const sortedPersonnel = [...personnel].sort((a, b) =>
    (a.preferred_name || "").localeCompare(b.preferred_name || "")
  );

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">{label}</label>

      {/* Added entries */}
      {entries.length > 0 && (
        <ul className="space-y-2">
          {entries.map((entry, index) => (
            <li
              key={index}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm"
            >
              <span className="font-medium">{formatEntryLabel(entry)}</span>
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

          {/* Type selector */}
          {!type && (
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-500 uppercase tracking-wide">
                Type of {label}
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleTypeSelect("ems")}
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Safety/EMS Personnel
                </button>
                {!emsOnly && (
                  <button
                    type="button"
                    onClick={() => handleTypeSelect("other")}
                    className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Other Personnel
                  </button>
                )}
              </div>
            </div>
          )}

          {/* EMS Personnel selector */}
          {type === "ems" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">Select Person</label>
                <button
                  type="button"
                  className="text-xs text-slate-400 hover:text-slate-600"
                  onClick={() => handleTypeSelect("")}
                >
                  ← Back
                </button>
              </div>
              <select
                className="w-full rounded-xl border border-slate-300 px-3 py-3 text-slate-900"
                value={selectedPersonnel}
                onChange={(e) => {
                  setSelectedPersonnel(e.target.value);
                  setReadyToAdd(!!e.target.value);
                }}
              >
                <option value="">— Select personnel —</option>
                {sortedPersonnel.map((person) => (
                  <option
                    key={person.id}
                    value={JSON.stringify({ name: `${person.preferred_name} ${person.last_name}`, certification: person.certification })}
                  >
                    {person.preferred_name} {person.last_name}
                  </option>
                ))}
              </select>
              {readyToAdd && (
                <button
                  type="button"
                  onClick={handleAdd}
                  className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Add to Form
                </button>
              )}
            </div>
          )}

          {/* Other Personnel fields */}
          {type === "other" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">Other Personnel</label>
                <button
                  type="button"
                  className="text-xs text-slate-400 hover:text-slate-600"
                  onClick={() => handleTypeSelect("")}
                >
                  ← Back
                </button>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Name</label>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-3"
                  placeholder="Enter full name"
                  value={otherName}
                  onChange={(e) => {
                    setOtherName(e.target.value);
                    setReadyToAdd(!!e.target.value.trim());
                  }}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Role / Job Title</label>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-3"
                  placeholder="Enter role or job title"
                  value={otherRole}
                  onChange={(e) => setOtherRole(e.target.value)}
                />
              </div>
              {readyToAdd && (
                <button
                  type="button"
                  onClick={handleAdd}
                  className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Add to Form
                </button>
              )}
            </div>
          )}

          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
      )}

      {!canAdd && (
        <p className="text-sm text-slate-500">Maximum of {maxEntries} entries reached.</p>
      )}
    </div>
  );
}