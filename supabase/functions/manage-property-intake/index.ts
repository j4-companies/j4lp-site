import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED = new Set(["https://www.j4lp.com", "https://j4lp.com", "http://localhost:3000", "http://localhost:5173"]);
const BUCKET = "property-intake-files";
const MAX_FILES = 12;
const MAX_BYTES = 10 * 1024 * 1024;
const MIME = new Set(["application/pdf", "image/jpeg", "image/png", "image/heic", "image/heif"]);

function headers(origin: string | null) {
  return { "Access-Control-Allow-Origin": origin && ALLOWED.has(origin) ? origin : "https://www.j4lp.com", "Access-Control-Allow-Headers": "content-type", "Access-Control-Allow-Methods": "POST,OPTIONS", Vary: "Origin" };
}
function reply(origin: string | null, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers(origin), "Content-Type": "application/json" } });
}
async function hashToken(token: string, salt: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${token}`));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function validEmail(value: unknown) { return /^\S+@\S+\.\S+$/.test(String(value || "").trim()); }
function safeName(name: string) { return name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120) || "document"; }
function cleanPayload(value: unknown) {
  const payload = value && typeof value === "object" ? { ...(value as Record<string, unknown>) } : {};
  delete payload.companyWebsite;
  return payload;
}
async function verifyTurnstile(token: unknown, remoteIp: string) {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY") || "";
  if (!secret || typeof token !== "string" || !token.trim()) return false;
  const form = new FormData();
  form.set("secret", secret);
  form.set("response", token.trim());
  if (remoteIp !== "unknown") form.set("remoteip", remoteIp);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  if (!response.ok) return false;
  const result = await response.json() as { success?: boolean; hostname?: string };
  return result.success === true && (result.hostname === "j4lp.com" || result.hostname === "www.j4lp.com");
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: headers(origin) });
  if (req.method !== "POST") return reply(origin, { success: false, error: "Method not allowed" }, 405);
  if (origin && !ALLOWED.has(origin)) return reply(origin, { success: false, error: "Origin not allowed" }, 403);
  try {
    const url = Deno.env.get("SUPABASE_URL") || "";
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const salt = Deno.env.get("INTAKE_HASH_SALT") || "";
    if (!url || !key || !salt) throw new Error("Service is not configured");
    const db = createClient(url, key, { auth: { persistSession: false } });
    const action = new URL(req.url).searchParams.get("action") || "json";

    if (action === "upload") {
      const form = await req.formData();
      const draftKey = String(form.get("draftKey") || "");
      const token = String(form.get("resumeToken") || "");
      const file = form.get("file");
      if (!(file instanceof File) || !MIME.has(file.type) || file.size < 1 || file.size > MAX_BYTES) return reply(origin, { success: false, error: "Use a PDF, JPG, PNG, or HEIC file no larger than 10 MB." }, 400);
      const tokenHash = await hashToken(token, salt);
      const { data: draft } = await db.from("property_intake_drafts").select("id,status,expires_at").eq("draft_key", draftKey).eq("resume_token_hash", tokenHash).maybeSingle();
      if (!draft || draft.status !== "draft" || new Date(draft.expires_at) <= new Date()) return reply(origin, { success: false, error: "This draft link is invalid or expired." }, 403);
      const { count } = await db.from("property_intake_files").select("id", { count: "exact", head: true }).eq("draft_id", draft.id);
      if ((count || 0) >= MAX_FILES) return reply(origin, { success: false, error: `A maximum of ${MAX_FILES} files may be attached.` }, 400);
      const id = crypto.randomUUID();
      const path = `${draft.id}/${id}-${safeName(file.name)}`;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { error: uploadError } = await db.storage.from(BUCKET).upload(path, bytes, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { data: record, error } = await db.from("property_intake_files").insert({ id, draft_id: draft.id, storage_path: path, original_name: file.name.slice(0, 255), content_type: file.type, size_bytes: file.size }).select("id,original_name,content_type,size_bytes,created_at").single();
      if (error) { await db.storage.from(BUCKET).remove([path]); throw error; }
      return reply(origin, { success: true, file: record });
    }

    const contentLength = Number(req.headers.get("content-length") || "0");
    if (contentLength > 220_000) return reply(origin, { success: false, error: "Request is too large" }, 413);
    const raw = await req.text();
    if (new TextEncoder().encode(raw).byteLength > 220_000) return reply(origin, { success: false, error: "Request is too large" }, 413);
    const body = JSON.parse(raw);
    if (body.action === "saveDraft") {
      const email = String(body.email || "").trim().toLowerCase();
      if (!validEmail(email)) return reply(origin, { success: false, error: "Enter a valid email address before saving." }, 400);
      let draftKey = String(body.draftKey || "");
      let token = String(body.resumeToken || "");
      let draftId = "";
      let isNew = false;
      let returnLinkSentAt: string | null = null;
      let returnLinkAttemptedAt: string | null = null;
      let returnLinkAttemptCount = 0;
      const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
      const requestIp = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      const requestIpHash = await hashToken(requestIp, salt);
      if (draftKey && token) {
        const tokenHash = await hashToken(token, salt);
        const { data: existing } = await db.from("property_intake_drafts").select("id,email,status,expires_at,return_link_sent_at,return_link_attempted_at,return_link_attempt_count").eq("draft_key", draftKey).eq("resume_token_hash", tokenHash).maybeSingle();
        if (!existing || existing.status !== "draft" || new Date(existing.expires_at) <= new Date() || String(existing.email).toLowerCase() !== email) return reply(origin, { success: false, error: "This draft link is invalid, expired, or belongs to a different email address." }, 403);
        draftId = existing.id;
        returnLinkSentAt = existing.return_link_sent_at;
        returnLinkAttemptedAt = existing.return_link_attempted_at;
        returnLinkAttemptCount = Number(existing.return_link_attempt_count || 0);
        const { error } = await db.from("property_intake_drafts").update({ email, payload: cleanPayload(body.payload), current_step: Math.max(0, Math.min(7, Number(body.currentStep) || 0)), expires_at: expiresAt, updated_at: new Date().toISOString() }).eq("id", draftId);
        if (error) throw error;
      } else {
        if (!(await verifyTurnstile(body.turnstileToken, requestIp))) return reply(origin, { success: false, error: "Complete the security check before creating a secure return link." }, 403);
        const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const [emailRecent, ipRecent] = await Promise.all([
          db.from("property_intake_drafts").select("id", { count: "exact", head: true }).eq("email", email).gte("created_at", since),
          db.from("property_intake_drafts").select("id", { count: "exact", head: true }).eq("request_ip_hash", requestIpHash).gte("created_at", since),
        ]);
        if (emailRecent.error) throw emailRecent.error;
        if (ipRecent.error) throw ipRecent.error;
        if ((emailRecent.count || 0) >= 3 || (ipRecent.count || 0) >= 10) return reply(origin, { success: false, error: "Too many recent save-link requests. Your answers remain saved on this device." }, 429);
        isNew = true;
        draftKey = crypto.randomUUID(); token = randomToken();
        const { data: created, error } = await db.from("property_intake_drafts").insert({ draft_key: draftKey, resume_token_hash: await hashToken(token, salt), email, payload: cleanPayload(body.payload), current_step: Math.max(0, Math.min(7, Number(body.currentStep) || 0)), expires_at: expiresAt, request_ip_hash: requestIpHash }).select("id").single();
        if (error) throw error; draftId = created.id;
      }
      const resumeUrl = `https://www.j4lp.com/property-intake/?draft=${encodeURIComponent(draftKey)}&token=${encodeURIComponent(token)}`;
      const shouldSendLink = isNew || body.resendReturnLink === true || !returnLinkSentAt;
      if (!shouldSendLink) return reply(origin, { success: true, stored: true, emailSent: true, isNew, draftKey, resumeToken: token, expiresAt, resumeUrl, draftId });
      if (!isNew && returnLinkAttemptedAt && new Date(returnLinkAttemptedAt).getTime() > Date.now() - 60_000) return reply(origin, { success: false, stored: true, emailSent: Boolean(returnLinkSentAt), error: "Wait one minute before requesting another return-link email.", draftKey, resumeToken: token, expiresAt, resumeUrl, draftId }, 429);
      if (!isNew && returnLinkAttemptCount >= 5) return reply(origin, { success: false, stored: true, emailSent: Boolean(returnLinkSentAt), error: "The return-link email limit has been reached. Your secure draft is still saved.", draftKey, resumeToken: token, expiresAt, resumeUrl, draftId }, 429);

      const resend = Deno.env.get("RESEND_API_KEY") || "";
      if (!resend) return reply(origin, { success: false, stored: true, emailSent: false, error: "Your secure draft was saved, but email is temporarily unavailable.", isNew, draftKey, resumeToken: token, expiresAt, resumeUrl, draftId }, 502);

      const mail = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${resend}`, "Content-Type": "application/json", "Idempotency-Key": `property-intake-draft/${draftKey}` }, body: JSON.stringify({ from: "J4 Legacy Properties <intake@j4lp.com>", to: [email], subject: "Return to your J4LP property intake", html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto"><h1 style="font-family:Georgia,serif;color:#500203">Your property intake is saved.</h1><p>Use the private link below to return to your answers and documents. The link expires in 30 days.</p><p><a style="display:inline-block;background:#500203;color:white;padding:14px 20px;text-decoration:none" href="${resumeUrl}">Continue my property intake</a></p><p>Keep this link private. Drafts are not sent to the J4LP team as leads until you submit the intake.</p></div>` }) });
      const mailResult = await mail.json().catch(() => ({})) as { id?: string; message?: string; name?: string };
      const now = new Date().toISOString();
      const emailError = mail.ok && mailResult.id ? null : `Resend ${mail.status}: ${JSON.stringify(mailResult).slice(0, 1000)}`;
      const { error: statusError } = await db.from("property_intake_drafts").update({
        return_link_email_id: mail.ok ? mailResult.id || null : null,
        return_link_sent_at: mail.ok && mailResult.id ? now : null,
        return_link_email_error: emailError,
        return_link_attempted_at: now,
        return_link_attempt_count: returnLinkAttemptCount + 1,
        return_link_delivery_status: mail.ok && mailResult.id ? "sent" : "failed",
      }).eq("id", draftId);
      if (statusError) console.error("Draft email-status update failed", statusError);
      if (emailError) return reply(origin, { success: false, stored: true, emailSent: false, error: "Your secure draft was saved, but the return-link email could not be confirmed. Keep this page open and try Save again.", isNew, draftKey, resumeToken: token, expiresAt, resumeUrl, draftId }, 502);
      return reply(origin, { success: true, stored: true, emailSent: true, isNew, draftKey, resumeToken: token, expiresAt, resumeUrl, draftId });
    }

    if (body.action === "loadDraft" || body.action === "deleteFile") {
      const tokenHash = await hashToken(String(body.resumeToken || ""), salt);
      const { data: draft } = await db.from("property_intake_drafts").select("id,email,payload,current_step,status,expires_at").eq("draft_key", String(body.draftKey || "")).eq("resume_token_hash", tokenHash).maybeSingle();
      if (!draft || draft.status !== "draft" || new Date(draft.expires_at) <= new Date()) return reply(origin, { success: false, error: "This draft link is invalid or expired." }, 403);
      if (body.action === "deleteFile") {
        const { data: file } = await db.from("property_intake_files").select("id,storage_path").eq("id", String(body.fileId || "")).eq("draft_id", draft.id).maybeSingle();
        if (!file) return reply(origin, { success: false, error: "File not found." }, 404);
        await db.storage.from(BUCKET).remove([file.storage_path]);
        await db.from("property_intake_files").delete().eq("id", file.id);
        return reply(origin, { success: true });
      }
      const { data: files } = await db.from("property_intake_files").select("id,original_name,content_type,size_bytes,created_at").eq("draft_id", draft.id).order("created_at");
      return reply(origin, { success: true, payload: draft.payload, currentStep: draft.current_step, expiresAt: draft.expires_at, files: files || [] });
    }

    if (body.action === "loadSubmission") {
      const { data: intake } = await db.from("property_intakes").select("id,reference,submitted_at,payload").eq("reference", String(body.reference || "")).maybeSingle();
      if (!intake) return reply(origin, { success: false, error: "Submission not found." }, 404);
      const tokenHash = await hashToken(String(body.viewToken || ""), salt);
      const { data: access } = await db.from("property_intake_access").select("intake_id").eq("intake_id", intake.id).eq("view_token_hash", tokenHash).is("revoked_at", null).maybeSingle();
      if (!access) return reply(origin, { success: false, error: "This private submission link is invalid." }, 403);
      const { data: files } = await db.from("property_intake_files").select("id,storage_path,original_name,content_type,size_bytes,created_at").eq("intake_id", intake.id).order("created_at");
      const signed = await Promise.all((files || []).map(async (file) => ({ ...file, storage_path: undefined, downloadUrl: (await db.storage.from(BUCKET).createSignedUrl(file.storage_path, 900)).data?.signedUrl || "" })));
      return reply(origin, { success: true, reference: intake.reference, submittedAt: intake.submitted_at, payload: intake.payload, files: signed });
    }
    return reply(origin, { success: false, error: "Unknown action" }, 400);
  } catch (error) {
    console.error(error);
    return reply(origin, { success: false, error: error instanceof Error ? error.message : "Request failed" }, 500);
  }
});
