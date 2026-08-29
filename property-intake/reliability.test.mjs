import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const SOURCE = await readFile(new URL("./reliability.js", import.meta.url), "utf8");
const SUBMIT = "https://rqnvfruyhkkmsqvzqdli.supabase.co/functions/v1/submit-property-intake";
const MANAGE = "https://rqnvfruyhkkmsqvzqdli.supabase.co/functions/v1/manage-property-intake";
const LOCAL_KEY = "j4lp-property-intake-autosave-v1";
const SERVER_KEY = "j4lp-property-intake-server-draft-v1";

function makeHarness(responses = []) {
  class Storage {
    #values = new Map();
    getItem(key) { return this.#values.has(key) ? this.#values.get(key) : null; }
    setItem(key, value) { this.#values.set(key, String(value)); }
    removeItem(key) { this.#values.delete(key); }
  }
  const calls = [];
  const note = { textContent: "", setAttribute() {} };
  const honeypot = { value: "autofilled", disabled: false };
  const document = {
    documentElement: {},
    visibilityState: "visible",
    addEventListener() {},
    querySelector(selector) {
      if (selector === ".autosave-note") return note;
      if (selector === '[name="companyWebsite"]') return honeypot;
      if (selector === '[name="cf-turnstile-response"]') return { value: "turnstile-test-token" };
      return null;
    },
  };
  const localStorage = new Storage();
  const window = {
    localStorage,
    location: { origin: "https://www.j4lp.com", pathname: "/property-intake/", hash: "", search: "" },
    history: { replaceState() {} },
    addEventListener() {},
    dispatchEvent() {},
    fetch: async (input, init = {}) => {
      calls.push({ input: String(input), init });
      const next = responses.shift();
      if (!next) throw new Error("No mocked response available");
      return new Response(JSON.stringify(next.body), { status: next.status, headers: { "Content-Type": "application/json" } });
    },
    clearTimeout() {},
    setTimeout(callback) { queueMicrotask(callback); return 1; },
  };
  const context = vm.createContext({
    console,
    document,
    window,
    Storage,
    MutationObserver: class { constructor(callback) { this.callback = callback; } observe() {} },
    URLSearchParams,
    Response,
    JSON,
    Date,
    RegExp,
    Error,
    crypto,
    queueMicrotask,
  });
  vm.runInContext(SOURCE, context, { filename: "reliability.js" });
  return { window, calls, note, honeypot };
}

test("autofilled honeypot is removed and cannot create a false completion", async () => {
  const harness = makeHarness([{ status: 200, body: { success: true, stored: true } }]);
  const response = await harness.window.fetch(SUBMIT, {
    method: "POST",
    body: JSON.stringify({ companyWebsite: "https://autofill.example", email: "pilot@example.com" }),
  });
  assert.equal(response.status, 503);
  assert.equal(JSON.parse(harness.calls[0].init.body).companyWebsite, undefined);
  assert.match((await response.json()).error, /not confirmed/i);
});

test("a real reference remains the only valid completion signal", async () => {
  const harness = makeHarness([{ status: 200, body: { success: true, stored: true, reference: "J4-260829-A1B2C3" } }]);
  const response = await harness.window.fetch(SUBMIT, {
    method: "POST",
    body: JSON.stringify({ email: "pilot@example.com" }),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).reference, "J4-260829-A1B2C3");
});

test("a stored draft keeps its credentials even when the return email fails", async () => {
  const harness = makeHarness([{
    status: 502,
    body: {
      success: false,
      stored: true,
      emailSent: false,
      draftKey: "11111111-1111-4111-8111-111111111111",
      resumeToken: "resume-token",
      expiresAt: "2026-09-28T15:00:00.000Z",
      error: "Return email failed",
    },
  }]);
  const response = await harness.window.fetch(MANAGE, {
    method: "POST",
    body: JSON.stringify({ action: "saveDraft", email: "pilot@example.com", payload: {} }),
  });
  assert.equal(response.status, 502);
  const saved = JSON.parse(harness.window.localStorage.getItem(SERVER_KEY));
  assert.equal(saved.draftKey, "11111111-1111-4111-8111-111111111111");
  assert.equal(saved.emailSent, false);
  assert.match(harness.note.textContent, /secure copy saved/i);
});

test("local progress creates a secure autosave after a valid email is present", async () => {
  const harness = makeHarness([{
    status: 200,
    body: {
      success: true,
      stored: true,
      emailSent: true,
      draftKey: "22222222-2222-4222-8222-222222222222",
      resumeToken: "resume-token-2",
      expiresAt: "2026-09-28T15:00:00.000Z",
    },
  }]);
  harness.window.localStorage.setItem(LOCAL_KEY, JSON.stringify({
    data: { email: "pilot@example.com", companyWebsite: "autofilled", firstName: "Test" },
    step: 6,
    savedAt: Date.now(),
  }));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(harness.calls[0].input, MANAGE);
  const body = JSON.parse(harness.calls[0].init.body);
  assert.equal(body.payload.companyWebsite, undefined);
  assert.equal(body.currentStep, 6);
  assert.match(harness.note.textContent, /secure copy saved/i);
  assert.equal(harness.honeypot.disabled, true);
});
