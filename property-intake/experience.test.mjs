import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const experience = await readFile(new URL("./experience.js", import.meta.url), "utf8");
const styles = await readFile(new URL("./experience.css", import.meta.url), "utf8");
const manage = await readFile(new URL("../supabase/functions/manage-property-intake/index.ts", import.meta.url), "utf8");
const submit = await readFile(new URL("../supabase/functions/submit-property-intake/index.ts", import.meta.url), "utf8");
const migration = await readFile(new URL("../supabase/migrations/20260829190000_property_intake_draft_references.sql", import.meta.url), "utf8");

test("the property-intake tab uses J4LP brand icons", () => {
  assert.match(html, /\/images\/brand\/favicon-32\.png/);
  assert.match(html, /\/images\/brand\/favicon-180\.png/);
  assert.match(html, /experience\.js/);
  assert.match(html, /experience\.css/);
});

test("save, resume, clear-device, and final-summary controls are present", () => {
  assert.match(experience, /Save & Finish Later/);
  assert.match(experience, /Continue a Saved Intake/);
  assert.match(experience, /Start Over & Clear This Device/);
  assert.match(experience, /View, Print, or Save My Full Answers/);
  assert.match(experience, /The reference alone cannot open your answers/);
  assert.match(experience, /Use the private return link from your original email/);
});

test("ZIP is visually ordered before County", () => {
  const zip = styles.indexOf('input[name="zip"]');
  const county = styles.indexOf('input[name="county"]');
  assert.ok(zip >= 0 && county > zip);
  assert.match(styles, /input\[name="zip"\][^}]*order:3/);
  assert.match(styles, /input\[name="county"\][^}]*order:4/);
});

test("draft references are friendly labels and never direct credentials", () => {
  assert.match(migration, /draft_reference text/);
  assert.match(manage, /requestResumeLink/);
  assert.match(manage, /resume_token_hash: tokenHash/);
  assert.match(manage, /If that reference and email match an active draft/);
  assert.doesNotMatch(manage, /eq\("draft_reference"[^\n]+return reply\([^\n]+resumeToken/);
});

test("internal email uses the approved exact subject and smart display capitalization", () => {
  const exact = /New Property Intake Form from J4 Legacy Properties \| \$\{countyLabel\([^)]+\)\} \| \$\{fullName\}/g;
  assert.equal([...submit.matchAll(exact)].length, 2);
  assert.match(submit, /function smartTitle/);
});
