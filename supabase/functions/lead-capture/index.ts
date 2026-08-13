// J4 Legacy Properties — Lead Capture Edge Function
// Uses Supabase default secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GHL_WEBHOOK = "https://services.leadconnectorhq.com/hooks/KjLitBvw6kShKQcXnCQw/webhook-trigger/waf2MNjFU0ALbBPtR05S";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Credentials for the DB write.
    //
    // This function previously read ONLY the custom secrets PROJECT_URL and
    // SERVICE_ROLE_KEY, while its own header comment claimed it used the
    // Supabase defaults. When those custom secrets are unset, Deno.env.get
    // returns undefined, `?? ""` turned that into empty strings, createClient
    // accepted them, and every insert failed. The failure was invisible because
    // the catch below only console.errors and the response still said success,
    // so leads reached GHL and silently never reached Postgres. The leads table
    // sat at zero rows while the site reported every submission as fine.
    //
    // Now: prefer the custom secrets if present, fall back to the platform
    // defaults, which Supabase injects into every edge function automatically.
    const supabaseUrl =
      Deno.env.get("PROJECT_URL") || Deno.env.get("SUPABASE_URL") || "";
    const serviceKey =
      Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !serviceKey) {
      console.error(
        "FATAL: no Supabase credentials available. Checked PROJECT_URL/SUPABASE_URL " +
        "and SERVICE_ROLE_KEY/SUPABASE_SERVICE_ROLE_KEY. The lead will still be " +
        "forwarded to GHL but will NOT be recorded in Postgres."
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false }
    });

    const lead = {
      form_type:      body.form_type      || "unknown",
      name:           body.name           || null,
      phone:          body.phone          || null,
      email:          body.email          || null,
      buyer_type:     body.buyer_type     || null,
      budget:         body.budget         || null,
      timeline:       body.timeline       || null,
      counties:       body.counties       || null,
      message:        body.message        || null,
      property_ref:   body.property_ref   || null,
      agent_ref:      body.agent_ref      || null,
      license_status: body.license_status || null,
      experience:     body.experience     || null,
      property_type:  body.property_type  || null,
      county:         body.county         || null,
      acreage:        body.acreage        || null,
      intent:         body.intent         || null,
      raw:            body,
    };

    // Insert into Supabase
    const { error: dbError } = await supabase.from("leads").insert(lead);
    if (dbError) console.error("DB error:", JSON.stringify(dbError));
    const stored = !dbError;

    // Forward to GHL
    const nameParts = (body.name || "").trim().split(" ");
    const ghlPayload = {
      firstName:      nameParts[0] || "",
      lastName:       nameParts.slice(1).join(" ") || "",
      email:          body.email        || "",
      phone:          body.phone        || "",
      source:         "J4LP Website",
      form_type:      body.form_type    || "unknown",
      message:        body.message      || "",
      buyer_type:     body.buyer_type   || "",
      budget:         body.budget       || "",
      timeline:       body.timeline     || "",
      counties:       body.counties     || "",
      property_ref:   body.property_ref || "",
      intent:         body.intent       || "",
    };

    // Pass through any field this function doesn't name explicitly, so a new
    // form on the site reaches GHL without needing this function redeployed.
    // The seminar form's `seminar_date` and `sms_consent` are the first users of
    // this; before it, an unlisted field was written to the `raw` column and
    // then silently dropped on the way to the CRM. Existing keys above win, so
    // this cannot change what current forms already send.
    for (const [k, v] of Object.entries(body)) {
      if (k in ghlPayload) continue;
      if (v === null || v === undefined) continue;
      if (typeof v === "object") continue; // keep the webhook payload flat
      (ghlPayload as Record<string, unknown>)[k] = v;
    }

    const ghlRes = await fetch(GHL_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ghlPayload),
    });

    if (!ghlRes.ok) console.error("GHL error:", ghlRes.status);

    // Still a 200 even if the DB write failed: GHL has the lead, so showing the
    // visitor an error would only make them submit again and create duplicates.
    // But `stored` and `forwarded` are reported explicitly so a failure is
    // observable from outside instead of being swallowed. A silent success is
    // how this went unnoticed until the leads table was found empty.
    return new Response(
      JSON.stringify({ success: true, stored, forwarded: ghlRes.ok }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
