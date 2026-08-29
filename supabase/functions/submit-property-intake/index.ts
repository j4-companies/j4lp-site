// J4 Legacy Properties rural-property intake.
// Owns the full workflow: validation -> Supabase record -> Resend receipt/alert.
// It deliberately contains no third-party CRM forwarding.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

type Intake = Record<string, unknown>;

const SITE_ORIGINS = new Set([
  "https://www.j4lp.com",
  "https://j4lp.com",
]);

function isAllowedOrigin(origin: string | null) {
  return Boolean(origin && SITE_ORIGINS.has(origin));
}

const AGENT_EMAILS: Record<string, string> = {
  "Cuatro Strack": "cuatro@j4lp.com",
  "Stephanie Strack": "stephanie@j4lp.com",
  "Sioux Smith": "sioux@j4lp.com",
  "Mason Abshire": "mason@j4lp.com",
  "Alexa Emmons": "alexa@j4lp.com",
  "Rozanna Roach": "rozanna@j4lp.com",
  "Cole Srubar": "cole@j4lp.com",
  "Harleigh Strack": "harleigh@j4lp.com",
  "Kayla Strack": "kayla@j4lp.com",
  "Julia Velazquez": "julia@j4lp.com",
};

const LABELS: Record<string, string> = {
  requestType: "Request", bpoPurpose: "BPO purpose", neededBy: "Needed by",
  referralSource: "How they heard about J4LP", address: "Street or 911 address",
  nearestTown: "Nearest town", county: "County", zip: "ZIP code", acreage: "Acreage",
  acreageBasis: "Acreage source", propertyId: "Appraisal district property ID",
  legalDescription: "Legal description", mapPin: "Map pin or coordinates",
  propertyType: "Property types", propertyTypeOther: "Property type description",
  residenceStatus: "Residence on the property", residenceCount: "Number of residences",
  residenceYearBuilt: "Residence year built", residenceSqFt: "Approximate living area",
  residenceBeds: "Bedrooms", residenceFullBaths: "Full bathrooms",
  residenceHalfBaths: "Half bathrooms", residenceStories: "Stories",
  residenceFoundation: "Foundation", residenceConstruction: "Construction",
  residenceCondition: "Residence condition", residenceFeatures: "Residence features",
  residenceUpdates: "Residence updates and details", tractCount: "Number of tracts or parcels",
  propertyName: "Property or ranch name", deedOwner: "Name on deed",
  ownershipType: "Ownership type", acquisition: "How and when acquired",
  inherited: "Inherited, trust or estate property", decisionMakers: "Decision-makers",
  occupancy: "Occupancy", currentUse: "Current use", landUseDetails: "Land and use details",
  agStatus: "Agricultural or timber valuation", agUse: "Qualifying agricultural use",
  agYears: "Years in qualification", agConcerns: "Ag documentation or rollback concerns",
  leaseStatus: "Leases or third-party use", leaseDetails: "Lease details",
  accessType: "Property access", roadName: "Access road", frontage: "Road frontage",
  easements: "Known easements or crossings", easementTypes: "Easement, line or crossing types",
  easementDetails: "Easement details", boundaryDetails: "Boundaries, fences or encroachments",
  restrictions: "Restrictions or POA/HOA", surveyStatus: "Survey status",
  surveyChanges: "Changes since the survey", surveyDetails: "Survey details", waterSources: "Water sources", wellCount: "Number of wells",
  wellDetails: "Well details", surfaceWaterDetails: "Pond, creek or irrigation details",
  septicType: "Wastewater", septicDetails: "Septic details", electric: "Electric service",
  utilitiesDetails: "Utility and communications details", improvements: "Other improvements",
  improvementsDetails: "Improvement details", fencing: "Fencing",
  roadCondition: "Internal roads and drainage", floodStatus: "Flood or floodway knowledge",
  floodDetails: "Flood and drainage details", mineralRights: "Mineral rights",
  rightsDetails: "Other rights and surface-use details", titleConcerns: "Title, lien or legal concerns",
  environmentalConcerns: "Environmental concerns", knownDefects: "Known defects or deferred maintenance",
  timeline: "Timing", reason: "Reason and desired outcome",
  priceExpectation: "Price or value expectation", priorMarketing: "Prior listing, appraisal or offers",
  accessForVisit: "Property visit and showing access", bpoRecipient: "BPO recipient",
  bpoEffectiveDate: "BPO effective date", bpoInspection: "BPO inspection preference",
  is1031: "1031 exchange involved", exchangeRole: "Exchange role",
  relinquishedClosing: "Relinquished-property closing", identifyDeadline: "45-day identification deadline",
  exchangeDeadline: "180-day completion deadline", qiStatus: "Qualified intermediary status",
  exchangeDetails: "1031 targets and adviser details", availableDocuments: "Documents available",
  firstName: "First name", lastName: "Last name", email: "Email", phone: "Mobile phone",
  mailingAddress: "Mailing address", contactMethod: "Preferred contact method",
  contactPermissions: "Ways client may be contacted", resourceInterests: "Information requested",
  contactTime: "Best time to contact", coOwnerContact: "Co-owner or decision-maker contact",
  agentRelationship: "Existing agent relationship", j4lpAgent: "J4LP agent",
  agentName: "Agent name", agentBrokerage: "Agent brokerage",
};

const SUMMARY_SECTIONS: Array<[string, string[]]> = [
  ["Request", ["requestType", "bpoPurpose", "neededBy", "referralSource"]],
  ["Property and residence", ["address", "nearestTown", "county", "zip", "acreage", "acreageBasis", "propertyId", "legalDescription", "mapPin", "propertyType", "propertyTypeOther", "residenceStatus", "residenceCount", "residenceYearBuilt", "residenceSqFt", "residenceBeds", "residenceFullBaths", "residenceHalfBaths", "residenceStories", "residenceFoundation", "residenceConstruction", "residenceCondition", "residenceFeatures", "residenceUpdates", "tractCount", "propertyName"]],
  ["Ownership and use", ["deedOwner", "ownershipType", "acquisition", "inherited", "decisionMakers", "occupancy", "currentUse", "landUseDetails", "agStatus", "agUse", "agYears", "agConcerns", "leaseStatus", "leaseDetails"]],
  ["Access, water and utilities", ["accessType", "roadName", "frontage", "easements", "easementTypes", "easementDetails", "boundaryDetails", "restrictions", "surveyStatus", "surveyChanges", "surveyDetails", "waterSources", "wellCount", "wellDetails", "surfaceWaterDetails", "septicType", "septicDetails", "electric", "utilitiesDetails"]],
  ["Improvements and diligence", ["improvements", "improvementsDetails", "fencing", "roadCondition", "floodStatus", "floodDetails", "mineralRights", "rightsDetails", "titleConcerns", "environmentalConcerns", "knownDefects", "availableDocuments"]],
  ["Timing and plans", ["timeline", "reason", "priceExpectation", "priorMarketing", "accessForVisit", "bpoRecipient", "bpoEffectiveDate", "bpoInspection", "is1031", "exchangeRole", "relinquishedClosing", "identifyDeadline", "exchangeDeadline", "qiStatus", "exchangeDetails"]],
  ["Contact and routing", ["firstName", "lastName", "email", "phone", "mailingAddress", "contactMethod", "contactPermissions", "contactTime", "coOwnerContact", "agentRelationship", "j4lpAgent", "agentName", "agentBrokerage", "resourceInterests"]],
];

const RESOURCE_INFO: Record<string, { copy: string; links: Array<{ href: string; label: string }> }> = {
  "Preparing my property for market": { copy: "Start with the facts buyers will verify: access, survey, water, ag records, leases, improvements, condition, and anything that affects possession.", links: [{ href: "https://www.j4lp.com/resources/property-intake/preparing-your-ranch-for-market.pdf", label: "Download the Preparing Your Ranch for Market guide" }, { href: "https://www.j4lp.com/selling", label: "See J4LP seller services" }] },
  "Understanding a broker price opinion": { copy: "A broker price opinion is a real-estate professional's opinion of value for an identified purpose. It is not an appraisal. J4LP will confirm whether a BPO fits the intended use before starting.", links: [{ href: "https://www.j4lp.com/resources/property-intake/broker-price-opinion-explained.pdf", label: "Download the BPO guide" }] },
  "1031 exchange basics": { copy: "Start with property use, the expected sale or closing date, and the right advisers. J4LP handles the real-estate side. A qualified intermediary and tax adviser should confirm eligibility, structure, and deadlines.", links: [{ href: "https://www.j4lp.com/buying-1031", label: "Review J4LP's 1031 land process" }] },
  "Buying rural property after I sell": { copy: "A useful replacement-property search starts with location, acreage, use, water, access, improvements, budget, and timing. Those facts help us screen land before it wastes your time.", links: [{ href: "https://www.j4lp.com/buying", label: "See J4LP buyer services" }] },
  "Water wells, septic and utilities": { copy: "Gather well reports, water tests, septic permits and service records, utility providers, meter details, and known problems. Rural infrastructure can change value and financing.", links: [{ href: "https://www.j4water.com", label: "Visit J4 Water Works" }] },
  "Surveys, access and agricultural records": { copy: "Useful records include the current survey or plat, deed and legal description, recorded easements, tax statements, ag or timber qualification records, leases, and boundary agreements.", links: [{ href: "https://www.j4lp.com/resources/property-intake/survey-boundaries-access-easements-checklist.pdf", label: "Download the survey, boundaries, access and easements checklist" }, { href: "https://www.j4lp.com/resources/property-intake/agricultural-valuation-records-checklist.pdf", label: "Download the agricultural valuation records checklist" }] },
  "Inherited or estate property": { copy: "Identify the deeded owners and the person with authority to act. Gather probate, trust, heirship, executor, or power-of-attorney documents before setting a sale timeline.", links: [{ href: "https://www.j4lp.com/resources/property-intake/preparing-an-estate-or-inherited-property.pdf", label: "Download the inherited-property guide" }] },
  "Fencing and property improvements": { copy: "Inventory fence types and condition, cross-fencing, gates, roads, barns, shops, pens, utilities, permits, major repairs, and what will stay with the sale.", links: [{ href: "https://www.j4lp.com/resources/property-intake/pre-market-property-improvement-checklist.pdf", label: "Download the pre-market property improvement checklist" }, { href: "https://www.j4fs.com", label: "Visit J4 Fencing" }] },
};

const requiredStrings = [
  "requestType", "address", "nearestTown", "county", "zip", "acreage", "acreageBasis",
  "residenceStatus", "deedOwner", "ownershipType", "occupancy", "agStatus",
  "leaseStatus", "easements", "septicType", "surveyStatus", "floodStatus",
  "mineralRights", "timeline", "is1031", "firstName", "lastName", "email", "phone",
  "contactMethod", "agentRelationship",
];
const requiredArrays = ["propertyType", "currentUse", "accessType", "waterSources", "contactPermissions"];

function corsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
  if (isAllowedOrigin(origin)) headers["Access-Control-Allow-Origin"] = origin!;
  return headers;
}

function text(value: unknown, max = 4000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function list(value: unknown, maxItems = 30) {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string").map((item) => item.trim().slice(0, 300)).filter(Boolean).slice(0, maxItems);
  }
  const single = text(value, 300);
  return single ? [single] : [];
}

function normalizePhone(value: unknown) {
  const digits = text(value, 80).replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function joinedList(value: unknown, max = 500) {
  return list(value).join(", ").slice(0, max);
}

async function connectCrmLead(supabase: ReturnType<typeof createClient>, body: Intake, isTest: boolean, assignedAgent: string) {
  if (isTest) return { leadId: null, matchMethod: null, syncError: null };

  try {
    const normalizedEmail = text(body.email, 320).toLowerCase();
    const normalizedPhone = normalizePhone(body.phone);
    const [emailResult, phoneResult] = await Promise.all([
      supabase.from("leads").select("id,name,email,phone,county,acreage,property_type,intent,property_ref").eq("email_normalized", normalizedEmail).limit(2),
      supabase.from("leads").select("id,name,email,phone,county,acreage,property_type,intent,property_ref").eq("phone_normalized", normalizedPhone).limit(2),
    ]);
    if (emailResult.error) throw emailResult.error;
    if (phoneResult.error) throw phoneResult.error;

    const emailMatches = emailResult.data || [];
    const phoneMatches = phoneResult.data || [];
    if (emailMatches.length > 1 || phoneMatches.length > 1) {
      return { leadId: null, matchMethod: null, syncError: "Multiple CRM leads match the submitted contact information; review required." };
    }

    const emailLead = emailMatches[0] || null;
    const phoneLead = phoneMatches[0] || null;
    if (emailLead && phoneLead && emailLead.id !== phoneLead.id) {
      return { leadId: null, matchMethod: null, syncError: "Submitted email and phone match different CRM leads; review required." };
    }

    let lead = emailLead || phoneLead;
    const matchMethod: "email" | "phone" | "created" = emailLead ? "email" : phoneLead ? "phone" : "created";
    const fullName = `${text(body.firstName, 120)} ${text(body.lastName, 120)}`.trim();

    if (!lead) {
      const newLead = {
        form_type: "Rural Property Intake",
        name: fullName,
        phone: text(body.phone, 80),
        email: normalizedEmail,
        timeline: text(body.timeline, 200) || null,
        message: `${text(body.requestType, 200)} for ${text(body.acreage, 80)} acres near ${text(body.nearestTown, 200)}. Intake reference pending.`,
        property_ref: text(body.address, 500),
        property_type: joinedList(body.propertyType, 500),
        county: text(body.county, 200),
        acreage: text(body.acreage, 80),
        intent: text(body.requestType, 200),
      };
      const created = await supabase.from("leads").insert(newLead).select("id,name,email,phone,county,acreage,property_type,intent,property_ref").single();
      if (created.error) throw created.error;
      lead = created.data;
    } else {
      const existingFirstName = text(lead.name, 120).toLowerCase();
      const submittedFirstName = text(body.firstName, 120).toLowerCase();
      const patch: Record<string, unknown> = {};
      if (!text(lead.name) || existingFirstName === submittedFirstName) patch.name = fullName;
      if (!text(lead.email)) patch.email = normalizedEmail;
      if (!text(lead.phone)) patch.phone = text(body.phone, 80);
      if (!text(lead.county)) patch.county = text(body.county, 200);
      if (!text(lead.acreage)) patch.acreage = text(body.acreage, 80);
      if (!text(lead.property_type)) patch.property_type = joinedList(body.propertyType, 500);
      if (!text(lead.intent)) patch.intent = text(body.requestType, 200);
      if (!text(lead.property_ref)) patch.property_ref = text(body.address, 500);
      if (Object.keys(patch).length) {
        const updated = await supabase.from("leads").update(patch).eq("id", lead.id);
        if (updated.error) throw updated.error;
      }
    }

    const note = [{
      time: new Date().toLocaleString("en-US", { timeZone: "America/Chicago" }),
      by: "Property intake",
      text: `${text(body.requestType, 200)} submitted for ${text(body.acreage, 80)} acres near ${text(body.nearestTown, 200)}.`,
    }];
    const statusResult = await supabase.from("hg_lead_status").upsert({
      lead_id: lead.id,
      status: "New",
      category: "Warm",
      assigned_to: assignedAgent,
      priority: text(body.timeline) === "As soon as possible" || text(body.is1031) !== "No" ? "High" : "Normal",
      crm_notes: note,
      last_touch_at: new Date().toISOString(),
    }, { onConflict: "lead_id", ignoreDuplicates: true });
    if (statusResult.error) throw statusResult.error;

    return { leadId: lead.id as string, matchMethod, syncError: null };
  } catch (error) {
    console.error("CRM lead connection failed", error);
    return { leadId: null, matchMethod: null, syncError: error instanceof Error ? error.message.slice(0, 1000) : String(error).slice(0, 1000) };
  }
}

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] || char);
}

function hasValue(value: unknown) {
  return Array.isArray(value) ? value.length > 0 : typeof value === "boolean" ? value : Boolean(text(value));
}

function missingFields(body: Intake) {
  const missing = requiredStrings.filter((key) => !text(body[key]));
  for (const key of requiredArrays) if (list(body[key]).length === 0) missing.push(key);
  if (body.consent !== true) missing.push("consent");
  if (body.acknowledgement !== true) missing.push("acknowledgement");
  if (list(body.propertyType).includes("Other") && !text(body.propertyTypeOther)) missing.push("propertyTypeOther");
  if (!["", "No residence", "Unknown"].includes(text(body.residenceStatus)) && !text(body.residenceCount)) missing.push("residenceCount");
  if (text(body.agStatus) === "Yes" && !text(body.agUse)) missing.push("agUse");
  if (text(body.leaseStatus) === "Yes" && !text(body.leaseDetails)) missing.push("leaseDetails");
  const water = list(body.waterSources);
  if ((water.includes("Private water well") || water.includes("Shared water well")) && !text(body.wellCount)) missing.push("wellCount");
  if (["Existing survey dated within the past 7 years", "Existing survey more than 7 years old"].includes(text(body.surveyStatus)) && !text(body.surveyChanges)) missing.push("surveyChanges");
  if (["Broker price opinion", "Listing consultation and broker price opinion"].includes(text(body.requestType)) && !text(body.bpoPurpose)) missing.push("bpoPurpose");
  if (text(body.is1031) !== "No" && !text(body.exchangeRole)) missing.push("exchangeRole");
  if (text(body.agentRelationship) === "Yes, a J4LP agent" && !text(body.j4lpAgent)) missing.push("j4lpAgent");
  if (text(body.agentRelationship) === "Yes, an agent from another brokerage" && !text(body.agentName)) missing.push("agentName");
  if (text(body.j4lpAgent) === "Another J4LP agent or not listed" && !text(body.agentName)) missing.push("agentName");
  if (!/^\S+@\S+\.\S+$/.test(text(body.email, 320))) missing.push("email");
  const phoneDigits = text(body.phone).replace(/\D/g, "");
  const usPhone = phoneDigits.length === 11 && phoneDigits.startsWith("1") ? phoneDigits.slice(1) : phoneDigits;
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(usPhone)) missing.push("phone");
  return [...new Set(missing)];
}

function summaryHtml(body: Intake) {
  return SUMMARY_SECTIONS.map(([title, keys]) => {
    const rows = keys.filter((key) => hasValue(body[key])).map((key) => {
      const raw = Array.isArray(body[key]) ? list(body[key]).join(", ") : body[key];
      return `<tr><td style="padding:7px 10px;border-bottom:1px solid #e7e3e0;color:#666;width:34%;vertical-align:top">${escapeHtml(LABELS[key] || key)}</td><td style="padding:7px 10px;border-bottom:1px solid #e7e3e0;color:#171717;white-space:pre-wrap">${escapeHtml(raw)}</td></tr>`;
    }).join("");
    return rows ? `<h3 style="font-family:Georgia,serif;color:#500203;margin:24px 0 8px">${escapeHtml(title)}</h3><table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>` : "";
  }).join("");
}

function resourcesHtml(body: Intake) {
  return list(body.resourceInterests).filter((item) => item !== "Nothing right now").map((item) => {
    const resource = RESOURCE_INFO[item];
    if (!resource) return "";
    const links = resource.links.map((link) => `<br><a href="${escapeHtml(link.href)}" style="color:#500203;font-weight:700">${escapeHtml(link.label)}</a>`).join("");
    return `<li style="margin:0 0 18px"><strong>${escapeHtml(item)}</strong><br>${escapeHtml(resource.copy)}${links}</li>`;
  }).join("");
}

function emailFrame(inner: string, preheader: string) {
  return `<!doctype html><html><body style="margin:0;background:#f2f0ee;font-family:Arial,sans-serif;color:#171717"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px"><table role="presentation" width="100%" style="max-width:680px;background:#fff;border-top:6px solid #500203"><tr><td style="padding:32px"><div style="font-family:Georgia,serif;font-size:24px;color:#500203;font-weight:700">J4 Legacy Properties</div><div style="font-size:12px;color:#666;margin-top:4px">Texas Land &amp; Ranch Real Estate · El Campo, Texas</div>${inner}<hr style="border:0;border-top:1px solid #ddd;margin:28px 0"><p style="font-size:12px;line-height:1.55;color:#666">J4 Legacy Properties, LLC · 1379 CR 408, El Campo, TX 77437 · 833-543-LAND (5263)<br>This intake is not a contract, listing agreement, appraisal, seller disclosure, or tax or legal advice.</p></td></tr></table></td></tr></table></body></html>`;
}

async function sendResend(apiKey: string, payload: Record<string, unknown>, idempotencyKey: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey.slice(0, 256) },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Resend ${response.status}: ${JSON.stringify(result).slice(0, 500)}`);
  return result as { id?: string };
}

async function hashIp(ip: string, salt: string) {
  const bytes = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function verifyTurnstile(token: unknown, remoteIp: string): Promise<boolean> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY") || "";
  if (!secret || typeof token !== "string" || !token.trim()) return false;
  const form = new FormData();
  form.set("secret", secret);
  form.set("response", token.trim());
  if (remoteIp !== "unknown") form.set("remoteip", remoteIp);
  const verifyResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  if (!verifyResponse.ok) return false;
  const result = await verifyResponse.json() as { success?: boolean; hostname?: string };
  return result.success === true && (result.hostname === "j4lp.com" || result.hostname === "www.j4lp.com");
}

function makeReference(isTest: boolean) {
  const now = new Date();
  const date = now.toISOString().slice(2, 10).replaceAll("-", "");
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase();
  return `${isTest ? "TEST" : "J4"}-${date}-${suffix}`;
}

async function makeViewToken(reference: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(salt), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`property-intake-view:${reference}`)));
  return Array.from(signature).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function ensureViewAccess(supabase: ReturnType<typeof createClient>, intakeId: string, viewToken: string, hashSalt: string) {
  const viewTokenHash = await hashIp(viewToken, hashSalt);
  const { data: existing, error: lookupError } = await supabase.from("property_intake_access").select("intake_id").eq("intake_id", intakeId).eq("view_token_hash", viewTokenHash).is("revoked_at", null).maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return;
  const { error: accessError } = await supabase.from("property_intake_access").insert({ intake_id: intakeId, view_token_hash: viewTokenHash });
  if (accessError) throw accessError;
}

function safeSourceUrl(value: unknown) {
  try {
    const url = new URL(text(value, 1000));
    return `${url.origin}${url.pathname}`;
  } catch {
    return null;
  }
}

async function retryMissingEmails() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("PROJECT_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY") || "";
  const resendKey = Deno.env.get("RESEND_API_KEY") || "";
  const hashSalt = Deno.env.get("INTAKE_HASH_SALT") || "";
  if (!supabaseUrl || !serviceKey || !resendKey || !hashSalt) throw new Error("Intake monitor is not fully configured");
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: rows, error } = await supabase.from("property_intakes")
    .select("id,reference,submitted_at,first_name,last_name,email,phone,county,property_address,nearest_town,timeline,is_1031,selected_agent,agent_relationship,assigned_agent_email,supervisor_email,payload,lead_id,crm_match_method,crm_sync_error,client_receipt_sent_at,internal_alert_sent_at,client_receipt_retry_count,internal_alert_retry_count,last_email_retry_at")
    .eq("is_test", false)
    .lte("submitted_at", fiveMinutesAgo)
    .or("client_receipt_sent_at.is.null,internal_alert_sent_at.is.null")
    .order("submitted_at", { ascending: true })
    .limit(50);
  if (error) throw error;

  const attempted: string[] = [];
  for (const row of rows || []) {
    if (row.last_email_retry_at && new Date(row.last_email_retry_at).getTime() > Date.now() - 5 * 60 * 1000) continue;
    const retryClient = !row.client_receipt_sent_at && Number(row.client_receipt_retry_count || 0) < 3;
    const retryInternal = !row.internal_alert_sent_at && Number(row.internal_alert_retry_count || 0) < 3;
    if (!retryClient && !retryInternal) continue;
    const claimAt = new Date().toISOString();
    let claimQuery = supabase.from("property_intakes").update({ last_email_retry_at: claimAt }).eq("id", row.id);
    claimQuery = row.last_email_retry_at ? claimQuery.eq("last_email_retry_at", row.last_email_retry_at) : claimQuery.is("last_email_retry_at", null);
    const { data: claimed, error: claimError } = await claimQuery.select("id").maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) continue;

    const body = (row.payload || {}) as Intake;
    const viewToken = await makeViewToken(row.reference, hashSalt);
    await ensureViewAccess(supabase, row.id, viewToken, hashSalt);
    const { count: fileCount } = await supabase.from("property_intake_files").select("id", { count: "exact", head: true }).eq("intake_id", row.id);
    const viewUrl = `https://www.j4lp.com/property-intake/?submission=${encodeURIComponent(row.reference)}&token=${encodeURIComponent(viewToken)}`;
    const fullName = `${text(row.first_name, 120)} ${text(row.last_name, 120)}`.trim();
    const assignedEmail = text(row.assigned_agent_email, 320) || "stephanie@j4lp.com";
    const supervisorEmail = text(row.supervisor_email, 320) || null;
    const selectedAgent = text(row.selected_agent, 200);
    const agentName = selectedAgent || "Stephanie";
    const requested = resourcesHtml(body);
    const resources = requested ? `<h2 style="font-family:Georgia,serif;color:#500203;margin:28px 0 10px">Information you requested</h2><ul style="padding-left:20px;line-height:1.55">${requested}</ul>` : "";
    const clientHtml = emailFrame(`<h1 style="font-family:Georgia,serif;font-size:30px;line-height:1.2;margin:28px 0 12px">We received your property intake.</h1><p style="line-height:1.65">Hi ${escapeHtml(text(row.first_name, 120))},</p><p style="line-height:1.65">Your answers are saved under reference <strong>${escapeHtml(row.reference)}</strong>. ${escapeHtml(agentName)} will review the property details and contact you using the methods you selected.</p><p><a href="${viewUrl}" style="display:inline-block;background:#500203;color:#fff;padding:14px 20px;text-decoration:none">View my submitted intake${fileCount ? ` and ${fileCount} document${fileCount === 1 ? "" : "s"}` : ""}</a></p><p style="font-size:13px;color:#555">Keep this private link for your records. Uploaded documents are not attached to email.</p>${resources}<h2 style="font-family:Georgia,serif;color:#500203;margin:28px 0 10px">Your submitted answers</h2>${summaryHtml(body)}<p style="line-height:1.65;margin-top:28px">If something needs correcting, reply to this email or call 833-543-LAND.</p><p style="line-height:1.65">${escapeHtml(agentName)}<br>J4 Legacy Properties</p>`, `Property intake ${row.reference} received by J4 Legacy Properties.`);
    const urgent = text(row.timeline) === "As soon as possible" || text(row.is_1031) !== "No";
    const crmStatus = row.lead_id ? `Linked to the Leads tab (${text(row.crm_match_method)})` : `NOT LINKED — manual review needed${row.crm_sync_error ? `: ${text(row.crm_sync_error)}` : ""}`;
    const internalHtml = emailFrame(`<h1 style="font-family:Georgia,serif;font-size:28px;line-height:1.2;margin:28px 0 12px">${urgent ? "Priority review: " : "New property intake: "}${escapeHtml(fullName)}</h1><p style="line-height:1.65"><strong>Reference:</strong> ${escapeHtml(row.reference)}<br><strong>CRM lead:</strong> ${escapeHtml(crmStatus)}<br><strong>Documents:</strong> ${fileCount || 0}<br><strong>Route:</strong> ${escapeHtml(selectedAgent || text(row.agent_relationship))}<br><strong>Property:</strong> ${escapeHtml(text(row.property_address))}, ${escapeHtml(text(row.nearest_town))}, ${escapeHtml(text(row.county))} County<br><strong>Request:</strong> ${escapeHtml(text(body.requestType))}<br><strong>Timing:</strong> ${escapeHtml(text(row.timeline))}<br><strong>1031:</strong> ${escapeHtml(text(row.is_1031))}${text(body.exchangeRole) ? `, ${escapeHtml(text(body.exchangeRole))}` : ""}<br><strong>Preferred contact:</strong> ${escapeHtml(text(body.contactMethod))} · ${escapeHtml(text(row.phone))} · ${escapeHtml(text(row.email))}</p><p><a href="${viewUrl}" style="display:inline-block;background:#500203;color:#fff;padding:12px 18px;text-decoration:none">Open secure intake and documents</a></p>${summaryHtml(body)}`, `${urgent ? "Priority " : "New "}property intake ${row.reference} from ${fullName}.`);
    const internalRecipients = [...new Set(["stephanie@j4lp.com", assignedEmail, supervisorEmail].filter(Boolean))] as string[];
    const updates: Record<string, unknown> = {};
    const emailErrors: string[] = [];

    if (retryClient) {
      updates.client_receipt_retry_count = Number(row.client_receipt_retry_count || 0) + 1;
      try {
        const sent = await sendResend(resendKey, { from: "J4 Legacy Properties <intake@j4lp.com>", to: [text(row.email, 320)], reply_to: assignedEmail, subject: `We received your property intake | ${row.reference}`, html: clientHtml }, `property-intake/client/${row.reference}`);
        if (sent.id) {
          updates.client_receipt_id = sent.id;
          updates.client_receipt_sent_at = new Date().toISOString();
          updates.client_receipt_delivery_status = "sent";
        }
      } catch (sendError) {
        emailErrors.push(`Client retry: ${sendError instanceof Error ? sendError.message : String(sendError)}`);
      }
    }
    if (retryInternal) {
      updates.internal_alert_retry_count = Number(row.internal_alert_retry_count || 0) + 1;
      try {
        const sent = await sendResend(resendKey, { from: "J4 Legacy Properties <intake@j4lp.com>", to: internalRecipients, reply_to: text(row.email, 320), subject: `${!row.lead_id ? "CRM LINK REVIEW | " : urgent ? "PRIORITY | " : ""}New property intake | ${text(row.county)} County | ${fullName}`, html: internalHtml }, `property-intake/internal/${row.reference}`);
        if (sent.id) {
          updates.internal_alert_id = sent.id;
          updates.internal_alert_sent_at = new Date().toISOString();
          updates.internal_alert_delivery_status = "sent";
        }
      } catch (sendError) {
        emailErrors.push(`Internal retry: ${sendError instanceof Error ? sendError.message : String(sendError)}`);
      }
    }
    updates.email_error = emailErrors.length ? emailErrors.join(" | ").slice(0, 4000) : null;
    const { error: updateError } = await supabase.from("property_intakes").update(updates).eq("id", row.id);
    if (updateError) throw updateError;
    attempted.push(row.reference);
  }

  const { data: unresolvedRows, error: unresolvedError } = await supabase.from("property_intakes")
    .select("reference,client_receipt_sent_at,internal_alert_sent_at,client_receipt_retry_count,internal_alert_retry_count")
    .eq("is_test", false)
    .lte("submitted_at", fiveMinutesAgo)
    .or("client_receipt_sent_at.is.null,internal_alert_sent_at.is.null")
    .limit(50);
  if (unresolvedError) throw unresolvedError;
  const { data: deliveryFailures, error: deliveryError } = await supabase.from("property_intakes")
    .select("reference,client_receipt_sent_at,internal_alert_sent_at,client_receipt_retry_count,internal_alert_retry_count,client_receipt_delivery_status,internal_alert_delivery_status")
    .eq("is_test", false)
    .or("client_receipt_delivery_status.in.(bounced,failed,suppressed),internal_alert_delivery_status.in.(bounced,failed,suppressed)")
    .limit(50);
  if (deliveryError) throw deliveryError;
  const unresolvedByReference = new Map<string, Record<string, unknown>>();
  for (const row of [...(unresolvedRows || []), ...(deliveryFailures || [])]) unresolvedByReference.set(String(row.reference), row);
  return { success: true, checked: (rows || []).length, attempted, unresolved: [...unresolvedByReference.values()] };
}

serve(async (req) => {
  const requestUrl = new URL(req.url);
  const monitorAction = requestUrl.searchParams.get("action") || "";
  const expectedMonitorSecret = Deno.env.get("INTAKE_MONITOR_SECRET") || "";
  const suppliedMonitorSecret = req.headers.get("x-intake-monitor-secret") || "";
  const monitorAuthorized = Boolean(expectedMonitorSecret && suppliedMonitorSecret === expectedMonitorSecret);
  if (monitorAction === "retryEmails") {
    if (req.method !== "POST") return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
    if (!monitorAuthorized) return new Response(JSON.stringify({ success: false, error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
    try {
      return new Response(JSON.stringify(await retryMissingEmails()), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (error) {
      console.error("Intake email reconciliation failed", error);
      return new Response(JSON.stringify({ success: false, error: "Email reconciliation failed" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }
  const isCanary = monitorAction === "canary" && monitorAuthorized;
  if (monitorAction === "canary" && !isCanary) return new Response(JSON.stringify({ success: false, error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);
  if (!isCanary && !isAllowedOrigin(origin)) return new Response(JSON.stringify({ success: false, error: "Origin not allowed" }), { status: 403, headers: { ...headers, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), { status: 405, headers: { ...headers, "Content-Type": "application/json" } });
  if (!(req.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) return new Response(JSON.stringify({ success: false, error: "JSON required" }), { status: 415, headers: { ...headers, "Content-Type": "application/json" } });

  try {
    const size = Number(req.headers.get("content-length") || "0");
    if (size > 220_000) return new Response(JSON.stringify({ success: false, error: "Submission is too large" }), { status: 413, headers: { ...headers, "Content-Type": "application/json" } });
    const raw = await req.text();
    if (new TextEncoder().encode(raw).byteLength > 220_000) return new Response(JSON.stringify({ success: false, error: "Submission is too large" }), { status: 413, headers: { ...headers, "Content-Type": "application/json" } });
    const body = JSON.parse(raw) as Intake;
    // Turnstile is the public bot boundary. Browser/password-manager autofill can
    // populate the legacy honeypot, so it must never create a false success.
    delete body.companyWebsite;

    const requestIp = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!isCanary && !(await verifyTurnstile(body.turnstileToken, requestIp))) {
      return new Response(JSON.stringify({ success: false, error: "Security verification failed. Please refresh and try again." }), { status: 403, headers: { ...headers, "Content-Type": "application/json" } });
    }

    const submissionKey = text(body.submissionKey, 40);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionKey)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid submission key" }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
    }
    const missing = missingFields(body);
    if (missing.length) return new Response(JSON.stringify({ success: false, error: "Required information is missing", fields: missing }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("PROJECT_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY") || "";
    const resendKey = Deno.env.get("RESEND_API_KEY") || "";
    const hashSalt = Deno.env.get("INTAKE_HASH_SALT") || "";
    if (!supabaseUrl || !serviceKey || !resendKey || !hashSalt) throw new Error("Intake service is not fully configured");
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: duplicate, error: duplicateError } = await supabase.from("property_intakes").select("id,reference,client_receipt_sent_at,internal_alert_sent_at,lead_id,crm_match_method,crm_sync_error").eq("submission_key", submissionKey).maybeSingle();
    if (duplicateError) throw duplicateError;
    if (duplicate) {
      const duplicateDraftKey = text(body.draftKey, 40);
      const duplicateResumeToken = text(body.resumeToken, 128);
      if (duplicateDraftKey || duplicateResumeToken) {
        if (!duplicateDraftKey || !duplicateResumeToken) return new Response(JSON.stringify({ success: false, error: "The saved-draft credentials are incomplete." }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
        const tokenHash = await hashIp(duplicateResumeToken, hashSalt);
        const { data: foundDraft, error: draftError } = await supabase.from("property_intake_drafts").select("id,email,status,expires_at,submitted_intake_id").eq("draft_key", duplicateDraftKey).eq("resume_token_hash", tokenHash).maybeSingle();
        if (draftError) throw draftError;
        const belongsToDuplicate = foundDraft?.status === "submitted" && foundDraft.submitted_intake_id === duplicate.id;
        if (!foundDraft || (!belongsToDuplicate && (foundDraft.status !== "draft" || new Date(foundDraft.expires_at) <= new Date())) || String(foundDraft.email).toLowerCase() !== text(body.email, 320).toLowerCase()) {
          return new Response(JSON.stringify({ success: false, error: "This saved draft is invalid, expired, or belongs to a different email address." }), { status: 403, headers: { ...headers, "Content-Type": "application/json" } });
        }
        const { error: filesError } = await supabase.from("property_intake_files").update({ intake_id: duplicate.id }).eq("draft_id", foundDraft.id).is("intake_id", null);
        if (filesError) throw filesError;
        const { error: draftUpdateError } = await supabase.from("property_intake_drafts").update({ status: "submitted", submitted_intake_id: duplicate.id, updated_at: new Date().toISOString() }).eq("id", foundDraft.id);
        if (draftUpdateError) throw draftUpdateError;
      }
      const viewToken = await makeViewToken(duplicate.reference, hashSalt);
      await ensureViewAccess(supabase, duplicate.id, viewToken, hashSalt);
      const { count: fileCount } = await supabase.from("property_intake_files").select("id", { count: "exact", head: true }).eq("intake_id", duplicate.id);
      const viewUrl = `https://www.j4lp.com/property-intake/?submission=${encodeURIComponent(duplicate.reference)}&token=${encodeURIComponent(viewToken)}`;
      return new Response(JSON.stringify({ success: true, stored: true, duplicate: true, reference: duplicate.reference, receiptSent: Boolean(duplicate.client_receipt_sent_at), internalAlertSent: Boolean(duplicate.internal_alert_sent_at), crmLinked: Boolean(duplicate.lead_id), crmMatchMethod: duplicate.crm_match_method, crmSyncError: duplicate.crm_sync_error, viewUrl, fileCount: fileCount || 0 }), { status: 200, headers: { ...headers, "Content-Type": "application/json" } });
    }

    const draftKey = text(body.draftKey, 40);
    const resumeToken = text(body.resumeToken, 128);
    let draft: { id: string } | null = null;
    if (draftKey || resumeToken) {
      if (!draftKey || !resumeToken) return new Response(JSON.stringify({ success: false, error: "The saved-draft credentials are incomplete." }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
      const tokenHash = await hashIp(resumeToken, hashSalt);
      const { data: foundDraft, error: draftError } = await supabase.from("property_intake_drafts").select("id,email,status,expires_at").eq("draft_key", draftKey).eq("resume_token_hash", tokenHash).maybeSingle();
      if (draftError) throw draftError;
      if (!foundDraft || foundDraft.status !== "draft" || new Date(foundDraft.expires_at) <= new Date() || String(foundDraft.email).toLowerCase() !== text(body.email, 320).toLowerCase()) {
        return new Response(JSON.stringify({ success: false, error: "This saved draft is invalid, expired, or belongs to a different email address." }), { status: 403, headers: { ...headers, "Content-Type": "application/json" } });
      }
      draft = { id: foundDraft.id };
    }

    const normalizedEmail = text(body.email, 320).toLowerCase();
    const ip = requestIp;
    const ipHash = await hashIp(ip, hashSalt);
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const [emailRecent, ipRecent] = await Promise.all([
      supabase.from("property_intakes").select("id").eq("email", normalizedEmail).gte("submitted_at", since).limit(3),
      supabase.from("property_intakes").select("id").eq("request_ip_hash", ipHash).gte("submitted_at", since).limit(5),
    ]);
    if (emailRecent.error) throw emailRecent.error;
    if (ipRecent.error) throw ipRecent.error;
    if ((emailRecent.data?.length || 0) >= 3 || (ipRecent.data?.length || 0) >= 5) return new Response(JSON.stringify({ success: false, error: "Too many recent submissions. Call 833-543-LAND if you need immediate help." }), { status: 429, headers: { ...headers, "Content-Type": "application/json" } });

    const relationship = text(body.agentRelationship);
    const selectedAgent = relationship === "Yes, a J4LP agent" ? text(body.j4lpAgent) : "";
    const assignedEmail = AGENT_EMAILS[selectedAgent] || "stephanie@j4lp.com";
    const supervisorEmail = selectedAgent === "Alexa Emmons" ? "sioux@j4lp.com" : null;
    const isTest = body.testMode === true && normalizedEmail === "stephanie@j4lp.com";
    const reference = makeReference(isTest);
    const assignedAgent = selectedAgent || "Stephanie Strack";
    const crm = await connectCrmLead(supabase, body, isTest, assignedAgent);
    const cleanPayload = { ...body };
    delete cleanPayload.companyWebsite;
    delete cleanPayload.submissionKey;
    delete cleanPayload.testMode;
    delete cleanPayload.draftKey;
    delete cleanPayload.resumeToken;
    delete cleanPayload.turnstileToken;
    delete cleanPayload.sourceUrl;

    const row = {
      submission_key: submissionKey,
      reference,
      status: isTest ? "test" : "new",
      is_test: isTest,
      first_name: text(body.firstName, 120), last_name: text(body.lastName, 120),
      email: normalizedEmail, phone: text(body.phone, 80), request_type: text(body.requestType, 200),
      property_address: text(body.address, 500), nearest_town: text(body.nearestTown, 200),
      county: text(body.county, 200), acreage: text(body.acreage, 80), property_type: joinedList(body.propertyType, 500),
      residence_status: text(body.residenceStatus, 200), timeline: text(body.timeline, 200),
      is_1031: text(body.is1031, 120), exchange_role: text(body.exchangeRole, 200) || null,
      agent_relationship: relationship, selected_agent: selectedAgent || null,
      outside_agent_name: text(body.agentName, 200) || null, assigned_agent_email: assignedEmail,
      supervisor_email: supervisorEmail, contact_permissions: list(body.contactPermissions),
      resource_interests: list(body.resourceInterests), payload: cleanPayload,
      source_url: safeSourceUrl(body.sourceUrl), user_agent: text(req.headers.get("user-agent"), 1000) || null,
      request_ip_hash: ipHash,
      lead_id: crm.leadId,
      crm_match_method: crm.matchMethod,
      crm_synced_at: crm.leadId ? new Date().toISOString() : null,
      crm_sync_error: crm.syncError,
    };
    const { data: inserted, error: insertError } = await supabase.from("property_intakes").insert(row).select("id").single();
    if (insertError) throw insertError;

    const viewToken = await makeViewToken(reference, hashSalt);
    await ensureViewAccess(supabase, inserted.id, viewToken, hashSalt);
    if (draft) {
      const { error: filesError } = await supabase.from("property_intake_files").update({ intake_id: inserted.id }).eq("draft_id", draft.id);
      if (filesError) throw filesError;
      const { error: draftUpdateError } = await supabase.from("property_intake_drafts").update({ status: "submitted", submitted_intake_id: inserted.id, updated_at: new Date().toISOString() }).eq("id", draft.id);
      if (draftUpdateError) throw draftUpdateError;
    }
    const { count: fileCount } = await supabase.from("property_intake_files").select("id", { count: "exact", head: true }).eq("intake_id", inserted.id);
    const viewUrl = `https://www.j4lp.com/property-intake/?submission=${encodeURIComponent(reference)}&token=${encodeURIComponent(viewToken)}`;

    const fullName = `${text(body.firstName, 120)} ${text(body.lastName, 120)}`.trim();
    const agentName = selectedAgent || "Stephanie";
    const requested = resourcesHtml(body);
    const resources = requested ? `<h2 style="font-family:Georgia,serif;color:#500203;margin:28px 0 10px">Information you requested</h2><ul style="padding-left:20px;line-height:1.55">${requested}</ul>` : "";
    const clientHtml = emailFrame(`<h1 style="font-family:Georgia,serif;font-size:30px;line-height:1.2;margin:28px 0 12px">We received your property intake.</h1><p style="line-height:1.65">Hi ${escapeHtml(text(body.firstName, 120))},</p><p style="line-height:1.65">Your answers are saved under reference <strong>${escapeHtml(reference)}</strong>. ${escapeHtml(agentName)} will review the property details and contact you using the methods you selected.</p><p><a href="${viewUrl}" style="display:inline-block;background:#500203;color:#fff;padding:14px 20px;text-decoration:none">View my submitted intake${fileCount ? ` and ${fileCount} document${fileCount === 1 ? "" : "s"}` : ""}</a></p><p style="font-size:13px;color:#555">Keep this private link for your records. Uploaded documents are not attached to email.</p>${resources}<h2 style="font-family:Georgia,serif;color:#500203;margin:28px 0 10px">Your submitted answers</h2>${summaryHtml(body)}<p style="line-height:1.65;margin-top:28px">If something needs correcting, reply to this email or call 833-543-LAND.</p><p style="line-height:1.65">${escapeHtml(agentName)}<br>J4 Legacy Properties</p>`, `Property intake ${reference} received by J4 Legacy Properties.`);
    const urgent = text(body.timeline) === "As soon as possible" || text(body.is1031) !== "No";
    const crmStatus = crm.leadId
      ? `Linked to the Leads tab (${crm.matchMethod})`
      : isTest
        ? "Test submission — no CRM lead created"
        : `NOT LINKED — manual review needed${crm.syncError ? `: ${crm.syncError}` : ""}`;
    const internalHtml = emailFrame(`<h1 style="font-family:Georgia,serif;font-size:28px;line-height:1.2;margin:28px 0 12px">${urgent ? "Priority review: " : "New property intake: "}${escapeHtml(fullName)}</h1><p style="line-height:1.65"><strong>Reference:</strong> ${escapeHtml(reference)}<br><strong>CRM lead:</strong> ${escapeHtml(crmStatus)}<br><strong>Documents:</strong> ${fileCount || 0}<br><strong>Route:</strong> ${escapeHtml(selectedAgent || relationship)}<br><strong>Property:</strong> ${escapeHtml(text(body.address))}, ${escapeHtml(text(body.nearestTown))}, ${escapeHtml(text(body.county))} County<br><strong>Request:</strong> ${escapeHtml(text(body.requestType))}<br><strong>Timing:</strong> ${escapeHtml(text(body.timeline))}<br><strong>1031:</strong> ${escapeHtml(text(body.is1031))}${text(body.exchangeRole) ? `, ${escapeHtml(text(body.exchangeRole))}` : ""}<br><strong>Preferred contact:</strong> ${escapeHtml(text(body.contactMethod))} · ${escapeHtml(text(body.phone))} · ${escapeHtml(normalizedEmail)}</p><p><a href="${viewUrl}" style="display:inline-block;background:#500203;color:#fff;padding:12px 18px;text-decoration:none">Open secure intake and documents</a></p>${summaryHtml(body)}`, `${urgent ? "Priority " : "New "}property intake ${reference} from ${fullName}.`);

    const internalRecipients = [...new Set(["stephanie@j4lp.com", assignedEmail, supervisorEmail].filter(Boolean))] as string[];
    let clientReceiptId: string | null = null;
    let internalAlertId: string | null = null;
    const emailErrors: string[] = [];
    try {
      const sent = await sendResend(resendKey, { from: "J4 Legacy Properties <intake@j4lp.com>", to: [normalizedEmail], reply_to: assignedEmail, subject: `We received your property intake | ${reference}`, html: clientHtml }, `property-intake/client/${reference}`);
      clientReceiptId = sent.id || null;
    } catch (error) { emailErrors.push(`Client receipt: ${error instanceof Error ? error.message : String(error)}`); }
    try {
      const sent = await sendResend(resendKey, { from: "J4 Legacy Properties <intake@j4lp.com>", to: internalRecipients, reply_to: normalizedEmail, subject: `${!crm.leadId && !isTest ? "CRM LINK REVIEW | " : urgent ? "PRIORITY | " : ""}New property intake | ${text(body.county)} County | ${fullName}`, html: internalHtml }, `property-intake/internal/${reference}`);
      internalAlertId = sent.id || null;
    } catch (error) { emailErrors.push(`Internal alert: ${error instanceof Error ? error.message : String(error)}`); }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase.from("property_intakes").update({
      client_receipt_id: clientReceiptId, internal_alert_id: internalAlertId,
      client_receipt_sent_at: clientReceiptId ? now : null,
      internal_alert_sent_at: internalAlertId ? now : null,
      client_receipt_delivery_status: clientReceiptId ? "sent" : null,
      internal_alert_delivery_status: internalAlertId ? "sent" : null,
      email_error: emailErrors.length ? emailErrors.join(" | ").slice(0, 4000) : null,
    }).eq("submission_key", submissionKey);
    if (updateError) console.error("Intake email-status update failed", updateError);

    return new Response(JSON.stringify({ success: true, stored: true, reference, receiptSent: Boolean(clientReceiptId), internalAlertSent: Boolean(internalAlertId), crmLinked: Boolean(crm.leadId), crmMatchMethod: crm.matchMethod, crmSyncError: crm.syncError, viewUrl, fileCount: fileCount || 0 }), { status: 200, headers: { ...headers, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Property intake failed", error);
    return new Response(JSON.stringify({ success: false, error: "We could not save the intake. Please call 833-543-LAND." }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
  }
});
