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

export default function DateTimePicker({ date, time, onDateChange, onTimeChange }) {
  const [showDateConfirm, setShowDateConfirm] = useState(false);
  const [showFutureDateWarning, setShowFutureDateWarning] = useState(false);
  const [showFutureTimeWarning, setShowFutureTimeWarning] = useState(false);

  const todayStr = formatDateInput(new Date());
  const nowTimeStr = formatTimeInput(new Date());

  const handleTodayClick = () => {
    if (date && date !== todayStr) {
      setShowDateConfirm(true);
    } else {
      onDateChange(todayStr);
    }
  };

  const handleDateChange = (newDate) => {
    if (newDate > todayStr) {
      setShowFutureDateWarning(true);
    }
    onDateChange(newDate);
  };

  const handleTimeChange = (newTime) => {
    if (date === todayStr && newTime > nowTimeStr) {
      setShowFutureTimeWarning(true);
    }
    onTimeChange(newTime);
  };

  const handleNowClick = () => {
    const currentTime = formatTimeInput(new Date());
    onTimeChange(currentTime);
    setShowFutureTimeWarning(false);
  };

  const hours = (time || "00:00").split(":")[0];
  const minutes = (time || "00:00").split(":")[1] || "00";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Date */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Date</label>
        <div className="flex gap-2">
          <input
            type="date"
            className="flex-1 rounded-xl border border-slate-300 px-3 py-3"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            required
          />
          <button
            type="button"
            className="rounded-xl bg-slate-700 text-white px-3 py-3 text-sm font-medium hover:bg-slate-600 shadow-sm"
            onClick={handleTodayClick}
          >
            Today
          </button>
        </div>

        {/* Today confirmation */}
        {showDateConfirm && (
          <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
            <p className="font-medium text-amber-800">Change date to today?</p>
            <p className="text-amber-700 mt-1">You previously selected a different date. Are you sure this incident occurred today?</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
                onClick={() => { onDateChange(todayStr); setShowDateConfirm(false); }}
              >
                Yes, use today
              </button>
              <button
                type="button"
                className="rounded-lg border border-amber-300 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100"
                onClick={() => setShowDateConfirm(false)}
              >
                Keep previous date
              </button>
            </div>
          </div>
        )}

        {/* Future date warning */}
        {showFutureDateWarning && (
          <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm">
            <p className="font-medium text-rose-800">Future date selected</p>
            <p className="text-rose-700 mt-1">The date you selected is in the future. Did you intend to do this?</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700"
                onClick={() => setShowFutureDateWarning(false)}
              >
                Yes, keep this date
              </button>
              <button
                type="button"
                className="rounded-lg border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100"
                onClick={() => { onDateChange(todayStr); setShowFutureDateWarning(false); }}
              >
                Use today instead
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Time */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Time (CST)</label>
        <div className="flex items-center gap-2">
          <select
            className="w-24 rounded-xl border border-slate-300 px-3 py-3"
            value={hours}
            onChange={(e) => handleTimeChange(`${e.target.value}:${minutes}`)}
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={String(h).padStart(2, "0")}>{String(h).padStart(2, "0")}</option>
            ))}
          </select>
          <span className="text-slate-500">:</span>
          <select
            className="w-24 rounded-xl border border-slate-300 px-3 py-3"
            value={minutes}
            onChange={(e) => handleTimeChange(`${hours}:${e.target.value}`)}
          >
            {Array.from({ length: 60 }, (_, m) => (
              <option key={m} value={String(m).padStart(2, "0")}>{String(m).padStart(2, "0")}</option>
            ))}
          </select>
          <button
            type="button"
            className="rounded-xl bg-slate-700 text-white px-3 py-3 text-sm font-medium hover:bg-slate-600 shadow-sm"
            onClick={handleNowClick}
          >
            Now
          </button>
        </div>

        {/* Future time warning */}
        {showFutureTimeWarning && (
          <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm">
            <p className="font-medium text-rose-800">Future time selected</p>
            <p className="text-rose-700 mt-1">The time you selected is in the future. Did you intend to do this?</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700"
                onClick={() => setShowFutureTimeWarning(false)}
              >
                Yes, keep this time
              </button>
              <button
                type="button"
                className="rounded-lg border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100"
                onClick={() => { handleNowClick(); setShowFutureTimeWarning(false); }}
              >
                Use current time
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}