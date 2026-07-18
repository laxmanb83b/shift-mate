export type PostingStatus =
  | "active"
  | "filled"
  | "expired"
  | "flagged"
  | "hidden";

export interface Posting {
  id: string;
  created_at: string;
  poster_id: string | null;
  title: string;
  description: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  location_text: string | null;
  category: string | null;
  lat: number | null;
  lng: number | null;
  image_url: string | null;
  status: PostingStatus;
  expires_at: string | null;
}

export interface NewPosting {
  title: string;
  description?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  location_text?: string;
  category?: string;
  image_url?: string | null;
  expires_at?: string; // ISO; defaults to 30 days server-side if omitted
}
