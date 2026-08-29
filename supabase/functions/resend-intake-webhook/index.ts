import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

function decodeBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

async function verifySignature(payload: string, headers: Headers, secret: string) {
  const id = headers.get("svix-id") || "";
  const timestamp = headers.get("svix-timestamp") || "";
  const signatures = (headers.get("svix-signature") || "").split(" ").map((part) => part.split(",")).filter(([version, signature]) => version === "v1" && signature);
  const timestampSeconds = Number(timestamp);
  if (!id || !Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 300 || signatures.length === 0) return false;
  const rawSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const key = await crypto.subtle.importKey("raw", decodeBase64(rawSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${payload}`)));
  let binary = "";
  for (const byte of digest) binary += String.fromCharCode(byte);
  const expected = btoa(binary);
  return signatures.some(([, signature]) => constantTimeEqual(expected, signature));
}

serve(async (req) => {
  if (req.method !== "POST") return response({ success: false, error: "Method not allowed" }, 405);
  const contentLength = Number(req.headers.get("content-length") || "0");
  if (contentLength > 100_000) return response({ success: false, error: "Payload too large" }, 413);
  const payload = await req.text();
  if (new TextEncoder().encode(payload).byteLength > 100_000) return response({ success: false, error: "Payload too large" }, 413);
  const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET") || "";
  if (!webhookSecret || !(await verifySignature(payload, req.headers, webhookSecret))) return response({ success: false, error: "Invalid signature" }, 400);

  const event = JSON.parse(payload) as { type?: string; created_at?: string; data?: { email_id?: string } };
  const eventId = req.headers.get("svix-id") || "";
  const emailId = String(event.data?.email_id || "");
  const eventType = String(event.type || "");
  const occurredAt = new Date(event.created_at || Date.now()).toISOString();
  if (!emailId || !eventType.startsWith("email.")) return response({ success: true, ignored: true });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceKey) return response({ success: false, error: "Webhook storage is not configured" }, 500);
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { error: eventError } = await db.from("resend_webhook_events").insert({ event_id: eventId, email_id: emailId, event_type: eventType, occurred_at: occurredAt });
  if (eventError?.code === "23505") return response({ success: true, duplicate: true });
  if (eventError) throw eventError;

  const status = eventType.replace("email.", "");
  const deliveredAt = eventType === "email.delivered" ? occurredAt : null;
  const failed = ["email.bounced", "email.failed", "email.suppressed"].includes(eventType);
  const { data: intakes, error: intakeError } = await db.from("property_intakes")
    .select("id,client_receipt_id,internal_alert_id")
    .or(`client_receipt_id.eq.${emailId},internal_alert_id.eq.${emailId}`);
  if (intakeError) throw intakeError;
  for (const intake of intakes || []) {
    const updates: Record<string, unknown> = {};
    if (intake.client_receipt_id === emailId) {
      updates.client_receipt_delivery_status = status;
      if (deliveredAt) updates.client_receipt_delivered_at = deliveredAt;
    }
    if (intake.internal_alert_id === emailId) {
      updates.internal_alert_delivery_status = status;
      if (deliveredAt) updates.internal_alert_delivered_at = deliveredAt;
    }
    if (failed) updates.email_delivery_error = `${eventType} at ${occurredAt}`;
    const { error } = await db.from("property_intakes").update(updates).eq("id", intake.id);
    if (error) throw error;
  }

  const { data: drafts, error: draftError } = await db.from("property_intake_drafts").select("id").eq("return_link_email_id", emailId);
  if (draftError) throw draftError;
  for (const draft of drafts || []) {
    const updates: Record<string, unknown> = { return_link_delivery_status: status };
    if (deliveredAt) updates.return_link_delivered_at = deliveredAt;
    if (failed) updates.return_link_email_error = `${eventType} at ${occurredAt}`;
    const { error } = await db.from("property_intake_drafts").update(updates).eq("id", draft.id);
    if (error) throw error;
  }
  return response({ success: true });
});
