"use client";

import React, { useEffect, useState } from "react";
import { getSupabaseClient, isSupabaseConfigured, signOut, getCurrentUser, getUserProfile, toAttachmentPath, ATTACHMENT_BUCKET } from "@/lib/supabase";
import AttachmentLink from "@/components/AttachmentLink";
import { CATEGORIES, ROLES, GENERAL_USER_RESTRICTED_CATEGORIES } from "@/lib/constants";
import LoginForm from "@/components/auth/LoginForm";
import IncidentForm from "@/components/forms/IncidentForm";
import PHIForm from "@/components/forms/PHIForm";
import LateForShiftForm from "@/components/forms/LateForShiftForm";
import NoCallNoShowForm from "@/components/forms/NoCallNoShowForm";
import RequestToLeaveForm from "@/components/forms/RequestToLeaveForm";
import SupplyNeedForm from "@/components/forms/SupplyNeedForm";
import MissingExpiringForm from "@/components/forms/MissingExpiringForm";
import QuestionsClarificationForm from "@/components/forms/QuestionsClarificationForm";
import ReminderForm from "@/components/forms/ReminderForm";
import { locationTextClass } from "@/components/forms/LocationSelector";
import UserManagement from "@/components/admin/UserManagement";

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
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  const [showDeletedSubmissions, setShowDeletedSubmissions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [selectedDeletedEntry, setSelectedDeletedEntry] = useState(null);
  const [groups, setGroups] = useState([]);
  const [groupEntries, setGroupEntries] = useState([]);
  const [groupingMode, setGroupingMode] = useState(false);
  const [selectedForGroup, setSelectedForGroup] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupForm, setGroupForm] = useState({ title: "", date: "", time: "" });
  const [addToGroupId, setAddToGroupId] = useState(null);
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState(null);
  // Reported inside the Create Group dialog. The page-level error banner renders
  // behind the modal overlay, so a failure there is invisible until it closes.
  const [groupError, setGroupError] = useState("");
  const [groupSaving, setGroupSaving] = useState(false);
  // Collapse state is intentionally per-session only, not persisted.
  const [collapsedGroups, setCollapsedGroups] = useState([]);
  const [editingNoteGroupId, setEditingNoteGroupId] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState("");

  const loadRecords = async (userProfile) => {
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) return;
    let query = supabase
      .from("incident_entries")
      .select("*")
      .order("created_at", { ascending: false });
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

  // Both tables are Master Admin-only at the RLS layer, so this returns empty
  // for everyone else rather than erroring.
  const loadGroups = async () => {
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) return;
    const { data: groupData } = await supabase
      .from("incident_groups")
      .select("*")
      .order("incident_date", { ascending: false });
    const { data: linkData } = await supabase
      .from("incident_group_entries")
      .select("*");
    if (groupData) setGroups(groupData);
    if (linkData) setGroupEntries(linkData);
  };

  // Declared after the loaders above so the effect does not reference them
  // before initialisation.
  useEffect(() => {
    const loadSession = async () => {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        const userProfile = await getUserProfile(currentUser.id);
        setUser(currentUser);
        setProfile(userProfile);
        if (!userProfile?.password_changed) {
          setForcePasswordChange(true);
        } else {
          await loadRecords(userProfile);
          await loadPersonnel();
          await loadGroups();
        }
      }
      setLoading(false);
    };
    loadSession();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__EMS_PERSONNEL__ = personnel;
    }
  }, [personnel]);

  const handleLogin = async (authUser) => {
    const userProfile = await getUserProfile(authUser.id);
    setUser(authUser);
    setProfile(userProfile);
    if (!userProfile?.password_changed) {
      setForcePasswordChange(true);
    } else {
      await loadRecords(userProfile);
      await loadPersonnel();
      await loadGroups();
    }
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setProfile(null);
    setRecords([]);
    setViewMode("form");
    setMessage("");
    setError("");
    setForcePasswordChange(false);
    setShowAccountMenu(false);
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");
    if (!newPassword || !confirmPassword) {
      setPasswordError("Please fill in both fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordError(error.message);
      return;
    }
    await supabase
      .from("user_profiles")
      .update({ password_changed: true })
      .eq("id", user.id);

    setPasswordSuccess("Password updated successfully!");
    setNewPassword("");
    setConfirmPassword("");
    setForcePasswordChange(false);
    await loadRecords(profile);
    await loadPersonnel();
    setTimeout(() => {
      setShowAccountMenu(false);
      setPasswordSuccess("");
    }, 2000);
  };

  const getAvailableCategories = () => {
    if (!profile) return [];
    if (profile.role === ROLES.MASTER_ADMIN) return categories;
    if (profile.role === ROLES.LEADERSHIP) {
      const excluded = profile.excluded_categories || [];
      return categories.filter((c) => !excluded.includes(c));
    }
    const excluded = [...GENERAL_USER_RESTRICTED_CATEGORIES, ...(profile.excluded_categories || [])];
    return categories.filter((c) => !excluded.includes(c));
  };

  const handleSubmit = async (formData) => {
    setError("");
    setMessage("");
    if (!user || !profile) return;

    // The disabled Submit button covers the click, but pressing Enter in a
    // single-line field submits the form regardless. Every form routes through
    // here, so this is the one place that actually closes the gap: submitting
    // mid-upload would save the entry without the attachment, which for an
    // incident record is a silent loss of evidence.
    if (uploading) {
      setError("Please wait for the attachment upload to finish before submitting.");
      return;
    }

    const standardCategories = ["General Comments", "General Policy Violation", "Safety", "Status Quo", "Rude/Bullying/Intimidation", "Rule Violation", "Questions/Clarification", "Reminder", "Other"];
    if (standardCategories.includes(formData.category || activeCategory)) {
      if (!formData.description?.trim()) {
        setError("Incident Description is required.");
        return;
      }
    }

    if ((formData.category || activeCategory) === "PHI") {
      if (!formData.phiRequested?.trim()) {
        setError("Specific PHI Requested is required.");
        return;
      }
    }

    const payload = {
      id: formData._editingId || editingData?.id || formData.id || `entry-${Date.now()}`,
      employee_id: profile.id,
      employee_name: profile.full_name,
      date: formData.date,
      time: formData.time,
      category: formData.category || activeCategory,
      category_description: formData.categoryDescription || null,
      description: formData.description || null,
      involved_parties: formData.involvedPartiesNA ? [] : (formData.involvedParties || []),
      witnesses: formData.witnessesNA ? [] : (formData.witnesses || []),
      additional_details: formData.additionalDetailsNA ? "N/A" : (formData.additionalDetails || null),
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
      location: formData.location || null,
      storage_type: formData.storageType || null,
      storage_location: formData.storageLocation || null,
      item_replaced: formData.itemReplaced ?? null,
      replacement_storage_type: formData.replacementStorageType || null,
      replacement_storage_location: formData.replacementStorageLocation || null,
      departure_time: formData.departureTime || null,
      status: "active",
      created_at: editingData ? editingData.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      const editId = formData._editingId || editingData?.id;
      let supabaseError;
      if (editId) {
        const result = await supabase.from("incident_entries").update(payload).eq("id", editId);
        supabaseError = result.error;
      } else {
        const result = await supabase.from("incident_entries").insert(payload);
        supabaseError = result.error;
      }
      if (supabaseError) {
        setError(supabaseError.message);
        return;
      }
    }

    const editId = formData._editingId || editingData?.id;
    if (editId) {
      setRecords((current) => current.map((r) => r.id === editId ? { ...r, ...payload } : r));
      setEditingData(null);
      setActiveCategory("");
      window.location.reload();
    } else {
      setRecords((current) => [payload, ...current]);
      setMessage("Your entry was recorded successfully.");
      setViewMode("confirmation");
    }

  };

  // Takes a list of File objects and resolves to the object paths that uploaded
  // cleanly. A failure on one file is reported but does not abandon the rest, so
  // the returned array can be shorter than the input.
  //
  // Paths are stored, never URLs: the bucket is private, and the signed URLs that
  // replace public ones expire — persisting one would leave a dead link an hour
  // later. AttachmentLink signs a fresh URL whenever an attachment is displayed.
  const handleFileUpload = async (files) => {
    const list = Array.from(files || []);
    if (list.length === 0 || !user) return [];

    setUploading(true);
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) {
      setUploading(false);
      setMessage("File noted locally — Supabase not configured.");
      return [];
    }

    const stamp = Date.now();
    const paths = [];
    const failures = [];

    for (let i = 0; i < list.length; i += 1) {
      const file = list[i];
      // The leading profile.id is load-bearing: the storage policies scope access
      // by the first folder segment. The index keeps paths distinct, since files
      // picked together would otherwise share a millisecond, collide, and fail
      // against upsert: false.
      const filePath = `${profile.id}/${stamp}-${i}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .upload(filePath, file, { upsert: false });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        failures.push(`${file.name}: ${uploadError.message}`);
        continue;
      }

      paths.push(filePath);
    }

    setUploading(false);

    if (failures.length > 0) {
      setError(`Upload failed — ${failures.join("; ")}`);
    }
    if (paths.length > 0) {
      setMessage(`${paths.length} attachment${paths.length === 1 ? "" : "s"} uploaded successfully.`);
    }

    return paths;
  };

  const startEdit = (entry) => {
    const safeEntry = {
      ...entry,
      // Map database column names to form field names
      phiRequested: entry.phi_requested || "",
      communicationMethod: entry.communication_method || "",
      otherCommunicationMethod: entry.other_communication_method || "",
      informationProvided: entry.information_provided || "",
      scheduledTime: entry.scheduled_time || "",
      arrivalTime: entry.arrival_time || "",
      noReasonProvided: entry.no_reason_provided || false,
      statedReason: entry.stated_reason || "",
      communicationReceived: entry.communication_received ?? null,
      communicationDetails: entry.communication_details || "",
      scheduledUntil: entry.scheduled_until || "",
      requestGranted: entry.request_granted ?? null,
      denialReason: entry.denial_reason || "",
      departureTime: entry.departure_time || "",
      categoryDescription: entry.category_description || "",
      additionalDetails: entry.additional_details === "N/A" ? "" : (entry.additional_details || ""),
      additionalDetailsNA: entry.additional_details === "N/A",
      involvedPartiesNA: !entry.involved_parties || entry.involved_parties?.length === 0,
      witnessesNA: !entry.witnesses || entry.witnesses?.length === 0,
      involvedParties: Array.isArray(entry.involved_parties)
        ? entry.involved_parties
        : typeof entry.involved_parties === "string"
        ? JSON.parse(entry.involved_parties || "[]")
        : [],
      witnesses: Array.isArray(entry.witnesses)
        ? entry.witnesses
        : typeof entry.witnesses === "string"
        ? JSON.parse(entry.witnesses || "[]")
        : [],
      attachments: Array.isArray(entry.attachments)
        ? entry.attachments
        : typeof entry.attachments === "string"
        ? JSON.parse(entry.attachments || "[]")
        : [],
      storageType: entry.storage_type || "",
      storageLocation: entry.storage_location || "",
      itemReplaced: entry.item_replaced ?? null,
      replacementStorageType: entry.replacement_storage_type || "",
      replacementStorageLocation: entry.replacement_storage_location || "",
    };
    setEditingData(safeEntry);
    setActiveCategory(entry.category);
    setViewMode("form");
  };

  const deleteEntry = (entry) => {
    setShowDeleteConfirm(entry);
  };

  const confirmDelete = async (deleteAttachments) => {
    const entry = showDeleteConfirm;
    if (!entry) return;
    setShowDeleteConfirm(null);

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      // Delete attachments from storage if requested
      if (deleteAttachments && entry.attachments?.length > 0) {
        for (const value of entry.attachments) {
          try {
            // Handles both the stored path and the legacy full public URL.
            const path = toAttachmentPath(value);
            if (path) {
              await supabase.storage.from(ATTACHMENT_BUCKET).remove([path]);
            }
          } catch (e) {
            console.error("Error deleting attachment:", e);
          }
        }
        // Update record with empty attachments
        await supabase
          .from("incident_entries")
          .update({ status: "deleted", attachments: [] })
          .eq("id", entry.id);
      } else {
        await supabase
          .from("incident_entries")
          .update({ status: "deleted" })
          .eq("id", entry.id);
      }
    }

    setRecords((current) => current.map((r) => 
      r.id === entry.id 
        ? { ...r, status: "deleted", attachments: deleteAttachments ? [] : r.attachments }
        : r
    ));
    setMessage("Entry moved to Deleted Submissions.");
  };

  const permanentlyDelete = async (entryId) => {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from("incident_entries")
        .update({ permanently_deleted: true })
        .eq("id", entryId);
      if (error) { setError(error.message); return; }
    }
    setRecords((current) => current.filter((r) => r.id !== entryId));
    setMessage("Entry permanently deleted.");
  };

  const toggleReviewed = async (entry) => {
    const supabase = getSupabaseClient();
    const newReviewed = !entry.reviewed;
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from("incident_entries")
        .update({ 
          reviewed: newReviewed,
          reviewed_at: newReviewed ? new Date().toISOString() : null,
          reviewed_by: newReviewed ? profile.full_name : null
        })
        .eq("id", entry.id);
      if (error) { setError(error.message); return; }
    }
    setRecords((current) => current.map((r) => 
      r.id === entry.id 
        ? { ...r, reviewed: newReviewed, reviewed_at: newReviewed ? new Date().toISOString() : null, reviewed_by: newReviewed ? profile.full_name : null }
        : r
    ));
    setMessage(newReviewed ? "Entry marked as reviewed." : "Review flag removed.");
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

  const entryIdsInGroup = (groupId) =>
    groupEntries.filter((ge) => ge.group_id === groupId).map((ge) => ge.entry_id);

  const exitGroupingMode = () => {
    setGroupingMode(false);
    setSelectedForGroup([]);
    setAddToGroupId(null);
  };

  const toggleSelectForGroup = (entryId) =>
    setSelectedForGroup((current) =>
      current.includes(entryId)
        ? current.filter((id) => id !== entryId)
        : [...current, entryId],
    );

  const startAddToGroup = (groupId) => {
    setGroupingMode(true);
    setAddToGroupId(groupId);
    setSelectedForGroup([]);
  };

  const createGroup = async () => {
    setGroupError("");
    if (!groupForm.title.trim()) {
      setGroupError("Group title is required.");
      return;
    }
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) {
      setGroupError("Supabase is not configured, so the group cannot be saved.");
      return;
    }

    setGroupSaving(true);

    const { data: group, error: insertError } = await supabase
      .from("incident_groups")
      .insert({
        title: groupForm.title.trim(),
        incident_date: groupForm.date || null,
        incident_time: groupForm.time || null,
        created_by: profile.id,
      })
      .select()
      .single();

    if (insertError) {
      setGroupSaving(false);
      setGroupError(insertError.message);
      return;
    }

    const { data: links, error: linkError } = await supabase
      .from("incident_group_entries")
      .insert(selectedForGroup.map((entryId) => ({ group_id: group.id, entry_id: entryId })))
      .select();

    if (linkError) {
      // The group row already landed. Leaving it would strand an empty group
      // that was never asked for, so undo it before reporting.
      await supabase.from("incident_groups").delete().eq("id", group.id);
      setGroupSaving(false);
      setGroupError(`Could not add submissions to the group: ${linkError.message}`);
      return;
    }

    setGroups((current) => [group, ...current]);
    setGroupEntries((current) => [...current, ...(links || [])]);
    setGroupSaving(false);
    setShowCreateGroup(false);
    setGroupForm({ title: "", date: "", time: "" });
    exitGroupingMode();
    setMessage(`Group "${group.title}" created with ${links?.length || 0} submission(s).`);
  };

  const addSelectedToGroup = async () => {
    setError("");
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) return;

    // Existing members are already excluded in the UI, but filtering again keeps
    // the unique (group_id, entry_id) constraint from rejecting the whole batch.
    const existing = entryIdsInGroup(addToGroupId);
    const toAdd = selectedForGroup.filter((id) => !existing.includes(id));
    if (toAdd.length === 0) {
      exitGroupingMode();
      return;
    }

    const { data: links, error: linkError } = await supabase
      .from("incident_group_entries")
      .insert(toAdd.map((entryId) => ({ group_id: addToGroupId, entry_id: entryId })))
      .select();

    if (linkError) {
      setError(linkError.message);
      return;
    }

    setGroupEntries((current) => [...current, ...(links || [])]);
    setMessage(`Added ${links?.length || 0} submission(s) to the group.`);
    exitGroupingMode();
  };

  const removeFromGroup = async (groupId, entryId) => {
    setError("");
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) return;

    const { error: removeError } = await supabase
      .from("incident_group_entries")
      .delete()
      .eq("group_id", groupId)
      .eq("entry_id", entryId);

    if (removeError) {
      setError(removeError.message);
      return;
    }

    setGroupEntries((current) =>
      current.filter((ge) => !(ge.group_id === groupId && ge.entry_id === entryId)),
    );
    setMessage("Submission removed from the group.");
  };

  // Deletes only the group and its membership rows. incident_entries is never
  // touched, so every submission survives and reappears as ungrouped.
  const confirmDeleteGroup = async () => {
    const group = deleteGroupConfirm;
    if (!group) return;
    setDeleteGroupConfirm(null);
    setError("");

    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) return;

    const { error: deleteError } = await supabase
      .from("incident_groups")
      .delete()
      .eq("id", group.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setGroups((current) => current.filter((g) => g.id !== group.id));
    setGroupEntries((current) => current.filter((ge) => ge.group_id !== group.id));
    setMessage(`Group "${group.title}" deleted. Its submissions were kept.`);
  };

  const toggleGroupCollapsed = (groupId) =>
    setCollapsedGroups((current) =>
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId],
    );

  const startEditNote = (group) => {
    setEditingNoteGroupId(group.id);
    setNoteDraft(group.notes || "");
    setNoteError("");
  };

  const saveGroupNote = async (groupId) => {
    setNoteError("");
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) {
      setNoteError("Supabase is not configured, so the note cannot be saved.");
      return;
    }

    setNoteSaving(true);
    const trimmed = noteDraft.trim();
    const { data, error: noteSaveError } = await supabase
      .from("incident_groups")
      .update({ notes: trimmed || null })
      .eq("id", groupId)
      .select("id");

    setNoteSaving(false);

    if (noteSaveError) {
      setNoteError(noteSaveError.message);
      return;
    }
    // An update blocked by row-level security reports success with zero rows
    // touched, so an empty result means nothing was written.
    if (!data || data.length === 0) {
      setNoteError("Nothing was saved — the database rejected the update.");
      return;
    }

    setGroups((current) =>
      current.map((g) => (g.id === groupId ? { ...g, notes: trimmed || null } : g)),
    );
    setEditingNoteGroupId(null);
    setMessage("Group note saved.");
  };

  const matchesAdminFilters = (r) => {
    if (r.status === "deleted" || r.permanently_deleted) return false;
    const matchCat = selectedCategory === "All" || r.category === selectedCategory;
    const matchFrom = !dateFrom || r.date >= dateFrom;
    const matchTo = !dateTo || r.date <= dateTo;
    const matchEmp = !employeeFilter || r.employee_name?.toLowerCase().includes(employeeFilter.toLowerCase());
    return matchCat && matchFrom && matchTo && matchEmp;
  };

  const visibleAdminRecords = records.filter(matchesAdminFilters);
  const groupedEntryIds = new Set(groupEntries.map((ge) => ge.entry_id));
  const ungroupedAdminRecords = visibleAdminRecords.filter((r) => !groupedEntryIds.has(r.id));
  const adminColSpan = groupingMode ? 7 : 6;

  // Shared by the grouped and ungrouped sections. `group` is null for ungrouped
  // rows; when set, the row is indented, tinted, and offered a remove action.
  const renderAdminRow = (record, group) => {
    const isSelected = selectedEntry?.id === record.id;
    const alreadyInTargetGroup =
      addToGroupId !== null && entryIdsInGroup(addToGroupId).includes(record.id);
    const checked = selectedForGroup.includes(record.id) || alreadyInTargetGroup;

    return (
      // A submission can sit in several groups, so the key must include the
      // group to stay unique across those repeats.
      <React.Fragment key={`${group ? group.id : "ungrouped"}-${record.id}`}>
        <tr className={`border-t border-slate-200 ${group ? "bg-indigo-50/40" : ""}`}>
          {groupingMode && (
            <td className="px-3 py-3">
              <input
                type="checkbox"
                checked={checked}
                disabled={alreadyInTargetGroup}
                onChange={() => toggleSelectForGroup(record.id)}
              />
            </td>
          )}
          <td className={`px-3 py-3 ${group ? "pl-8" : ""}`}>{record.employee_name}</td>
          <td className="px-3 py-3">{record.date}</td>
          <td className="px-3 py-3">{record.category}</td>
          <td className="px-3 py-3 max-w-xs truncate">{record.description}</td>
          <td className="px-3 py-3">
            <div className="flex flex-col gap-1">
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                record.status === "deleted" ? "bg-rose-100 text-rose-700" :
                record.status === "archived" ? "bg-amber-100 text-amber-700" :
                "bg-emerald-100 text-emerald-700"
              }`}>
                {record.status || "active"}
              </span>
              {record.reviewed && (
                <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                  ✓ Reviewed
                </span>
              )}
            </div>
          </td>
          <td className="px-3 py-3">
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-full bg-slate-100 px-3 py-1 text-xs"
                onClick={() => setSelectedEntry(isSelected ? null : record)}
              >
                {isSelected ? "Close" : "View"}
              </button>
              <button
                className={`rounded-full px-3 py-1 text-xs ${record.reviewed ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}
                onClick={() => toggleReviewed(record)}
              >
                {record.reviewed ? "✓ Reviewed" : "Mark Reviewed"}
              </button>
              {group && (
                <button
                  className="rounded-full bg-indigo-100 px-3 py-1 text-xs text-indigo-700"
                  onClick={() => removeFromGroup(group.id, record.id)}
                >
                  Remove from Group
                </button>
              )}
              <button
                className="rounded-full bg-rose-50 px-3 py-1 text-xs text-rose-600"
                onClick={() => deleteEntry(record)}
              >
                Delete
              </button>
            </div>
          </td>
        </tr>
        {isSelected && (
          <tr>
            <td colSpan={adminColSpan} className="px-4 py-4 bg-slate-50 border-t border-slate-200">
              {renderEntryDetail(record)}
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  const renderForm = () => {
    const cat = activeCategory || getAvailableCategories()[0] || "";
    const commonProps = {
      user,
      categories: getAvailableCategories(),
      onSubmit: (formData) => handleSubmit({ ...formData, _editingId: editingData?.id }),
      uploading,
      onFileUpload: handleFileUpload,
      editingData,
      onCancelEdit: () => { setEditingData(null); setViewMode("form"); },
    };
    if (cat === "PHI") return <PHIForm {...commonProps} />;
    if (cat === "Late for Shift") return <LateForShiftForm {...commonProps} />;
    if (cat === "No Call, No Show") return <NoCallNoShowForm {...commonProps} />;
    if (cat === "Request to Leave Early") return <RequestToLeaveForm {...commonProps} />;
    if (cat === "Supply Need") return <SupplyNeedForm {...commonProps} />;
    if (cat === "Missing/Expiring Item") return <MissingExpiringForm {...commonProps} />;
    if (cat === "Questions/Clarification") return <QuestionsClarificationForm {...commonProps} />;
    if (cat === "Reminder") return <ReminderForm {...commonProps} />;
    return <IncidentForm {...commonProps} category={cat} />;
  };

  const renderEntryDetail = (entry) => {
    const parties = Array.isArray(entry.involved_parties)
      ? entry.involved_parties
      : typeof entry.involved_parties === "string"
      ? JSON.parse(entry.involved_parties || "[]")
      : [];

    const witnesses = Array.isArray(entry.witnesses)
      ? entry.witnesses
      : typeof entry.witnesses === "string"
      ? JSON.parse(entry.witnesses || "[]")
      : [];

    return (
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-slate-500">Employee</p>
          <p>{entry.employee_name}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">Date / Time</p>
          <p>{entry.date} • {entry.time}</p>
        </div>
        {entry.description && (
          <div className="md:col-span-2">
            <p className="text-sm font-medium text-slate-500">Description</p>
            <p className="whitespace-pre-wrap">{entry.description}</p>
          </div>
        )}
        {entry.phi_requested && (
          <div className="md:col-span-2">
            <p className="text-sm font-medium text-slate-500">PHI Requested</p>
            <p className="whitespace-pre-wrap">{entry.phi_requested}</p>
          </div>
        )}
        {entry.communication_method && (
          <div>
            <p className="text-sm font-medium text-slate-500">Communication Method</p>
            <p>{entry.communication_method}</p>
          </div>
        )}
        {entry.information_provided && (
          <div className="md:col-span-2">
            <p className="text-sm font-medium text-slate-500">Information Provided</p>
            <p className="whitespace-pre-wrap">{entry.information_provided}</p>
          </div>
        )}
        {entry.scheduled_time && (
          <div>
            <p className="text-sm font-medium text-slate-500">Scheduled Time</p>
            <p>{entry.scheduled_time}</p>
          </div>
        )}
        {entry.arrival_time && (
          <div>
            <p className="text-sm font-medium text-slate-500">Arrival Time</p>
            <p>{entry.arrival_time}</p>
          </div>
        )}
        {entry.stated_reason && (
          <div className="md:col-span-2">
            <p className="text-sm font-medium text-slate-500">Stated Reason</p>
            <p>{entry.stated_reason}</p>
          </div>
        )}
        {entry.scheduled_until && (
          <div>
            <p className="text-sm font-medium text-slate-500">Scheduled Until</p>
            <p>{entry.scheduled_until}</p>
          </div>
        )}
        {entry.request_granted !== null && entry.request_granted !== undefined && (
          <div>
            <p className="text-sm font-medium text-slate-500">Request Granted</p>
            <p>{entry.request_granted ? "Yes" : "No"}</p>
          </div>
        )}
        {entry.denial_reason && (
          <div className="md:col-span-2">
            <p className="text-sm font-medium text-slate-500">Denial Reason</p>
            <p>{entry.denial_reason}</p>
          </div>
        )}
        {entry.location && (
          <div>
            <p className="text-sm font-medium text-slate-500">Location</p>
            <p className={locationTextClass(entry.location)}>
              {entry.location}
            </p>
          </div>
        )}
        {entry.storage_type && (
          <div>
            <p className="text-sm font-medium text-slate-500">Storage Type</p>
            <p>{entry.storage_type}</p>
          </div>
        )}
        {entry.storage_location && (
          <div>
            <p className="text-sm font-medium text-slate-500">Storage Location</p>
            <p>{entry.storage_location}</p>
          </div>
        )}
        {entry.item_replaced !== null && entry.item_replaced !== undefined && (
          <div>
            <p className="text-sm font-medium text-slate-500">Item Replaced?</p>
            <p>{entry.item_replaced ? "Yes" : "No"}</p>
          </div>
        )}
        {entry.replacement_storage_type && (
          <div>
            <p className="text-sm font-medium text-slate-500">Replacement Pulled From</p>
            <p>{entry.replacement_storage_type}</p>
          </div>
        )}
        {entry.replacement_storage_location && (
          <div>
            <p className="text-sm font-medium text-slate-500">Replacement Location</p>
            <p>{entry.replacement_storage_location}</p>
          </div>
        )}
        {entry.departure_time && (
          <div>
            <p className="text-sm font-medium text-slate-500">Departure Time</p>
            <p>{entry.departure_time}</p>
          </div>
        )}
        {entry.additional_details && (
          <div className="md:col-span-2">
            <p className="text-sm font-medium text-slate-500">Additional Details</p>
            <p className="whitespace-pre-wrap">{entry.additional_details}</p>
          </div>
        )}
        {parties.length > 0 && (
          <div className="md:col-span-2">
            <p className="text-sm font-medium text-slate-500">Involved Parties</p>
            <ul className="mt-1 space-y-1">
              {parties.map((p, i) => (
                <li key={i} className="text-sm">
                  {p.type === "ems"
                    ? `${p.name}${p.certification ? `, ${p.certification}` : ""} - Safety/EMS Personnel`
                    : `${p.name} - ${p.role || "Other Personnel"}`}
                </li>
              ))}
            </ul>
          </div>
        )}
        {witnesses.length > 0 && (
          <div className="md:col-span-2">
            <p className="text-sm font-medium text-slate-500">Witnesses</p>
            <ul className="mt-1 space-y-1">
              {witnesses.map((w, i) => (
                <li key={i} className="text-sm">
                  {w.type === "ems"
                    ? `${w.name}${w.certification ? `, ${w.certification}` : ""} - Safety/EMS Personnel`
                    : `${w.name} - ${w.role || "Other Personnel"}`}
                </li>
              ))}
            </ul>
          </div>
        )}
        {entry.attachments?.length > 0 && (
          <div className="md:col-span-2">
            <p className="text-sm font-medium text-slate-500">Attachments</p>
            <ul className="mt-1 space-y-1">
              {entry.attachments.map((a, i) => (
                <li key={i} className="text-sm">
                  <AttachmentLink value={a} className="text-blue-600 underline" />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
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

  if (forcePasswordChange) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-1">
                EMS / Safety Incident Documentation
              </p>
              <h1 className="text-3xl font-semibold text-slate-900">WorkLog</h1>
            </div>
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-medium text-amber-800">Password Change Required</p>
              <p className="text-sm text-amber-700 mt-1">
                For your security, you must set a new password before continuing. Please choose a password that is unique to you and do not share it with others.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">New Password</label>
                <input
                  type="password"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Confirm New Password</label>
                <input
                  type="password"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              {passwordError && (
                <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-600">{passwordSuccess}</p>
              )}
              <button
                className="w-full rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700"
                onClick={handleChangePassword}
              >
                Set New Password & Continue
              </button>
              <button
                className="w-full rounded-xl border border-slate-300 px-5 py-3 font-medium text-slate-600 hover:bg-slate-50"
                onClick={handleLogout}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="bg-slate-900 text-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              EMS / Safety Incident Documentation
            </p>
            <h1 className="text-2xl font-semibold">WorkLog</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                className="rounded-full bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
                onClick={() => setShowAccountMenu((v) => !v)}
              >
                👤 {profile?.full_name || user.email}
              </button>
              {showAccountMenu && (
                <div className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
                  <p className="text-sm font-medium text-slate-700 mb-3">Change Password</p>
                  <input
                    type="password"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm mb-2"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <input
                    type="password"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm mb-2"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  {passwordError && <p className="text-xs text-rose-600 mb-2">{passwordError}</p>}
                  {passwordSuccess && <p className="text-xs text-emerald-600 mb-2">{passwordSuccess}</p>}
                  <button
                    className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
                    onClick={handleChangePassword}
                  >
                    Update Password
                  </button>
                  <button
                    className="w-full mt-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 text-slate-700"
                    onClick={() => setShowAccountMenu(false)}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
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
                <button
                  onClick={() => setViewMode("users")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${viewMode === "users" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  Users
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

        {viewMode === "form" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <p className="text-sm font-medium text-slate-500">New incident</p>
              <h2 className="text-2xl font-semibold">
                {activeCategory || "Incident Documentation"}
              </h2>
            </div>
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
                  <div key={entry.id} className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-2 p-4">
                      <div>
                        <p className="font-medium">{entry.category}</p>
                        <p className="text-sm text-slate-500">{entry.date} at {entry.time}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="rounded-full bg-slate-100 px-3 py-1 text-sm"
                          onClick={() => setSelectedEntry(selectedEntry?.id === entry.id ? null : entry)}
                        >
                          {selectedEntry?.id === entry.id ? "Close" : "View"}
                        </button>
                        <button
                          className="rounded-full bg-slate-100 px-3 py-1 text-sm"
                          onClick={() => startEdit(entry)}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-full bg-rose-50 px-3 py-1 text-sm text-rose-600"
                          onClick={() => deleteEntry(entry)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {selectedEntry?.id === entry.id && (
                      <div className="border-t border-slate-200 bg-slate-50 p-4">
                        {renderEntryDetail(entry)}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </section>
        )}

        {viewMode === "admin" && profile?.role === ROLES.MASTER_ADMIN && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Administrative view</p>
                <h2 className="text-2xl font-semibold">All Submissions</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white"
                  onClick={exportCsv}
                >
                  Export CSV
                </button>
                <button
                  className={`rounded-xl border px-4 py-2 font-semibold ${groupingMode ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 text-slate-700"}`}
                  onClick={() => (groupingMode ? exitGroupingMode() : setGroupingMode(true))}
                >
                  {groupingMode ? "Cancel Grouping" : "Group Submissions"}
                </button>
                {groupingMode && selectedForGroup.length > 0 && (
                  addToGroupId ? (
                    <button
                      className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
                      onClick={addSelectedToGroup}
                    >
                      Add {selectedForGroup.length} to Group
                    </button>
                  ) : (
                    <button
                      className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
                      onClick={() => { setGroupError(""); setShowCreateGroup(true); }}
                    >
                      Create Group ({selectedForGroup.length})
                    </button>
                  )
                )}
                <button
                  className={`rounded-xl border px-4 py-2 font-semibold ${showDeletedSubmissions ? "bg-rose-600 text-white border-rose-600" : "border-slate-300 text-slate-700"}`}
                  onClick={() => setShowDeletedSubmissions(!showDeletedSubmissions)}
                >
                  {showDeletedSubmissions ? "Hide Deleted" : "Deleted Submissions"}
                </button>
              </div>
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
              />
              <input
                className="rounded-xl border border-slate-300 px-3 py-2"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
              <input
                className="rounded-xl border border-slate-300 px-3 py-2"
                placeholder="Search by name"
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
              />
            </div>

            {groupingMode && (
              <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
                {addToGroupId
                  ? "Select submissions to add to this group, then choose “Add to Group”. Submissions already in it are shown ticked and locked."
                  : "Select submissions to group together, then choose “Create Group”. A submission can belong to more than one group."}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    {groupingMode && <th className="px-3 py-2 w-10"></th>}
                    <th className="px-3 py-2">Employee</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Groups first, each header followed by its own submissions. */}
                  {groups.map((group) => {
                    const memberIds = entryIdsInGroup(group.id);
                    const members = visibleAdminRecords.filter((r) => memberIds.includes(r.id));
                    const collapsed = collapsedGroups.includes(group.id);
                    const editingNote = editingNoteGroupId === group.id;
                    return (
                      <React.Fragment key={group.id}>
                        <tr className="border-t-2 border-indigo-200 bg-indigo-50">
                          <td colSpan={adminColSpan} className="px-3 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex flex-wrap items-center gap-3">
                                <button
                                  type="button"
                                  aria-expanded={!collapsed}
                                  aria-label={collapsed ? "Expand group" : "Collapse group"}
                                  className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:bg-indigo-100"
                                  onClick={() => toggleGroupCollapsed(group.id)}
                                >
                                  <span
                                    className={`inline-block text-xs transition-transform duration-200 ${
                                      collapsed ? "" : "rotate-90"
                                    }`}
                                  >
                                    ▶
                                  </span>
                                </button>
                                <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                                  Incident Group
                                </span>
                                <span className="font-semibold text-slate-900">
                                  {group.incident_date || "—"} • {group.incident_time || "—"} — {group.title}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {memberIds.length} submission{memberIds.length === 1 ? "" : "s"}
                                  {members.length !== memberIds.length &&
                                    ` (${members.length} shown by current filters)`}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-100"
                                  onClick={() => (editingNote ? setEditingNoteGroupId(null) : startEditNote(group))}
                                >
                                  {group.notes ? "Edit Note" : "Add Note"}
                                </button>
                                <button
                                  className="rounded-full bg-white px-3 py-1 text-xs font-medium text-indigo-700 border border-indigo-300 hover:bg-indigo-100"
                                  onClick={() => startAddToGroup(group.id)}
                                >
                                  Add Submissions
                                </button>
                                <button
                                  className="rounded-full bg-white px-3 py-1 text-xs font-medium text-rose-600 border border-rose-300 hover:bg-rose-50"
                                  onClick={() => setDeleteGroupConfirm(group)}
                                >
                                  Delete Group
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>

                        {/* Note editor and note body stay visible when collapsed —
                            collapsing hides the submissions, not the group's own context. */}
                        {editingNote && (
                          <tr className="bg-indigo-50/60">
                            <td colSpan={adminColSpan} className="px-3 py-3 pl-10">
                              <textarea
                                className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                                placeholder="Add context about this incident group..."
                                value={noteDraft}
                                onChange={(e) => setNoteDraft(e.target.value)}
                              />
                              {noteError && (
                                <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                                  🚫 {noteError}
                                </p>
                              )}
                              <div className="mt-2 flex gap-2">
                                <button
                                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:bg-slate-300"
                                  disabled={noteSaving}
                                  onClick={() => saveGroupNote(group.id)}
                                >
                                  {noteSaving ? "Saving..." : "Save"}
                                </button>
                                <button
                                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                                  disabled={noteSaving}
                                  onClick={() => setEditingNoteGroupId(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}

                        {group.notes && !editingNote && (
                          <tr className="bg-indigo-50/30">
                            <td colSpan={adminColSpan} className="px-3 py-2 pl-10">
                              <div className="rounded-lg border border-indigo-100 bg-white px-3 py-2 text-sm text-slate-600">
                                <span className="font-medium text-slate-500">Note: </span>
                                <span className="whitespace-pre-wrap">{group.notes}</span>
                              </div>
                            </td>
                          </tr>
                        )}

                        {!collapsed && members.length === 0 && (
                          <tr className="bg-indigo-50/40">
                            <td colSpan={adminColSpan} className="px-3 py-3 pl-10 text-sm text-slate-500">
                              {memberIds.length === 0
                                ? "No submissions in this group yet."
                                : "No submissions in this group match the current filters."}
                            </td>
                          </tr>
                        )}
                        {!collapsed && members.map((record) => renderAdminRow(record, group))}
                      </React.Fragment>
                    );
                  })}

                  {/* Ungrouped submissions below every group. */}
                  {ungroupedAdminRecords.map((record) => renderAdminRow(record, null))}

                  {groups.length === 0 && ungroupedAdminRecords.length === 0 && (
                    <tr>
                      <td colSpan={adminColSpan} className="px-3 py-6 text-center text-sm text-slate-500">
                        No submissions match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          {showDeletedSubmissions && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-slate-700 mb-3">Deleted Submissions</h3>
              <div className="overflow-x-auto rounded-xl border border-rose-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-rose-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Employee</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records
                      .filter((r) => r.status === "deleted" && !r.permanently_deleted)
                      .map((record) => (
                        <tr key={record.id} className="border-t border-rose-100">
                          <td className="px-3 py-3">{record.employee_name}</td>
                          <td className="px-3 py-3">{record.date}</td>
                          <td className="px-3 py-3">{record.category}</td>
                          <td className="px-3 py-3 max-w-xs truncate">{record.description}</td>
                          <td className="px-3 py-3">
                            <div className="flex gap-2">
                              <button
                                className="rounded-full bg-slate-100 px-3 py-1 text-xs"
                                onClick={() => setSelectedEntry(selectedEntry?.id === record.id ? null : record)}
                              >
                                {selectedEntry?.id === record.id ? "Close" : "View"}
                              </button>
                              <button
                                className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700 font-medium"
                                onClick={async () => {
                                  const supabase = getSupabaseClient();
                                  if (isSupabaseConfigured() && supabase) {
                                    await supabase.from("incident_entries").update({ status: "active" }).eq("id", record.id);
                                  }
                                  setRecords((current) => current.map((r) => r.id === record.id ? { ...r, status: "active" } : r));
                                  setMessage("Entry restored successfully.");
                                }}
                              >
                                Restore
                              </button>
                              <button
                                className="rounded-full bg-rose-100 px-3 py-1 text-xs text-rose-700 font-medium"
                                onClick={() => permanentlyDelete(record.id)}
                              >
                                Permanently Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {selectedDeletedEntry && (
                      <tr>
                        <td colSpan={5} className="px-4 py-4 bg-slate-50 border-t border-rose-100">
                          {renderEntryDetail(selectedDeletedEntry)}
                        </td>
                      </tr>
                    )}
                    {records.filter((r) => r.status === "deleted" && !r.permanently_deleted).length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-sm text-slate-500 text-center">No deleted submissions.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          </section>
        )}

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

        {viewMode === "users" && profile?.role === ROLES.MASTER_ADMIN && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <p className="text-sm font-medium text-slate-500">Administrative</p>
              <h2 className="text-2xl font-semibold">User Management</h2>
              <p className="mt-1 text-sm text-slate-500">
                Set each user&apos;s role, and untick any category you want to hide from them.
              </p>
            </div>
            <UserManagement currentUserId={profile.id} />
          </section>
        )}
      </main>

      {/* Create Group Dialog */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Create Incident Group</h3>
            <p className="mt-1 text-sm text-slate-600">
              Grouping {selectedForGroup.length} submission{selectedForGroup.length === 1 ? "" : "s"}.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="e.g. Ambulance 12 rollover"
                  value={groupForm.title}
                  onChange={(e) => setGroupForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Incident Date</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                    value={groupForm.date}
                    onChange={(e) => setGroupForm((f) => ({ ...f, date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Incident Time</label>
                  <input
                    type="time"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                    value={groupForm.time}
                    onChange={(e) => setGroupForm((f) => ({ ...f, time: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            {groupError && (
              <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                🚫 {groupError}
              </p>
            )}

            <div className="mt-5 flex flex-col gap-2">
              <button
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:bg-slate-300"
                disabled={!groupForm.title.trim() || groupSaving}
                onClick={createGroup}
              >
                {groupSaving ? "Creating..." : "Create Group"}
              </button>
              <button
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-500 hover:bg-slate-50"
                disabled={groupSaving}
                onClick={() => { setShowCreateGroup(false); setGroupError(""); }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Group Confirmation Dialog */}
      {deleteGroupConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Delete Incident Group</h3>
            <p className="mt-2 text-sm text-slate-600">
              This dissolves the group “{deleteGroupConfirm.title}”. Every submission in it is kept
              and moves back to the ungrouped list — nothing is deleted.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                className="w-full rounded-xl bg-rose-600 px-4 py-3 font-semibold text-white hover:bg-rose-700"
                onClick={confirmDeleteGroup}
              >
                Delete Group
              </button>
              <button
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-500 hover:bg-slate-50"
                onClick={() => setDeleteGroupConfirm(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Delete Submission</h3>
            <p className="mt-2 text-sm text-slate-600">
              Would you also like to delete the attachments associated with this submission? This cannot be undone.
            </p>
            {showDeleteConfirm.attachments?.length > 0 ? (
              <div className="mt-4 flex flex-col gap-2">
                <button
                  className="w-full rounded-xl bg-rose-600 px-4 py-3 font-semibold text-white hover:bg-rose-700"
                  onClick={() => confirmDelete(true)}
                >
                  Delete Submission & Attachments
                </button>
                <button
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 font-medium hover:bg-slate-50"
                  onClick={() => confirmDelete(false)}
                >
                  Delete Submission Only (Keep Attachments)
                </button>
                <button
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-500 hover:bg-slate-50"
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-2">
                <button
                  className="w-full rounded-xl bg-rose-600 px-4 py-3 font-semibold text-white hover:bg-rose-700"
                  onClick={() => confirmDelete(false)}
                >
                  Delete Submission
                </button>
                <button
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-500 hover:bg-slate-50"
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}