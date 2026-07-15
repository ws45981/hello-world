"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { CATEGORIES, ROLES, GENERAL_USER_RESTRICTED_CATEGORIES } from "@/lib/constants";

const ROLE_OPTIONS = [
  { value: ROLES.GENERAL_USER, label: "General User" },
  { value: ROLES.LEADERSHIP, label: "Leadership" },
  { value: ROLES.MASTER_ADMIN, label: "Master Admin" },
];

// General Users never see these, regardless of what is stored against them, so
// the checkboxes are shown locked rather than editable. Mirrors
// getAvailableCategories() in worklog-app.js.
const isDefaultRestricted = (role, category) =>
  role === ROLES.GENERAL_USER && GENERAL_USER_RESTRICTED_CATEGORIES.includes(category);

const sameCategories = (a = [], b = []) =>
  a.length === b.length && a.every((c) => b.includes(c));

const draftFrom = (list) =>
  Object.fromEntries(
    list.map((u) => [u.id, { role: u.role, excluded: u.excluded_categories || [] }]),
  );

export default function UserManagement({ currentUserId }) {
  const [users, setUsers] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [savedId, setSavedId] = useState(null);
  const [rowErrors, setRowErrors] = useState({});

  // `loading` starts true, so this only ever settles it — no setState runs
  // synchronously while the effect body is executing.
  useEffect(() => {
    let cancelled = false;

    const loadUsers = async () => {
      const supabase = getSupabaseClient();
      const configured = isSupabaseConfigured() && supabase;

      const { data, error } = configured
        ? await supabase
            .from("user_profiles")
            .select("id, full_name, email, role, excluded_categories")
            .order("full_name", { ascending: true })
        : { data: null, error: { message: "Supabase is not configured, so users cannot be loaded." } };

      if (cancelled) return;

      if (error) {
        setLoadError(error.message);
      } else {
        setUsers(data || []);
        setDrafts(draftFrom(data || []));
      }
      setLoading(false);
    };

    loadUsers();
    return () => { cancelled = true; };
  }, []);

  const updateDraft = (id, patch) =>
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  // Checkboxes read as "can see this category", but the column stores the
  // inverse, so ticking a box removes it from excluded_categories.
  const toggleCategory = (id, category) => {
    const excluded = drafts[id].excluded;
    updateDraft(id, {
      excluded: excluded.includes(category)
        ? excluded.filter((c) => c !== category)
        : [...excluded, category],
    });
  };

  const isDirty = (user) => {
    const draft = drafts[user.id];
    if (!draft) return false;
    return (
      draft.role !== user.role ||
      !sameCategories(draft.excluded, user.excluded_categories || [])
    );
  };

  const saveUser = async (user) => {
    const draft = drafts[user.id];
    setSavingId(user.id);
    setSavedId(null);
    setRowErrors((e) => ({ ...e, [user.id]: "" }));

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("user_profiles")
      .update({ role: draft.role, excluded_categories: draft.excluded })
      .eq("id", user.id)
      .select("id");

    setSavingId(null);

    if (error) {
      setRowErrors((e) => ({ ...e, [user.id]: error.message }));
      return;
    }
    // An update blocked by row-level security succeeds with zero rows touched,
    // so an empty result here means nothing was written.
    if (!data || data.length === 0) {
      setRowErrors((e) => ({
        ...e,
        [user.id]:
          "No changes were saved — the database rejected the update. Check that the Master Admin update policy is in place.",
      }));
      return;
    }

    setUsers((list) =>
      list.map((u) =>
        u.id === user.id
          ? { ...u, role: draft.role, excluded_categories: draft.excluded }
          : u,
      ),
    );
    setSavedId(user.id);
    setTimeout(() => setSavedId((cur) => (cur === user.id ? null : cur)), 4000);
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading users...</p>;
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        🚫 {loadError}
      </div>
    );
  }

  if (users.length === 0) {
    return <p className="text-sm text-slate-500">No users found.</p>;
  }

  return (
    <div className="space-y-4">
      {users.map((user) => {
        const draft = drafts[user.id];
        const isSelf = user.id === currentUserId;
        const seesEverything = draft.role === ROLES.MASTER_ADMIN;
        const dirty = isDirty(user);

        return (
          <div key={user.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">
                  {user.full_name}
                  {isSelf && <span className="ml-2 text-xs text-slate-400">(you)</span>}
                </p>
                <p className="text-sm text-slate-500">{user.email || "— no email on file —"}</p>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600">Role</label>
                <select
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                  value={draft.role}
                  disabled={isSelf}
                  onChange={(e) => updateDraft(user.id, { role: e.target.value })}
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {isSelf && (
              <p className="mt-2 text-xs text-slate-400">
                You cannot change your own role — this prevents locking yourself out of this screen.
              </p>
            )}

            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-slate-700">Visible Categories</p>
              {seesEverything ? (
                <p className="text-sm text-slate-500">
                  Master Admins can see every category, so per-user restrictions do not apply.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {CATEGORIES.map((category) => {
                    const locked = isDefaultRestricted(draft.role, category);
                    const checked = !locked && !draft.excluded.includes(category);
                    return (
                      <label
                        key={category}
                        className={`flex items-center gap-2 text-sm ${
                          locked ? "text-slate-400" : "text-slate-700 cursor-pointer"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={locked}
                          onChange={() => toggleCategory(user.id, category)}
                        />
                        {category}
                        {locked && <span className="text-xs">(restricted by default)</span>}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {rowErrors[user.id] && (
              <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                🚫 {rowErrors[user.id]}
              </p>
            )}

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:bg-slate-300"
                disabled={!dirty || savingId === user.id}
                onClick={() => saveUser(user)}
              >
                {savingId === user.id ? "Saving..." : "Save"}
              </button>
              {savedId === user.id && (
                <span className="text-sm font-medium text-emerald-600">
                  ✓ Changes saved for {user.full_name}.
                </span>
              )}
              {dirty && savedId !== user.id && (
                <span className="text-sm text-slate-400">Unsaved changes</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
