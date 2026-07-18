import { supabase, PENDING_BUCKET, PUBLIC_BUCKET } from "./supabase";
import type { Posting, NewPosting, PostingStatus } from "./types";

// Job categories used for filtering and the post form.
export const CATEGORIES = [
  "Food & Café",
  "Retail",
  "Delivery",
  "Cleaning",
  "Tutoring",
  "Childcare",
  "Pet Care",
  "Events",
  "Warehouse",
  "Admin",
  "Other",
] as const;

// "Active for" presets (days) offered when posting.
export const EXPIRY_OPTIONS = [
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
  { label: "60 days", days: 60 },
] as const;

export const PAGE_SIZE = 10;

export interface FetchOptions {
  search?: string;
  category?: string | null;
  page?: number; // 0-based
  pageSize?: number;
}

export interface PostingsPage {
  rows: Posting[];
  hasMore: boolean;
}

/**
 * Fetch active postings, newest first, with optional category filter,
 * text search (title / location / category), and pagination.
 */
export async function fetchPostings(
  opts: FetchOptions = {}
): Promise<PostingsPage> {
  const { search, category, page = 0, pageSize = PAGE_SIZE } = opts;
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const nowIso = new Date().toISOString();

  let query = supabase
    .from("postings")
    .select("*")
    .eq("status", "active")
    .gt("expires_at", nowIso) // hide anything past its "active till"
    .order("created_at", { ascending: false })
    .range(from, to);

  if (category) query = query.eq("category", category);

  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    query = query.or(
      `title.ilike.${q},location_text.ilike.${q},category.ilike.${q}`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];
  return { rows, hasMore: rows.length === pageSize };
}

export async function fetchPosting(id: string): Promise<Posting | null> {
  const { data, error } = await supabase
    .from("postings")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

/** Postings created by the signed-in user (any status), newest first. */
export async function fetchMyPostings(): Promise<Posting[]> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase
    .from("postings")
    .select("*")
    .eq("poster_id", uid)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function getCurrentUserEmail(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function createPosting(
  input: NewPosting & { expiryDays?: number }
): Promise<Posting> {
  const { data: userData } = await supabase.auth.getUser();
  const { expiryDays, ...rest } = input;

  // Compute "active till" from the chosen number of days (default 30).
  const days = expiryDays ?? 30;
  const expires_at =
    rest.expires_at ??
    new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("postings")
    .insert({ ...rest, expires_at, poster_id: userData.user?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Edit a posting's fields (owner only, enforced by RLS). */
export async function updatePosting(
  id: string,
  fields: Partial<NewPosting> & { expiryDays?: number }
): Promise<Posting> {
  const { expiryDays, ...rest } = fields;
  const patch: Record<string, unknown> = { ...rest };
  if (expiryDays) {
    patch.expires_at = new Date(
      Date.now() + expiryDays * 24 * 60 * 60 * 1000
    ).toISOString();
  }
  const { data, error } = await supabase
    .from("postings")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Mark a posting filled/active/expired (owner only, enforced by RLS). */
export async function updatePostingStatus(
  id: string,
  status: PostingStatus
): Promise<void> {
  const { error } = await supabase
    .from("postings")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

/** Permanently delete a posting (owner or admin, enforced by RLS). */
export async function deletePosting(id: string): Promise<void> {
  const { error } = await supabase.from("postings").delete().eq("id", id);
  if (error) throw error;
}

/** Admin/owner: delete every posting by a user. Returns how many were removed. */
export async function deletePostingsByUser(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("postings")
    .delete()
    .eq("poster_id", userId)
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

/**
 * Uploads an image to the private pending bucket, asks the moderation Edge
 * Function to check it, and on success returns a public URL. Throws with a
 * user-readable message if the image is rejected.
 */
export async function uploadAndModerateImage(
  fileUri: string
): Promise<string> {
  const res = await fetch(fileUri);
  const blob = await res.blob();
  const ext = (blob.type?.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const up = await supabase.storage
    .from(PENDING_BUCKET)
    .upload(path, blob, { contentType: blob.type || "image/jpeg" });
  if (up.error) throw up.error;

  const { data, error } = await supabase.functions.invoke("moderate-image", {
    body: { path },
  });
  if (error) {
    await supabase.storage.from(PENDING_BUCKET).remove([path]);
    throw new Error("Could not validate the image. Please try again.");
  }
  if (!data?.approved) {
    await supabase.storage.from(PENDING_BUCKET).remove([path]);
    throw new Error(
      data?.reason ||
        "This image was rejected. Please upload a clear, job-related photo."
    );
  }

  const pub = supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(data.path);
  return pub.data.publicUrl;
}

export async function reportPosting(postingId: string, reason: string) {
  const { error } = await supabase
    .from("reports")
    .insert({ posting_id: postingId, reason });
  if (error) throw error;
}

// ---- Admin moderation -------------------------------------------------

/** True if the signed-in user is an admin (checked server-side). */
export async function isAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin");
  if (error) return false;
  return !!data;
}

export interface ReportedPosting {
  posting: Posting;
  reportCount: number;
  reasons: string[];
  lastReportedAt: string;
}

/**
 * Admin-only: reported postings, grouped by posting, newest report first.
 * Relies on the admin RLS policies for reads.
 */
export async function fetchReportedPostings(): Promise<ReportedPosting[]> {
  const { data, error } = await supabase
    .from("reports")
    .select("id, reason, created_at, posting:postings(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const grouped = new Map<string, ReportedPosting>();
  for (const row of (data ?? []) as any[]) {
    const posting = row.posting as Posting | null;
    if (!posting) continue; // posting already deleted
    const existing = grouped.get(posting.id);
    if (existing) {
      existing.reportCount += 1;
      if (row.reason) existing.reasons.push(row.reason);
    } else {
      grouped.set(posting.id, {
        posting,
        reportCount: 1,
        reasons: row.reason ? [row.reason] : [],
        lastReportedAt: row.created_at,
      });
    }
  }
  return Array.from(grouped.values());
}

export interface AdminUser {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in: string | null;
  posting_count: number;
}

/** Admin-only: list registered users with their post counts (newest first). */
export async function adminListUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc("admin_list_users");
  if (error) throw error;
  return ((data ?? []) as any[]).map((u) => ({
    id: u.id,
    email: u.email ?? null,
    created_at: u.created_at,
    last_sign_in: u.last_sign_in ?? null,
    posting_count: Number(u.posting_count ?? 0),
  }));
}

/** Postings by a specific user (admins can read any via RLS), newest first. */
export async function fetchPostingsByUser(userId: string): Promise<Posting[]> {
  const { data, error } = await supabase
    .from("postings")
    .select("*")
    .eq("poster_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Admin-only: dismiss all reports for a posting without deleting the post. */
export async function dismissReports(postingId: string): Promise<void> {
  const { error } = await supabase
    .from("reports")
    .delete()
    .eq("posting_id", postingId);
  if (error) throw error;
}

/** Format an ISO date as a short "active till" label. */
export function formatActiveTill(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
