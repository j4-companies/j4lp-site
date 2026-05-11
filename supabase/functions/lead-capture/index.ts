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

    // Use SERVICE_ROLE_KEY custom secret for DB writes
    const supabaseUrl = Deno.env.get("PROJECT_URL") ?? "";
    const serviceKey = Deno.env.get("SERVICE_ROLE_KEY") ?? "";

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

    const ghlRes = await fetch(GHL_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ghlPayload),
    });

    if (!ghlRes.ok) console.error("GHL error:", ghlRes.status);

    return new Response(
      JSON.stringify({ success: true }),
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
