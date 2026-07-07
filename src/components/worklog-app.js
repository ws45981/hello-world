"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient, isSupabaseConfigured, signInWithEmail, signOut, getCurrentUser, getUserProfile } from "@/lib/supabase";
import { CATEGORIES, CUSTOM_TEMPLATE_CATEGORIES, ROLES, GENERAL_USER_RESTRICTED_CATEGORIES } from "@/lib/constants";
import LoginForm from "@/components/auth/LoginForm";
import IncidentForm from "@/components/forms/IncidentForm";
import PHIForm from "@/components/forms/PHIForm";
import LateForShiftForm from "@/components/forms/LateForShiftForm";
import NoCallNoShowForm from "@/components/forms/NoCallNoShowForm";
import RequestToLeaveForm from "@/components/forms/RequestToLeaveForm";

export default function WorkLogApp() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [viewMode, setViewMode] = useState("form");
  const [editingData, setEditingData] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [categories, setCategories] = useState(CATEGORIES);
  const [activeCategory, setActiveCategory] = useState("");
  const [personnel, setPersonnel] = useState([]);

  // Load user session on mount
  useEffect(() => {
    const loadSession = async () => {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        const userProfile = await getUserProfile(currentUser.id);
        setUser(currentUser);
        setProfile(userProfile);
        await loadRecords(userProfile);
        await loadPersonnel();
      }
      setLoading(false);
    };
    loadSession();
  }, []);

  // Make personnel available globally for PersonnelSelector
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__EMS_PERSONNEL__ = personnel;
    }
  }, [personnel]);

  const loadRecords = async (userProfile) => {
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) return;

    let query = supabase
      .from("incident_entries")
      .select("*")
      .order("created_at", { ascending: false });

    // General users and leadership only see their own records
    if (userProfile?.role !== ROLES.MASTER_ADMIN) {
      query = query.eq("employee_id", userProfile?.id);
    }

    const { data, error } = await query;
    if (!error && data) {
      setRecords(data.map((entry) => ({ ...entry, witnesses: entry.witnesses ?? [] })));
    }
  };

  const loadPersonnel = async () => {
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) return;
    const { data } = await supabase
      .from("personnel")
      .select("*")
      .order("preferred_name", { ascending: true });
    if (data) setPersonnel(data);
  };

  const handleLogin = async (authUser) => {
    const userProfile = await getUserProfile(authUser.id);
    setUser(authUser);
    setProfile(userProfile);
    await loadRecords(userProfile);
    await loadPersonnel();
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setProfile(null);
    setRecords([]);
    setViewMode("form");
    setMessage("");
    setError("");
  };

  const getAvailableCategories = () => {
    if (!profile) return [];
    if (profile.role === ROLES.MASTER_ADMIN) return categories;
    if (profile.role === ROLES.LEADERSHIP) {
      const excluded = profile.excluded_categories || [];
      return categories.filter((c) => !excluded.includes(c));
    }
    // General user - restricted categories hidden by default
    const excluded = [...GENERAL_USER_RESTRICTED_CATEGORIES, ...(profile.excluded_categories || [])];
    return categories.filter((c) => !excluded.includes(c));
  };

  const handleSubmit = async (formData) => {
    setError("");
    setMessage("");
    if (!user || !profile) return;

    const payload = {
      id: editingData?.id ?? `entry-${Date.now()}`,
      employee_id: profile.id,
      employee_name: profile.full_name,
      date: formData.date,
      time: formData.time,
      category: formData.category,
      category_description: formData.categoryDescription || null,
      description: formData.description || null,
      involved_parties: formData.involvedPartiesNA ? [] : formData.involvedParties,
      witnesses: formData.witnessesNA ? [] : formData.witnesses,
      additional_details: formData.additionalDetailsNA ? "N/A" : formData.additionalDetails,
      attachments: formData.attachments || [],
      phi_requested: formData.phiRequested || null,
      communication_method: formData.communicationMethod || null,
      other_communication_method: formData.otherCommunicationMethod || null,
      information_provided: formData.informationProvided || null,
      scheduled_time: formData.scheduledTime || null,
      arrival_time: formData.arrivalTime || null,
      no_reason_provided: formData.noReasonProvided || false,
      stated_reason: formData.statedReason || null,
      communication_received: formData.communicationReceived ?? null,
      communication_details: formData.communicationDetails || null,
      scheduled_until: formData.scheduledUntil || null,
      request_granted: formData.requestGranted ?? null,
      denial_reason: formData.denialReason || null,
      status: "active",
      created_at: editingData ? editingData.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      const { error: supabaseError } = editingData
        ? await supabase.from("incident_entries").update(payload).eq("id", editingData.id)
        : await supabase.from("incident_entries").insert(payload);

      if (supabaseError) {
        setError(supabaseError.message);
        return;
      }
    }

    if (editingData) {
      setRecords((current) => current.map((r) => r.id === editingData.id ? { ...r, ...payload } : r));
      setMessage("Entry updated successfully.");
      setEditingData(null);
    } else {
      setRecords((current) => [payload, ...current]);
      setMessage("Your entry was recorded successfully.");
      setViewMode("confirmation");
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);

    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) {
      setUploading(false);
      setMessage("File noted locally — Supabase not configured.");
      return;
    }

    const filePath = `${profile.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("incident-attachments")
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("incident-attachments")
      .getPublicUrl(filePath);

    setUploading(false);
    setMessage("Attachment uploaded.");
    return publicUrlData.publicUrl;
  };

  const startEdit = (entry) => {
    setEditingData(entry);
    setActiveCategory(entry.category);
    setViewMode("form");
  };

  const deleteEntry = async (entryId) => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from("incident_entries")
        .update({ status: "deleted" })
        .eq("id", entryId);
      if (error) { setError(error.message); return; }
    }
    setRecords((current) => current.filter((r) => r.id !== entryId));
    setMessage("Entry deleted.");
  };

  const exportCsv = () => {
    const filtered = records.filter((r) => {
      const matchCat = selectedCategory === "All" || r.category === selectedCategory;
      const matchFrom = !dateFrom || r.date >= dateFrom;
      const matchTo = !dateTo || r.date <= dateTo;
      const matchEmp = !employeeFilter || r.employee_name?.toLowerCase().includes(employeeFilter.toLowerCase());
      return matchCat && matchFrom && matchTo && matchEmp;
    });

    const headers = ["id", "employee_name", "date", "time", "category", "description", "additional_details"];
    const csv = [headers.join(",")]
      .concat(filtered.map((row) =>
        headers.map((h) => `"${String(row[h] ?? "").replaceAll('"', '""')}"`).join(",")
      ))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "worklog-export.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const renderForm = () => {
    const cat = activeCategory || getAvailableCategories()[0] || "";
    const commonProps = {
      user,
      categories: getAvailableCategories(),
      onSubmit: handleSubmit,
      uploading,
      onFileUpload: handleFileUpload,
      editingData,
      onCancelEdit: () => { setEditingData(null); setViewMode("form"); },
    };

    if (cat === "PHI") return <PHIForm {...commonProps} />;
    if (cat === "Late for Shift") return <LateForShiftForm {...commonProps} />;
    if (cat === "No Call, No Show") return <NoCallNoShowForm {...commonProps} />;
    if (cat === "Request to Leave Early") return <RequestToLeaveForm {...commonProps} />;
    return <IncidentForm {...commonProps} category={cat} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      {/* Header */}
      <header className="bg-slate-900 text-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              EMS / Safety Incident Documentation
            </p>
            <h1 className="text-2xl font-semibold">WorkLog</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-white/10 px-3 py-2 text-sm">
              👤 {profile?.full_name || user.email}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${
              profile?.role === ROLES.MASTER_ADMIN ? "bg-emerald-600" :
              profile?.role === ROLES.LEADERSHIP ? "bg-blue-600" : "bg-slate-600"
            }`}>
              {profile?.role === ROLES.MASTER_ADMIN ? "Master Admin" :
               profile?.role === ROLES.LEADERSHIP ? "Leadership" : "General User"}
            </span>
            <button
              className="rounded-full border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex gap-1 py-2">
            <button
              onClick={() => setViewMode("form")}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${viewMode === "form" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              New Submission
            </button>
            <button
              onClick={() => setViewMode("entries")}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${viewMode === "entries" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              My Submissions
            </button>
            {profile?.role === ROLES.MASTER_ADMIN && (
              <>
                <button
                  onClick={() => setViewMode("admin")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${viewMode === "admin" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  All Submissions
                </button>
                <button
                  onClick={() => setViewMode("categories")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${viewMode === "categories" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  Categories
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-6">
        {message && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Confirmation */}
        {viewMode === "confirmation" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Submission complete</p>
                <h2 className="text-2xl font-semibold">Your entry was recorded.</h2>
              </div>
              <div className="flex gap-3">
                <button
                  className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white"
                  onClick={() => { setViewMode("form"); setActiveCategory(""); }}
                >
                  New Submission
                </button>
                <button
                  className="rounded-xl border border-slate-300 px-5 py-3 font-semibold"
                  onClick={() => setViewMode("entries")}
                >
                  View My Submissions
                </button>
              </div>
            </div>
          </section>
        )}

        {/* New Submission Form */}
        {viewMode === "form" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <p className="text-sm font-medium text-slate-500">New incident</p>
              <h2 className="text-2xl font-semibold">Incident Documentation</h2>
            </div>

            {/* Category Selector */}
            {!editingData && (
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-slate-700">Select Category</label>
                <select
                  className="w-full rounded-xl border border-slate-300 px-3 py-3"
                  value={activeCategory}
                  onChange={(e) => setActiveCategory(e.target.value)}
                >
                  <option value="">— Select a category —</option>
                  {getAvailableCategories().map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            )}

            {activeCategory && renderForm()}
          </section>
        )}

        {/* My Submissions */}
        {viewMode === "entries" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Your history</p>
                <h2 className="text-2xl font-semibold">My Submissions</h2>
              </div>
            </div>
            <div className="space-y-3">
              {records.filter((r) => r.employee_id === profile?.id && r.status !== "deleted").length === 0 && (
                <p className="text-sm text-slate-500">No submissions yet.</p>
              )}
              {records
                .filter((r) => r.employee_id === profile?.id && r.status !== "deleted")
                .map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{entry.category}</p>
                        <p className="text-sm text-slate-500">{entry.date} at {entry.time}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="rounded-full bg-slate-100 px-3 py-1 text-sm"
                          onClick={() => setSelectedEntry(entry)}
                        >
                          View
                        </button>
                        <button
                          className="rounded-full bg-slate-100 px-3 py-1 text-sm"
                          onClick={() => startEdit(entry)}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-full bg-rose-50 px-3 py-1 text-sm text-rose-600"
                          onClick={() => deleteEntry(entry.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {entry.description && (
                      <p className="mt-2 text-sm text-slate-600 line-clamp-2">{entry.description}</p>
                    )}
                  </div>
                ))}
            </div>

            {selectedEntry && (
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Entry Details</h3>
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
                  {selectedEntry.description && (
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-slate-500">Description</p>
                      <p className="whitespace-pre-wrap">{selectedEntry.description}</p>
                    </div>
                  )}
                  {selectedEntry.additional_details && (
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-slate-500">Additional Details</p>
                      <p className="whitespace-pre-wrap">{selectedEntry.additional_details}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Admin - All Submissions */}
        {viewMode === "admin" && profile?.role === ROLES.MASTER_ADMIN && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Administrative view</p>
                <h2 className="text-2xl font-semibold">All Submissions</h2>
              </div>
              <button
                className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white"
                onClick={exportCsv}
              >
                Export CSV
              </button>
            </div>

            <div className="mb-4 grid gap-3 md:grid-cols-4">
              <select
                className="rounded-xl border border-slate-300 px-3 py-2"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="All">All categories</option>
                {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <input
                className="rounded-xl border border-slate-300 px-3 py-2"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="From date"
              />
              <input
                className="rounded-xl border border-slate-300 px-3 py-2"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="To date"
              />
              <input
                className="rounded-xl border border-slate-300 px-3 py-2"
                placeholder="Search by name"
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Employee</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records
                    .filter((r) => {
                      const matchCat = selectedCategory === "All" || r.category === selectedCategory;
                      const matchFrom = !dateFrom || r.date >= dateFrom;
                      const matchTo = !dateTo || r.date <= dateTo;
                      const matchEmp = !employeeFilter || r.employee_name?.toLowerCase().includes(employeeFilter.toLowerCase());
                      return matchCat && matchFrom && matchTo && matchEmp;
                    })
                    .map((record) => (
                      <tr key={record.id} className={`border-t border-slate-200 ${record.status === "deleted" ? "bg-rose-50" : ""}`}>
                        <td className="px-3 py-3">{record.employee_name}</td>
                        <td className="px-3 py-3">{record.date}</td>
                        <td className="px-3 py-3">{record.category}</td>
                        <td className="px-3 py-3 max-w-xs truncate">{record.description}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                            record.status === "deleted" ? "bg-rose-100 text-rose-700" :
                            record.status === "archived" ? "bg-amber-100 text-amber-700" :
                            "bg-emerald-100 text-emerald-700"
                          }`}>
                            {record.status || "active"}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2">
                            <button
                              className="rounded-full bg-slate-100 px-3 py-1 text-xs"
                              onClick={() => setSelectedEntry(record)}
                            >
                              View
                            </button>
                            <button
                              className="rounded-full bg-rose-50 px-3 py-1 text-xs text-rose-600"
                              onClick={() => deleteEntry(record.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {selectedEntry && (
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Entry Details</h3>
                  <button className="text-sm text-slate-500" onClick={() => setSelectedEntry(null)}>Close</button>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Employee</p>
                    <p>{selectedEntry.employee_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Category</p>
                    <p>{selectedEntry.category}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Date / Time</p>
                    <p>{selectedEntry.date} • {selectedEntry.time}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Status</p>
                    <p>{selectedEntry.status || "active"}</p>
                  </div>
                  {selectedEntry.description && (
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-slate-500">Description</p>
                      <p className="whitespace-pre-wrap">{selectedEntry.description}</p>
                    </div>
                  )}
                  {selectedEntry.phi_requested && (
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-slate-500">PHI Requested</p>
                      <p className="whitespace-pre-wrap">{selectedEntry.phi_requested}</p>
                    </div>
                  )}
                  {selectedEntry.communication_method && (
                    <div>
                      <p className="text-sm font-medium text-slate-500">Communication Method</p>
                      <p>{selectedEntry.communication_method}</p>
                    </div>
                  )}
                  {selectedEntry.information_provided && (
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-slate-500">Information Provided</p>
                      <p className="whitespace-pre-wrap">{selectedEntry.information_provided}</p>
                    </div>
                  )}
                  {selectedEntry.scheduled_time && (
                    <div>
                      <p className="text-sm font-medium text-slate-500">Scheduled Time</p>
                      <p>{selectedEntry.scheduled_time}</p>
                    </div>
                  )}
                  {selectedEntry.arrival_time && (
                    <div>
                      <p className="text-sm font-medium text-slate-500">Arrival Time</p>
                      <p>{selectedEntry.arrival_time}</p>
                    </div>
                  )}
                  {selectedEntry.stated_reason && (
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-slate-500">Stated Reason</p>
                      <p>{selectedEntry.stated_reason}</p>
                    </div>
                  )}
                  {selectedEntry.scheduled_until && (
                    <div>
                      <p className="text-sm font-medium text-slate-500">Scheduled Until</p>
                      <p>{selectedEntry.scheduled_until}</p>
                    </div>
                  )}
                  {selectedEntry.request_granted !== null && selectedEntry.request_granted !== undefined && (
                    <div>
                      <p className="text-sm font-medium text-slate-500">Request Granted</p>
                      <p>{selectedEntry.request_granted ? "Yes" : "No"}</p>
                    </div>
                  )}
                  {selectedEntry.denial_reason && (
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-slate-500">Denial Reason</p>
                      <p>{selectedEntry.denial_reason}</p>
                    </div>
                  )}
                  {selectedEntry.additional_details && (
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-slate-500">Additional Details</p>
                      <p className="whitespace-pre-wrap">{selectedEntry.additional_details}</p>
                    </div>
                  )}
                  {selectedEntry.involved_parties?.length > 0 && (
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-slate-500">Involved Parties</p>
                      <ul className="mt-1 space-y-1">
                        {selectedEntry.involved_parties.map((p, i) => (
                          <li key={i} className="text-sm">{p.name}{p.role ? ` — ${p.role}` : ""}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedEntry.witnesses?.length > 0 && (
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-slate-500">Witnesses</p>
                      <ul className="mt-1 space-y-1">
                        {selectedEntry.witnesses.map((w, i) => (
                          <li key={i} className="text-sm">{w.name}{w.role ? ` — ${w.role}` : ""}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedEntry.attachments?.length > 0 && (
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-slate-500">Attachments</p>
                      <ul className="mt-1 space-y-1">
                        {selectedEntry.attachments.map((a, i) => (
                          <li key={i} className="text-sm">📎 <a href={a} target="_blank" rel="noreferrer" className="text-blue-600 underline">{a}</a></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Categories Management */}
        {viewMode === "categories" && profile?.role === ROLES.MASTER_ADMIN && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <p className="text-sm font-medium text-slate-500">Administrative</p>
              <h2 className="text-2xl font-semibold">Manage Categories</h2>
            </div>
            <div className="space-y-2">
              {categories.map((cat, index) => (
                <div key={cat} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3">
                  <input
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={cat}
                    onChange={(e) => {
                      const next = [...categories];
                      next[index] = e.target.value;
                      setCategories(next);
                    }}
                  />
                  <button
                    className="rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                    onClick={() => setCategories(categories.filter((_, i) => i !== index))}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              onClick={() => setCategories([...categories, "New Category"])}
            >
              + Add Category
            </button>
          </section>
        )}
      </main>
    </div>
  );
}