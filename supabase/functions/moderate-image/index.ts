// Supabase Edge Function: moderate-image
// Deploy:  supabase functions deploy moderate-image
// Secrets: supabase secrets set SIGHTENGINE_API_USER=... SIGHTENGINE_API_SECRET=...
//
// Flow: receives { path } of an uploaded file in the private `pending-images`
// bucket, signs a temporary URL, sends it to Sightengine for moderation, and
// — if clean — copies it into the public `posting-images` bucket. Returns
// { approved, path?, reason? }.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PENDING_BUCKET = "pending-images";
const PUBLIC_BUCKET = "posting-images";

// Reject if any of these category scores exceed the threshold.
const THRESHOLD = 0.5;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { path } = await req.json();
    if (!path) return json({ approved: false, reason: "No file path." }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Temporary signed URL to the pending upload.
    const signed = await supabase.storage
      .from(PENDING_BUCKET)
      .createSignedUrl(path, 120);
    if (signed.error || !signed.data?.signedUrl) {
      return json({ approved: false, reason: "Upload not found." }, 404);
    }

    // 2. Ask Sightengine to moderate.
    const apiUser = Deno.env.get("SIGHTENGINE_API_USER");
    const apiSecret = Deno.env.get("SIGHTENGINE_API_SECRET");

    let approved = true;
    let reason = "";

    if (apiUser && apiSecret) {
      const params = new URLSearchParams({
        url: signed.data.signedUrl,
        models: "nudity-2.1,offensive,gore,weapon,recreational_drug",
        api_user: apiUser,
        api_secret: apiSecret,
      });
      const r = await fetch(
        `https://api.sightengine.com/1.0/check.json?${params.toString()}`
      );
      const result = await r.json();

      if (result.status !== "success") {
        approved = false;
        reason = "Image could not be analyzed.";
      } else {
        const n = result.nudity ?? {};
        const sexual = Math.max(
          n.sexual_activity ?? 0,
          n.sexual_display ?? 0,
          n.erotica ?? 0,
          n.very_suggestive ?? 0
        );
        const checks: Array<[string, number]> = [
          ["sexual content", sexual],
          ["offensive content", result.offensive?.prob ?? 0],
          ["graphic content", result.gore?.prob ?? 0],
          ["weapons", result.weapon ?? 0],
          ["drugs", result.recreational_drug?.prob ?? 0],
        ];
        const hit = checks.find(([, score]) => score >= THRESHOLD);
        if (hit) {
          approved = false;
          reason = `Image rejected: detected ${hit[0]}. Please upload a job-related photo.`;
        }
      }
    } else {
      // No API keys configured yet → fail open so the app stays usable in dev.
      console.warn("Sightengine keys not set; approving without moderation.");
    }

    if (!approved) {
      await supabase.storage.from(PENDING_BUCKET).remove([path]);
      return json({ approved: false, reason });
    }

    // 3. Move approved file: download from pending, upload to public, clean up.
    const dl = await supabase.storage.from(PENDING_BUCKET).download(path);
    if (dl.error || !dl.data) {
      return json({ approved: false, reason: "Could not finalize image." }, 500);
    }
    const up = await supabase.storage
      .from(PUBLIC_BUCKET)
      .upload(path, dl.data, {
        contentType: dl.data.type || "image/jpeg",
        upsert: true,
      });
    if (up.error) {
      return json({ approved: false, reason: "Could not store image." }, 500);
    }
    await supabase.storage.from(PENDING_BUCKET).remove([path]);

    return json({ approved: true, path });
  } catch (e) {
    return json({ approved: false, reason: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
