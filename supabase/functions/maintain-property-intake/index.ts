import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

serve(async (req) => {
  if (req.method !== "POST") return reply({ success: false, error: "Method not allowed" }, 405);
  const expected = Deno.env.get("INTAKE_MONITOR_SECRET") || "";
  const supplied = req.headers.get("x-intake-monitor-secret") || "";
  if (!expected || supplied !== expected) return reply({ success: false, error: "Forbidden" }, 403);
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceKey) throw new Error("Maintenance service is not configured");
    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: drafts, error: draftError } = await db.from("property_intake_drafts")
      .select("id")
      .eq("status", "draft")
      .lt("expires_at", new Date().toISOString())
      .limit(100);
    if (draftError) throw draftError;

    let filesDeleted = 0;
    for (const draft of drafts || []) {
      const { data: files, error: fileError } = await db.from("property_intake_files").select("id,storage_path").eq("draft_id", draft.id);
      if (fileError) throw fileError;
      const paths = (files || []).map((file) => file.storage_path).filter(Boolean);
      if (paths.length) {
        const { error: storageError } = await db.storage.from("property-intake-files").remove(paths);
        if (storageError) throw storageError;
      }
      const { error: deleteFilesError } = await db.from("property_intake_files").delete().eq("draft_id", draft.id);
      if (deleteFilesError) throw deleteFilesError;
      const { error: deleteDraftError } = await db.from("property_intake_drafts").delete().eq("id", draft.id).eq("status", "draft");
      if (deleteDraftError) throw deleteDraftError;
      filesDeleted += paths.length;
    }

    const webhookCutoff = new Date(Date.now() - 90 * 86400000).toISOString();
    const { error: webhookError, count: webhookEventsDeleted } = await db.from("resend_webhook_events").delete({ count: "exact" }).lt("received_at", webhookCutoff);
    if (webhookError) throw webhookError;
    return reply({ success: true, draftsDeleted: (drafts || []).length, filesDeleted, webhookEventsDeleted: webhookEventsDeleted || 0 });
  } catch (error) {
    console.error("Property intake maintenance failed", error);
    return reply({ success: false, error: "Property intake maintenance failed" }, 500);
  }
});
