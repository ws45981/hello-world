"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

const DEFAULT_CATEGORY_OPTIONS = [
  "Other",
  "PHI",
  "Safety",
  "Status Quo",
  "Rude/Bullying/Intimidation",
  "Rule Violation",
  "Late for Shift",
  "No Call, No Show",
  "Request to Leave Early",
  "General Policy Violation",
  "Missing/Expiring Item",
  "Supply Need",
  "Reminder",
];

const defaultUser = {
  id: "emp-1024",
  name: "Jordan Lee",
  phone: "5551234567",
  pin: "4567",
  role: "user",
};

const adminUser = {
  id: "admin-1",
  username: "admin",
  password: "admin123",
  role: "admin",
};

const formatDateInput = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
};

const formatTimeInput = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString("en-CA", {
    hour12: false,
    timeZone: "America/Chicago",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const makeEmptyForm = () => ({
  date: formatDateInput(new Date()),
  time: formatTimeInput(new Date()),
  category: DEFAULT_CATEGORY_OPTIONS[1],
  categoryDescription: "",
  description: "",
  involvedParties: "",
  involvedPartiesNA: false,
  witnesses: [""],
  additionalDetails: "",
  additionalDetailsNA: false,
  attachments: [],
});

const nowInCST = () => new Date();

const getInitialRecords = () => [
  {
    id: "demo-1",
    employee_id: defaultUser.id,
    employee_name: defaultUser.name,
    date: formatDateInput(new Date()),
    time: formatTimeInput(new Date()),
    category: "PHI",
    description: "Medication handoff discrepancy documented during shift change.",
    involved_parties: "Nurse Patel and patient family",
    witnesses: ["Chris Morales"],
    additional_details: "Follow-up requested with supervisor.",
    attachments: [],
    created_at: new Date().toISOString(),
  },
];

export default function WorkLogApp() {
  const [authMode, setAuthMode] = useState("user");
  const [user, setUser] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }
    const storedUser = localStorage.getItem("worklog-user");
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [admin, setAdmin] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }
    const storedAdmin = localStorage.getItem("worklog-admin");
    return storedAdmin ? JSON.parse(storedAdmin) : null;
  });
  const [pin, setPin] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [needsPinSetup, setNeedsPinSetup] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [form, setForm] = useState(makeEmptyForm);
  const [records, setRecords] = useState(getInitialRecords);
  const [editingId, setEditingId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState("form");
  const [categories, setCategories] = useState(() => {
    if (typeof window === "undefined") {
      return DEFAULT_CATEGORY_OPTIONS;
    }
    const storedCategories = localStorage.getItem("worklog-categories");
    return storedCategories ? JSON.parse(storedCategories) : DEFAULT_CATEGORY_OPTIONS;
  });
  const [userEntryFilterCategory, setUserEntryFilterCategory] = useState("All");
  const [userEntryFilterDate, setUserEntryFilterDate] = useState("");
  const [userEntrySortOrder, setUserEntrySortOrder] = useState("desc");
  const [categoryDraft, setCategoryDraft] = useState("");
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [categoryStatus, setCategoryStatus] = useState("");
  const [categoryDirty, setCategoryDirty] = useState(false);
  const [categorySyncState, setCategorySyncState] = useState("idle");
  const [categoryLastSavedAt, setCategoryLastSavedAt] = useState("");
  const [draggedCategoryIndex, setDraggedCategoryIndex] = useState(null);

  useEffect(() => {
    const loadRemoteEntries = async () => {
      const supabase = getSupabaseClient();
      if (!isSupabaseConfigured() || !supabase) {
        return;
      }

      const { data, error } = await supabase
        .from("incident_entries")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data?.length) {
        setRecords(data.map((entry) => ({ ...entry, witnesses: entry.witnesses ?? [] })));
      }
    };

    const loadRemoteCategories = async () => {
      const supabase = getSupabaseClient();
      if (!isSupabaseConfigured() || !supabase) {
        return;
      }

      const { data, error } = await supabase
        .from("incident_categories")
        .select("name, sort_order")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (!error && data?.length) {
        const nextCategories = data.map((item) => item.name).filter(Boolean);
        if (nextCategories.length) {
          setCategories(nextCategories);
        }
        setCategorySyncState("synced");
        setCategoryLastSavedAt("loaded from Supabase");
      }
    };

    void loadRemoteEntries();
    void loadRemoteCategories();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("worklog-categories", JSON.stringify(categories));
    }
  }, [categories]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesCategory = selectedCategory === "All" || record.category === selectedCategory;
      const matchesFrom = !dateFrom || record.date >= dateFrom;
      const matchesTo = !dateTo || record.date <= dateTo;
      const matchesEmployee = !employeeFilter || record.employee_id.toLowerCase().includes(employeeFilter.toLowerCase());
      return matchesCategory && matchesFrom && matchesTo && matchesEmployee;
    });
  }, [records, selectedCategory, dateFrom, dateTo, employeeFilter]);

  const userEntries = useMemo(() => {
    if (!user) {
      return [];
    }

    return records
      .filter((record) => record.employee_id === user.id)
      .filter((record) => {
        const matchesCategory = userEntryFilterCategory === "All" || record.category === userEntryFilterCategory;
        const matchesDate = !userEntryFilterDate || record.date === userEntryFilterDate;
        return matchesCategory && matchesDate;
      })
      .sort((left, right) => {
        const leftTime = new Date(left.created_at ?? 0).getTime();
        const rightTime = new Date(right.created_at ?? 0).getTime();
        return userEntrySortOrder === "asc" ? leftTime - rightTime : rightTime - leftTime;
      });
  }, [records, user, userEntryFilterCategory, userEntryFilterDate, userEntrySortOrder]);

  const recentUserEntries = useMemo(() => {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);
    return userEntries.filter((entry) => new Date(entry.created_at ?? 0) >= cutoff);
  }, [userEntries]);

  const handleLogin = (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (authMode === "admin") {
      if (username === adminUser.username && password === adminUser.password) {
        const adminSession = { ...adminUser, name: "Admin" };
        setAdmin(adminSession);
        if (typeof window !== "undefined") {
          localStorage.setItem("worklog-admin", JSON.stringify(adminSession));
        }
        setViewMode("form");
        return;
      }
      setError("Invalid admin credentials.");
      return;
    }

    const normalizedPin = pin.trim();
    if (normalizedPin !== defaultUser.pin) {
      setError("PIN is incorrect.");
      return;
    }

    const userSession = { ...defaultUser, pin: defaultUser.pin };
    setUser(userSession);
    setNeedsPinSetup(true);
    setViewMode("form");
    if (typeof window !== "undefined") {
      localStorage.setItem("worklog-user", JSON.stringify(userSession));
    }
  };

  const handlePinSetup = (event) => {
    event.preventDefault();
    if (newPin.length !== 4 || confirmPin.length !== 4) {
      setError("PIN must be exactly 4 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      setError("PINs do not match.");
      return;
    }
    const updatedUser = { ...user, pin: newPin };
    setUser(updatedUser);
    setNeedsPinSetup(false);
    setNewPin("");
    setConfirmPin("");
    setMessage("PIN updated successfully.");
    if (typeof window !== "undefined") {
      localStorage.setItem("worklog-user", JSON.stringify(updatedUser));
    }
  };

  const handleLogout = () => {
    setUser(null);
    setAdmin(null);
    setPin("");
    setUsername("");
    setPassword("");
    setNeedsPinSetup(false);
    setShowAccountMenu(false);
    setError("");
    setMessage("");
    setViewMode("form");
    if (typeof window !== "undefined") {
      localStorage.removeItem("worklog-user");
      localStorage.removeItem("worklog-admin");
    }
  };

  const handleChangePin = (event) => {
    event.preventDefault();
    if (newPin.length !== 4 || confirmPin.length !== 4) {
      setError("PIN must be exactly 4 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      setError("PINs do not match.");
      return;
    }
    const updatedUser = { ...user, pin: newPin };
    setUser(updatedUser);
    setNewPin("");
    setConfirmPin("");
    setShowAccountMenu(false);
    setMessage("PIN changed successfully.");
    if (typeof window !== "undefined") {
      localStorage.setItem("worklog-user", JSON.stringify(updatedUser));
    }
  };

  const resetPin = (targetUserId) => {
    const nextUser = { ...defaultUser, id: targetUserId, pin: defaultUser.pin };
    setUser((current) => current && current.id === targetUserId ? nextUser : current);
    setMessage(`PIN reset to ${defaultUser.pin} for ${targetUserId}.`);
    if (typeof window !== "undefined") {
      localStorage.setItem("worklog-user", JSON.stringify(nextUser));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!user) {
      setError("Please sign in first.");
      return;
    }

    const selectedCategoryValue = categories.includes(form.category) ? form.category : categories[0] || "Other";
    const payload = {
      id: editingId ?? `entry-${Date.now()}`,
      employee_id: user.id,
      employee_name: user.name,
      date: form.date,
      time: form.time,
      category: selectedCategoryValue,
      category_description: selectedCategoryValue === "Other" ? form.categoryDescription : null,
      description: form.description,
      involved_parties: form.involvedPartiesNA ? "N/A" : form.involvedParties,
      witnesses: form.witnesses.filter(Boolean),
      additional_details: form.additionalDetailsNA ? "N/A" : form.additionalDetails,
      attachments: form.attachments,
      created_at: new Date().toISOString(),
    };

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      const { error: supabaseError } = editingId
        ? await supabase.from("incident_entries").update(payload).eq("id", editingId)
        : await supabase.from("incident_entries").insert(payload);

      if (supabaseError) {
        setError(supabaseError.message);
        return;
      }
    }

    if (editingId) {
      setRecords((current) => current.map((record) => (record.id === editingId ? { ...record, ...payload } : record)));
      setMessage("Entry updated.");
      setEditingId(null);
      setForm({ ...makeEmptyForm(), category: categories[0] || "Other" });
      setViewMode("form");
      return;
    }

    setRecords((current) => [payload, ...current]);
    setForm({ ...makeEmptyForm(), category: categories[0] || "Other" });
    setEditingId(null);
    setViewMode("confirmation");
    setMessage("Your entry was recorded.");
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !user) {
      return;
    }

    setUploading(true);
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) {
      setForm((current) => ({ ...current, attachments: [file.name] }));
      setUploading(false);
      setMessage("Supabase is not configured yet. File name saved locally for now.");
      return;
    }

    const bucket = "incident-attachments";
    const filePath = `${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, {
      upsert: false,
    });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    setForm((current) => ({
      ...current,
      attachments: [...current.attachments, publicUrlData.publicUrl],
    }));
    setUploading(false);
    setMessage("Attachment uploaded.");
  };

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setViewMode("form");
    setForm({
      date: entry.date,
      time: entry.time,
      category: entry.category,
      categoryDescription: entry.category_description ?? "",
      description: entry.description,
      involvedParties: entry.involved_parties === "N/A" ? "" : entry.involved_parties,
      involvedPartiesNA: entry.involved_parties === "N/A",
      witnesses: entry.witnesses?.length ? entry.witnesses : [""],
      additionalDetails: entry.additional_details === "N/A" ? "" : entry.additional_details,
      additionalDetailsNA: entry.additional_details === "N/A",
      attachments: entry.attachments ?? [],
    });
  };

  const deleteEntry = async (entryId) => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from("incident_entries").delete().eq("id", entryId);
      if (error) {
        setError(error.message);
        return;
      }
    }

    setRecords((current) => current.filter((record) => record.id !== entryId));
    setMessage("Entry deleted.");
  };

  const syncCategoriesToSupabase = async (nextCategories) => {
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) {
      setCategorySyncState("local");
      setCategoryLastSavedAt("");
      setCategoryStatus("Changes saved locally. Supabase is not configured yet.");
      return false;
    }

    setCategorySyncState("saving");
    setCategoryStatus("Saving category list...");

    const cleanedCategories = nextCategories.filter(Boolean);
    const { error: deleteError } = await supabase.from("incident_categories").delete().neq("id", "");
    if (deleteError) {
      setCategorySyncState("error");
      setCategoryStatus(deleteError.message);
      return false;
    }

    const rows = cleanedCategories.map((name, index) => ({ name, sort_order: index + 1 }));
    const { error: insertError } = await supabase.from("incident_categories").insert(rows);
    if (insertError) {
      setCategorySyncState("error");
      setCategoryStatus(insertError.message);
      return false;
    }

    const savedAt = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    setCategorySyncState("synced");
    setCategoryLastSavedAt(savedAt);
    setCategoryStatus(`Category list synced with Supabase at ${savedAt}.`);
    return true;
  };

  const saveAllCategories = async () => {
    if (!categoryDirty) {
      setCategoryStatus("No pending category changes.");
      return;
    }

    const success = await syncCategoriesToSupabase(categories);
    if (success) {
      setCategoryDirty(false);
    }
  };

  const addCategory = () => {
    const nextCategory = categoryDraft.trim();
    if (!nextCategory || categories.includes(nextCategory)) {
      setCategoryDraft("");
      setCategoryStatus(nextCategory ? "That category already exists." : "Enter a category name first.");
      return;
    }
    const nextCategories = [...categories, nextCategory];
    setCategories(nextCategories);
    setCategoryDraft("");
    setForm((current) => ({ ...current, category: nextCategory }));
    setCategoryDirty(true);
    setCategoryStatus("Category added locally. Save all changes to sync with Supabase.");
  };

  const updateCategory = (index, value) => {
    const nextCategories = categories.map((category, categoryIndex) => (categoryIndex === index ? value : category));
    setCategories(nextCategories);
    setCategoryDirty(true);
    setCategoryStatus("Category updated locally. Save all changes to sync with Supabase.");
  };

  const removeCategory = (category) => {
    const nextCategories = categories.filter((item) => item !== category);
    if (!nextCategories.length) {
      setCategoryStatus("At least one category is required.");
      return;
    }
    setCategories(nextCategories);
    if (form.category === category) {
      setForm((current) => ({ ...current, category: nextCategories[0] }));
    }
    setCategoryDirty(true);
    setCategoryStatus("Category removed locally. Save all changes to sync with Supabase.");
  };

  const reorderCategories = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) {
      return;
    }

    const nextCategories = [...categories];
    const [movedCategory] = nextCategories.splice(fromIndex, 1);
    nextCategories.splice(toIndex, 0, movedCategory);
    setCategories(nextCategories);
    setCategoryDirty(true);
    setCategoryStatus("Category order updated locally. Save all changes to sync with Supabase.");
  };

  const handleCategoryDrop = (targetIndex) => {
    if (draggedCategoryIndex === null) {
      return;
    }
    reorderCategories(draggedCategoryIndex, targetIndex);
    setDraggedCategoryIndex(null);
  };

  const exportCsv = () => {
    const rows = filteredRecords.map((record) => ({
      id: record.id,
      employee_id: record.employee_id,
      employee_name: record.employee_name,
      date: record.date,
      time: record.time,
      category: record.category,
      description: record.description,
      involved_parties: record.involved_parties,
      witnesses: record.witnesses.join(" | "),
      additional_details: record.additional_details,
    }));

    const headers = ["id", "employee_id", "employee_name", "date", "time", "category", "description", "involved_parties", "witnesses", "additional_details"];
    const csv = [headers.join(",")].concat(rows.map((row) => headers.map((header) => `"${String(row[header] ?? "").replaceAll('"', '""')}"`).join(","))).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "worklog-export.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="bg-slate-900 text-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">EMS / Safety Incident Documentation</p>
            <h1 className="text-2xl font-semibold">WorkLog</h1>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <button className="rounded-full bg-white/10 px-3 py-2 text-sm" onClick={() => setShowAccountMenu((current) => !current)}>
                  👤 {user.name}
                </button>
                {showAccountMenu && (
                  <div className="absolute right-4 top-16 z-10 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-xl">
                    <form onSubmit={handleChangePin} className="space-y-2">
                      <input
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="New PIN"
                        value={newPin}
                        onChange={(event) => setNewPin(event.target.value.replace(/\D/g, ""))}
                      />
                      <input
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="Confirm PIN"
                        value={confirmPin}
                        onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ""))}
                      />
                      <button className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white" type="submit">Change PIN</button>
                    </form>
                  </div>
                )}
              </>
            ) : null}
            {admin ? (
              <span className="rounded-full bg-emerald-600 px-3 py-2 text-sm">Admin</span>
            ) : null}
            {(user || admin) ? (
              <button className="rounded-full border border-white/20 px-3 py-2 text-sm" onClick={handleLogout}>Logout</button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
        {!user && !admin ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Secure incident documentation</p>
                <h2 className="text-2xl font-semibold">Sign in to continue</h2>
              </div>
              <div className="flex rounded-full bg-slate-100 p-1">
                <button className={`rounded-full px-4 py-2 text-sm ${authMode === "user" ? "bg-white shadow-sm" : "text-slate-500"}`} onClick={() => setAuthMode("user")}>Employee</button>
                <button className={`rounded-full px-4 py-2 text-sm ${authMode === "admin" ? "bg-white shadow-sm" : "text-slate-500"}`} onClick={() => setAuthMode("admin")}>Admin</button>
              </div>
            </div>

            {authMode === "user" ? (
              <form onSubmit={handleLogin} className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <label className="mb-2 block text-sm font-medium">4-digit PIN</label>
                  <input
                    className="w-full rounded-xl border border-slate-300 px-3 py-3 text-lg"
                    inputMode="numeric"
                    maxLength={4}
                    value={pin}
                    onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
                    placeholder="Enter PIN"
                  />
                </div>
                <button className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white" type="submit">Sign in</button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <div>
                  <label className="mb-2 block text-sm font-medium">Username</label>
                  <input className="w-full rounded-xl border border-slate-300 px-3 py-3" value={username} onChange={(event) => setUsername(event.target.value)} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Password</label>
                  <input className="w-full rounded-xl border border-slate-300 px-3 py-3" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
                </div>
                <button className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white" type="submit">Admin login</button>
              </form>
            )}

            {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
            {message ? <p className="mt-4 text-sm text-emerald-600">{message}</p> : null}
            <p className="mt-4 text-sm text-slate-500">Demo employee PIN: 4567. Admin credentials: admin / admin123.</p>
          </section>
        ) : null}

        {user && needsPinSetup ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Set your custom PIN</h2>
            <p className="mt-2 text-sm text-slate-600">Your default PIN is the last 4 digits of your phone number. Choose a new one before continuing.</p>
            <form onSubmit={handlePinSetup} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <input className="rounded-xl border border-slate-300 px-3 py-3" inputMode="numeric" maxLength={4} placeholder="New PIN" value={newPin} onChange={(event) => setNewPin(event.target.value.replace(/\D/g, ""))} />
              <input className="rounded-xl border border-slate-300 px-3 py-3" inputMode="numeric" maxLength={4} placeholder="Confirm PIN" value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ""))} />
              <button className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white" type="submit">Save PIN</button>
            </form>
          </section>
        ) : null}

        {user && !needsPinSetup ? (
          <>
            {viewMode === "confirmation" ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Submission complete</p>
                    <h2 className="text-2xl font-semibold">Your entry was recorded.</h2>
                  </div>
                  <button className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white" onClick={() => setViewMode("entries")}>View All Entries</button>
                </div>
                <p className="mt-4 text-sm text-slate-600">Your incident has been stored and is ready to review in your submission history.</p>
              </section>
            ) : null}

            {viewMode === "entries" ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Your history</p>
                    <h2 className="text-2xl font-semibold">Your submitted entries</h2>
                  </div>
                  <button className="rounded-xl border border-slate-300 px-4 py-2" onClick={() => setViewMode("form")}>Back to form</button>
                </div>

                <div className="mb-4 grid gap-3 md:grid-cols-3">
                  <select className="rounded-xl border border-slate-300 px-3 py-2" value={userEntryFilterCategory} onChange={(event) => setUserEntryFilterCategory(event.target.value)}>
                    <option value="All">All categories</option>
                    {categories.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                  <input className="rounded-xl border border-slate-300 px-3 py-2" type="date" value={userEntryFilterDate} onChange={(event) => setUserEntryFilterDate(event.target.value)} />
                  <select className="rounded-xl border border-slate-300 px-3 py-2" value={userEntrySortOrder} onChange={(event) => setUserEntrySortOrder(event.target.value)}>
                    <option value="desc">Newest first</option>
                    <option value="asc">Oldest first</option>
                  </select>
                </div>

                <div className="space-y-3">
                  {userEntries.length ? userEntries.map((entry) => (
                    <div key={entry.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">{entry.category}</p>
                          <p className="text-sm text-slate-500">{entry.date} at {entry.time}</p>
                        </div>
                        <div className="flex gap-2">
                          <button className="rounded-full bg-slate-100 px-3 py-1 text-sm" onClick={() => setSelectedEntry(entry)}>View details</button>
                          <button className="rounded-full bg-slate-100 px-3 py-1 text-sm" onClick={() => startEdit(entry)}>Edit</button>
                          <button className="rounded-full bg-rose-50 px-3 py-1 text-sm text-rose-600" onClick={() => deleteEntry(entry.id)}>Delete</button>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-slate-600">{entry.description}</p>
                    </div>
                  )) : <p className="text-sm text-slate-500">No entries match the current filters.</p>}
                </div>

                {selectedEntry ? (
                  <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-lg font-semibold">Entry details</h3>
                      <button className="text-sm text-slate-500" onClick={() => setSelectedEntry(null)}>Close</button>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-sm font-medium text-slate-500">Category</p>
                        <p>{selectedEntry.category}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500">Date / Time</p>
                        <p>{selectedEntry.date} • {selectedEntry.time}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm font-medium text-slate-500">Description</p>
                        <p className="whitespace-pre-wrap">{selectedEntry.description}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm font-medium text-slate-500">Additional details</p>
                        <p className="whitespace-pre-wrap">{selectedEntry.additional_details || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            {viewMode === "form" ? (
              <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">New incident</p>
                      <h2 className="text-2xl font-semibold">Incident documentation</h2>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">{user.name}</span>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium">Date</label>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            className="flex-1 rounded-xl border border-slate-300 px-3 py-3"
                            value={form.date}
                            onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                          />
                          <button type="button" className="rounded-xl border border-slate-300 px-3 py-3 text-sm" onClick={() => setForm((current) => ({ ...current, date: formatDateInput(nowInCST()) }))}>Now</button>
                        </div>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium">Time</label>
                        <div className="flex items-center gap-2">
                          <select
                            className="w-24 rounded-xl border border-slate-300 px-3 py-3"
                            value={(form.time || "00:00").split(":")[0]}
                            onChange={(event) => {
                              const minutes = (form.time || "00:00").split(":")[1] || "00";
                              setForm((current) => ({ ...current, time: `${event.target.value}:${minutes}` }));
                            }}
                          >
                            {Array.from({ length: 24 }, (_, hour) => (
                              <option key={hour} value={String(hour).padStart(2, "0")}>{String(hour).padStart(2, "0")}</option>
                            ))}
                          </select>
                          <span className="text-lg text-slate-500">:</span>
                          <select
                            className="w-24 rounded-xl border border-slate-300 px-3 py-3"
                            value={(form.time || "00:00").split(":")[1] || "00"}
                            onChange={(event) => {
                              const hours = (form.time || "00:00").split(":")[0] || "00";
                              setForm((current) => ({ ...current, time: `${hours}:${event.target.value}` }));
                            }}
                          >
                            {Array.from({ length: 60 }, (_, minute) => (
                              <option key={minute} value={String(minute).padStart(2, "0")}>{String(minute).padStart(2, "0")}</option>
                            ))}
                          </select>
                          <button type="button" className="rounded-xl border border-slate-300 px-3 py-3 text-sm" onClick={() => setForm((current) => ({ ...current, time: formatTimeInput(nowInCST()) }))}>Now</button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">Category</label>
                      <select className="w-full rounded-xl border border-slate-300 px-3 py-3" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
                        {categories.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>

                    {form.category === "Other" ? (
                      <div>
                        <label className="mb-2 block text-sm font-medium">Category Description</label>
                        <input className="w-full rounded-xl border border-slate-300 px-3 py-3" value={form.categoryDescription} onChange={(event) => setForm((current) => ({ ...current, categoryDescription: event.target.value }))} />
                      </div>
                    ) : null}

                    <div>
                      <label className="mb-2 block text-sm font-medium">Incident Description</label>
                      <textarea className="min-h-36 w-full rounded-xl border border-slate-300 px-3 py-3" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-sm font-medium">Involved Parties</label>
                        <label className="flex items-center gap-2 text-sm text-slate-500">
                          <input type="checkbox" checked={form.involvedPartiesNA} onChange={(event) => setForm((current) => ({ ...current, involvedPartiesNA: event.target.checked, involvedParties: event.target.checked ? "" : current.involvedParties }))} />
                          N/A
                        </label>
                      </div>
                      <input className={`w-full rounded-xl border border-slate-300 px-3 py-3 ${form.involvedPartiesNA ? "bg-slate-100 text-slate-400" : ""}`} placeholder="Who was involved in this incident?" value={form.involvedParties} onChange={(event) => setForm((current) => ({ ...current, involvedParties: event.target.value }))} disabled={form.involvedPartiesNA} />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">Witnesses</label>
                      <div className="space-y-2">
                        {form.witnesses.map((witness, index) => (
                          <div key={index} className="flex gap-2">
                            <input className="flex-1 rounded-xl border border-slate-300 px-3 py-3" value={witness} onChange={(event) => {
                              const next = [...form.witnesses];
                              next[index] = event.target.value;
                              setForm((current) => ({ ...current, witnesses: next }));
                            }} placeholder={`Witness ${index + 1}`} />
                          </div>
                        ))}
                      </div>
                      <button type="button" className="mt-3 rounded-full border border-slate-300 px-3 py-2 text-sm" onClick={() => setForm((current) => ({ ...current, witnesses: [...current.witnesses, ""] }))}>+ Add witness</button>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-sm font-medium">Additional Details</label>
                        <label className="flex items-center gap-2 text-sm text-slate-500">
                          <input type="checkbox" checked={form.additionalDetailsNA} onChange={(event) => setForm((current) => ({ ...current, additionalDetailsNA: event.target.checked, additionalDetails: event.target.checked ? "" : current.additionalDetails }))} />
                          N/A
                        </label>
                      </div>
                      <textarea className={`min-h-28 w-full rounded-xl border border-slate-300 px-3 py-3 ${form.additionalDetailsNA ? "bg-slate-100 text-slate-400" : ""}`} value={form.additionalDetails} onChange={(event) => setForm((current) => ({ ...current, additionalDetails: event.target.value }))} disabled={form.additionalDetailsNA} />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">Attachments</label>
                      <input type="file" className="w-full rounded-xl border border-slate-300 px-3 py-3" onChange={handleFileUpload} />
                      {uploading ? <p className="mt-2 text-sm text-slate-500">Uploading…</p> : null}
                      {form.attachments.length ? <ul className="mt-2 text-sm text-slate-600">{form.attachments.map((attachment, index) => <li key={index}>{attachment}</li>)}</ul> : null}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white" type="submit">{editingId ? "Update entry" : "Submit incident"}</button>
                      {editingId ? <button type="button" className="rounded-xl border border-slate-300 px-5 py-3" onClick={() => { setEditingId(null); setForm(makeEmptyForm()); }}>Cancel</button> : null}
                    </div>
                  </form>
                </div>

                <aside className="space-y-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-xl font-semibold">Your submissions</h3>
                    <div className="mt-4 space-y-3">
                      {userEntries.slice(0, 3).map((entry) => (
                        <div key={entry.id} className="rounded-xl border border-slate-200 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium">{entry.category}</p>
                            <span className="text-xs text-slate-500">{entry.date}</span>
                          </div>
                          <p className="mt-2 text-sm text-slate-600">{entry.description}</p>
                          <div className="mt-3 flex gap-2">
                            <button className="rounded-full bg-slate-100 px-3 py-1 text-sm" onClick={() => startEdit(entry)}>Edit</button>
                            <button className="rounded-full bg-rose-50 px-3 py-1 text-sm text-rose-600" onClick={() => deleteEntry(entry.id)}>Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 rounded-xl bg-slate-50 p-4">
                      <h4 className="font-medium">Recent submissions (24 hrs)</h4>
                      <div className="mt-2 space-y-2 text-sm text-slate-600">
                        {recentUserEntries.length ? recentUserEntries.map((entry) => <div key={entry.id}>{entry.category} • {entry.date}</div>) : <p>No recent submissions in the last 24 hours.</p>}
                      </div>
                      <button className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" onClick={() => setViewMode("entries")}>View All Entries</button>
                    </div>
                  </div>
                </aside>
              </section>
            ) : null}
          </>
        ) : null}

        {admin ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Administrative view</p>
                <h2 className="text-2xl font-semibold">All submissions</h2>
              </div>
              <button className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white" onClick={exportCsv}>Export CSV</button>
            </div>

            <div className="mb-4 grid gap-3 md:grid-cols-4">
              <select className="rounded-xl border border-slate-300 px-3 py-2" value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
                <option value="All">All categories</option>
                {categories.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <input className="rounded-xl border border-slate-300 px-3 py-2" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
              <input className="rounded-xl border border-slate-300 px-3 py-2" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
              <input className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Employee ID" value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)} />
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Category list</h3>
                  <p className="text-sm text-slate-500">Manage the categories available to employees.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${categorySyncState === "synced" ? "bg-emerald-100 text-emerald-700" : categorySyncState === "saving" ? "bg-amber-100 text-amber-700" : categorySyncState === "local" ? "bg-slate-100 text-slate-600" : "bg-rose-100 text-rose-700"}`}>
                    {categorySyncState === "synced" ? "Synced with Supabase" : categorySyncState === "saving" ? "Saving..." : categorySyncState === "local" ? "Saved locally" : "Not connected"}
                  </span>
                  {categoryLastSavedAt ? <span className="text-xs text-slate-500">Last saved {categoryLastSavedAt}</span> : null}
                </div>
              </div>
              {categoryStatus ? <p className={`mt-3 text-sm ${categorySyncState === "error" ? "text-rose-600" : "text-emerald-600"}`}>{categoryStatus}</p> : null}
              <div className="mt-4 space-y-2">
                {categories.map((category, index) => (
                  <div key={`${category}-${index}`} draggable onDragStart={() => setDraggedCategoryIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => handleCategoryDrop(index)} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2">
                    <button type="button" className="cursor-grab px-2 text-slate-400" aria-label={`Reorder ${category}`}>
                      ⋮⋮
                    </button>
                    <input className="flex-1 rounded-xl border border-slate-300 px-3 py-2" value={category} onChange={(event) => updateCategory(index, event.target.value)} />
                    <button type="button" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" onClick={() => removeCategory(category)}>Remove</button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <input className="flex-1 rounded-xl border border-slate-300 px-3 py-2" placeholder="Add new category" value={categoryDraft} onChange={(event) => setCategoryDraft(event.target.value)} />
                <button type="button" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" onClick={addCategory}>Add</button>
                <button type="button" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold" onClick={saveAllCategories} disabled={!categoryDirty || categorySyncState === "saving"}>
                  {categorySyncState === "saving" ? "Saving..." : "Save all changes"}
                </button>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Employee</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="border-t border-slate-200">
                      <td className="px-3 py-3">{record.employee_name} ({record.employee_id})</td>
                      <td className="px-3 py-3">{record.date}</td>
                      <td className="px-3 py-3">{record.category}</td>
                      <td className="px-3 py-3">{record.description}</td>
                      <td className="px-3 py-3">
                        <button className="rounded-full bg-slate-100 px-3 py-1 text-sm" onClick={() => resetPin(record.employee_id)}>Reset PIN</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
