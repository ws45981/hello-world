"use client";

const OPTIONS = [
  { value: "SFOT", activeClass: "border-red-600 bg-red-600 text-white" },
  { value: "HHA", activeClass: "border-blue-600 bg-blue-600 text-white" },
  { value: "N/A", activeClass: "border-slate-900 bg-slate-900 text-white" },
];

export const locationTextClass = (location) =>
  location === "SFOT"
    ? "text-red-600 font-semibold"
    : location === "HHA"
    ? "text-blue-600 font-semibold"
    : location === "N/A"
    ? "text-slate-500 font-semibold"
    : "";

// A location of "N/A" means the entry isn't tied to a site, so location-specific
// follow-up fields (stock rooms, containers) should stay hidden.
export const hasSite = (location) => Boolean(location) && location !== "N/A";

export default function LocationSelector({ value, onChange, label = "Location" }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      <div className="flex gap-3">
        {OPTIONS.map(({ value: option, activeClass }) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
              value === option ? activeClass : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
