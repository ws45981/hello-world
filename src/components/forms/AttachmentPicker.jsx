"use client";

import { useRef, useState } from "react";
import AttachmentLink from "@/components/AttachmentLink";
import { normalizeAttachment } from "@/lib/supabase";

const DOCUMENT_ACCEPT = "image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt";
const IMAGE_ACCEPT = "image/*";

// Reading navigator during render is safe here: the app renders the login form
// until a session loads client-side, so no form is ever server-rendered and
// there is no markup to mismatch on hydration.
const isMobileDevice = () =>
  typeof navigator !== "undefined" &&
  /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function AttachmentPicker({ attachments = [], onFileUpload, onAdd, onUpdate, onRemove }) {
  const cameraInput = useRef(null);
  const libraryInput = useRef(null);
  const fileInput = useRef(null);

  const [queue, setQueue] = useState([]);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const mobile = isMobileDevice();

  const handleFiles = async (fileList, inputEl) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    setError("");
    setQueue(files.map((f) => ({ name: f.name, size: f.size })));
    setBusy(true);

    const urls = (await onFileUpload(files)) || [];

    setBusy(false);
    setQueue([]);
    // Reset the input so picking the same file again still fires a change event.
    if (inputEl) inputEl.value = "";

    if (urls.length > 0) onAdd(urls);
    if (urls.length < files.length) {
      setError(`${files.length - urls.length} of ${files.length} file(s) failed to upload.`);
    }
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">Attachments</label>

      {/* Hidden inputs driven by the buttons and drop zone below. */}
      <input
        ref={cameraInput}
        type="file"
        accept={IMAGE_ACCEPT}
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files, e.target)}
      />
      <input
        ref={libraryInput}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files, e.target)}
      />
      <input
        ref={fileInput}
        type="file"
        accept={DOCUMENT_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files, e.target)}
      />

      {mobile ? (
        <div className="grid gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => cameraInput.current?.click()}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            📷 Take Photo
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => libraryInput.current?.click()}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            🖼️ Choose from Library
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            📎 Attach File
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files, null);
          }}
          className={`rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
            dragging ? "border-slate-900 bg-slate-100" : "border-slate-300 bg-slate-50"
          }`}
        >
          <p className="text-sm text-slate-600">
            {busy ? "Uploading..." : "Drag and drop files here"}
          </p>
          <p className="mt-1 text-xs text-slate-400">You can drop more than one file at a time</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
            className="mt-3 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Browse Files
          </button>
        </div>
      )}

      {/* Sits directly below the buttons / drop zone and clears itself when the
          upload resolves, since `busy` is only true for the duration of the
          await. Matters most on mobile, where uploads are slow enough that
          submitting early looks like a finished form. */}
      {busy && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
          ⏳ Upload in progress — please wait before submitting or adding another attachment.
        </p>
      )}

      {/* Files picked but not yet uploaded. */}
      {queue.length > 0 && (
        <ul className="mt-3 space-y-1">
          {queue.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <span className="truncate text-slate-700">{f.name}</span>
              <span className="ml-3 shrink-0 text-xs text-slate-400">
                {formatBytes(f.size)} {busy ? "• uploading..." : "• queued"}
              </span>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          🚫 {error}
        </p>
      )}

      {attachments.length > 0 && (
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          {attachments.map((value, i) => {
            const att = normalizeAttachment(value);
            return (
              <li
                key={`${att.url}-${i}`}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <AttachmentLink
                    value={att}
                    className="text-slate-700 underline hover:text-slate-900"
                  />
                  {onRemove && (
                    <button
                      type="button"
                      className="shrink-0 text-xs text-rose-600 hover:underline"
                      onClick={() => onRemove(i)}
                    >
                      Remove
                    </button>
                  )}
                </div>
                {onUpdate && (
                  <input
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900"
                    placeholder="Add a label or description for this file (optional)"
                    value={att.label}
                    onChange={(e) => onUpdate(i, { label: e.target.value })}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
