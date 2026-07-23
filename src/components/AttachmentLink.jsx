"use client";

import { useEffect, useState } from "react";
import { createAttachmentSignedUrl, attachmentDisplayName, toAttachmentPath } from "@/lib/supabase";

// Renders one attachment as a real link backed by a freshly signed URL.
//
// The URL is minted on mount rather than on click: signing is async, and calling
// window.open() after an await loses the user-activation context and gets caught
// by popup blockers. Signing up front keeps this an ordinary anchor, so
// right-click, open-in-new-tab and download all behave normally.
export default function AttachmentLink({ value, className = "" }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState("");

  // Key on the resolved path, not the value: an attachment object gets a fresh
  // identity on every parent render and would otherwise re-sign endlessly.
  const path = toAttachmentPath(value);

  useEffect(() => {
    let cancelled = false;

    const sign = async () => {
      const { url: signed, error: signError } = await createAttachmentSignedUrl(value);
      if (cancelled) return;
      if (signed) setUrl(signed);
      else setError(signError || "unavailable");
    };

    sign();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  const name = attachmentDisplayName(value);

  if (error) {
    return (
      <span className="text-slate-400">
        📎 {name} <span className="text-xs text-rose-600">({error})</span>
      </span>
    );
  }

  if (!url) {
    return (
      <span className="text-slate-400">
        📎 {name} <span className="text-xs">(loading...)</span>
      </span>
    );
  }

  return (
    <span>
      📎{" "}
      <a href={url} target="_blank" rel="noreferrer" className={className}>
        {name}
      </a>
    </span>
  );
}
