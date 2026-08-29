(() => {
  "use strict";

  const MANAGE_ENDPOINT = "https://rqnvfruyhkkmsqvzqdli.supabase.co/functions/v1/manage-property-intake";
  const LOCAL_KEY = "j4lp-property-intake-autosave-v1";
  const SERVER_KEY = "j4lp-property-intake-server-draft-v1";

  const el = (tag, attrs = {}, text = "") => {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === "className") node.className = value;
      else node.setAttribute(key, value);
    });
    if (text) node.textContent = text;
    return node;
  };

  function snapshot() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "null"); } catch (_) { return null; }
  }
  function credentials() {
    try { return JSON.parse(localStorage.getItem(SERVER_KEY) || "null"); } catch (_) { return null; }
  }
  function token() { return document.querySelector('[name="cf-turnstile-response"]')?.value || ""; }
  function validEmail(value) { return /^\S+@\S+\.\S+$/.test(String(value || "").trim()); }
  function smartTitle(value) {
    const original = String(value || "").trim().replace(/\s+/g, " ");
    const letters = original.replace(/[^A-Za-z]/g, "");
    if (/[A-Z]/.test(letters) && /[a-z]/.test(letters)) return original;
    return original.toLowerCase().replace(/(^|[\s'-])([a-z])/g, (_, boundary, letter) => boundary + letter.toUpperCase());
  }
  function setStatus(message, kind = "") {
    const status = document.getElementById("j4-save-status");
    if (!status) return;
    status.textContent = message;
    status.className = `j4-save-status ${kind}`.trim();
  }
  function resetTurnstile() {
    if (window.turnstile && window.__j4PropertyTurnstileId != null) window.turnstile.reset(window.__j4PropertyTurnstileId);
  }
  function setReactInput(input, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function emailDialog() {
    let dialog = document.getElementById("j4-email-dialog");
    if (dialog) return dialog;
    dialog = el("dialog", { id: "j4-email-dialog", className: "j4-dialog" });
    const form = el("form", { method: "dialog" });
    form.append(el("button", { className: "j4-dialog-close", value: "cancel", "aria-label": "Close" }, "×"));
    form.append(el("p", { className: "j4-dialog-kicker" }, "SAVE & FINISH LATER"));
    form.append(el("h2", {}, "Where should we send your private return link?"));
    form.append(el("p", {}, "Your secure draft expires in 30 days. Saving does not notify the J4LP team or create a lead."));
    const label = el("label", {}, "Email address");
    label.append(el("input", { id: "j4-save-email", type: "email", autocomplete: "email", required: "" }));
    form.append(label);
    form.append(el("button", { className: "j4-dialog-primary", value: "save" }, "Save and email my private link"));
    dialog.append(form); document.body.append(dialog); return dialog;
  }

  async function saveDraft() {
    const saved = snapshot();
    if (!saved?.data) return setStatus("Enter at least one answer before saving.", "error");
    let email = String(saved.data.email || credentials()?.email || "").trim().toLowerCase();
    if (!validEmail(email)) {
      const dialog = emailDialog();
      const input = dialog.querySelector("input");
      input.value = email;
      dialog.showModal();
      const result = await new Promise((resolve) => dialog.addEventListener("close", () => resolve(dialog.returnValue), { once: true }));
      if (result !== "save" || !validEmail(input.value)) return;
      email = input.value.trim().toLowerCase();
      saved.data.email = email;
      saved.savedAt = Date.now();
      localStorage.setItem(LOCAL_KEY, JSON.stringify(saved));
    }
    const securityToken = token();
    const creds = credentials();
    if (!creds?.draftKey && !securityToken) {
      setStatus("Complete the security check in the form, then click Save again.", "error");
      document.getElementById("j4lp-property-turnstile")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setStatus("Saving a secure copy…");
    const response = await fetch(MANAGE_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "saveDraft", email, payload: saved.data, currentStep: saved.step || 0, draftKey: creds?.draftKey, resumeToken: creds?.resumeToken, turnstileToken: creds ? undefined : securityToken }) });
    const result = await response.json().catch(() => ({}));
    if (!result.stored) return setStatus(result.error || "The secure copy could not be saved. Your answers remain on this device.", "error");
    const reference = result.draftReference || credentials()?.draftReference || "your draft reference";
    setStatus(result.emailSent === false ? `Saved. Reference ${reference}. The email could not be confirmed, so keep this page open and try Save again.` : `Saved. Reference ${reference}. A private return link was emailed to ${email}.`, result.emailSent === false ? "warning" : "success");
    resetTurnstile();
    const emailField = document.querySelector('input[name="email"]');
    if (emailField && !emailField.value) setReactInput(emailField, email);
    const nativeSave = [...document.querySelectorAll(".draft-panel button")].find((button) => /Save .*return link/i.test(button.textContent || ""));
    if (nativeSave && !nativeSave.disabled && !nativeSave.dataset.j4Synced) {
      nativeSave.dataset.j4Synced = "true";
      nativeSave.click();
    }
  }

  function resumeDialog() {
    let dialog = document.getElementById("j4-resume-dialog");
    if (dialog) return dialog;
    dialog = el("dialog", { id: "j4-resume-dialog", className: "j4-dialog" });
    const form = el("form");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      const message = form.querySelector(".j4-dialog-message");
      button.disabled = true; message.textContent = "Requesting a fresh private link…";
      const response = await fetch(MANAGE_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "requestResumeLink", draftReference: form.elements.draftReference.value, email: form.elements.email.value, turnstileToken: token() }) });
      const result = await response.json().catch(() => ({}));
      message.textContent = response.ok ? (result.message || "If the details match an active draft, a private link was emailed.") : (result.error || "The link could not be requested. Please try again.");
      message.className = `j4-dialog-message ${response.ok ? "success" : "error"}`;
      button.disabled = false; resetTurnstile();
    });
    form.append(el("button", { type: "button", className: "j4-dialog-close", "aria-label": "Close" }, "×"));
    form.querySelector("button").addEventListener("click", () => dialog.close());
    form.append(el("p", { className: "j4-dialog-kicker" }, "CONTINUE A SAVED INTAKE"));
    form.append(el("h2", {}, "Email me a fresh private return link"));
    form.append(el("p", {}, "Enter the reference from your save email and the same email address. The reference alone cannot open your answers."));
    const refLabel = el("label", {}, "Draft reference"); refLabel.append(el("input", { name: "draftReference", required: "", placeholder: "DRAFT-260829-ABC123", autocomplete: "off" })); form.append(refLabel);
    const emailLabel = el("label", {}, "Email address"); emailLabel.append(el("input", { name: "email", type: "email", required: "", autocomplete: "email" })); form.append(emailLabel);
    form.append(el("button", { type: "submit", className: "j4-dialog-primary" }, "Email my private return link"));
    form.append(el("p", { className: "j4-dialog-message", role: "status", "aria-live": "polite" }));
    dialog.append(form); document.body.append(dialog); return dialog;
  }

  function startOver() {
    if (!window.confirm("Clear the saved intake from this device and start over? Any secure draft already emailed to you will remain available through its private link until it expires.")) return;
    localStorage.removeItem(LOCAL_KEY); localStorage.removeItem(SERVER_KEY);
    window.location.assign(window.location.pathname);
  }

  function installBar() {
    if (document.getElementById("j4-save-bar") || !document.querySelector("form.intake-card")) return;
    const bar = el("aside", { id: "j4-save-bar", className: "j4-save-bar", "aria-label": "Save and resume options" });
    const copy = el("div", { className: "j4-save-copy" });
    copy.append(el("b", {}, "Need more time?")); copy.append(el("span", { id: "j4-save-status", className: "j4-save-status", "aria-live": "polite" }, "Your progress is automatically saved on this device."));
    const actions = el("div", { className: "j4-save-actions" });
    const save = el("button", { type: "button", className: "j4-save-primary" }, "Save & Finish Later"); save.addEventListener("click", saveDraft);
    const resume = el("button", { type: "button" }, "Continue a Saved Intake"); resume.addEventListener("click", () => resumeDialog().showModal());
    const clear = el("button", { type: "button", className: "j4-clear-button" }, "Start Over & Clear This Device"); clear.addEventListener("click", startOver);
    actions.append(save, resume, clear); bar.append(copy, actions); document.body.append(bar);
  }

  function enhanceCurrentView() {
    installBar();
    const savedEmail = snapshot()?.data?.email || credentials()?.email;
    const emailField = document.querySelector('input[name="email"]');
    if (emailField && !emailField.value && validEmail(savedEmail)) setReactInput(emailField, savedEmail);

    const heading = [...document.querySelectorAll("h1")].find((node) => /^Thank you,/i.test(node.textContent || ""));
    if (heading) {
      document.getElementById("j4-save-bar")?.remove();
      heading.textContent = heading.textContent.replace(/Thank you,\s*(.+)\./i, (_, name) => `Thank you, ${smartTitle(name)}.`);
    }
    const viewLink = [...document.querySelectorAll("a")].find((node) => /View submitted intake/i.test(node.textContent || ""));
    if (viewLink) { viewLink.textContent = "View, Print, or Save My Full Answers"; viewLink.classList.add("j4-summary-primary"); }
    const printButton = [...document.querySelectorAll("button")].find((node) => /Print confirmation/i.test(node.textContent || ""));
    if (printButton) printButton.textContent = "Print This Confirmation";

    document.querySelectorAll(".readonly-answers dt, .review-list dt").forEach((term) => {
      if (!/^(First name|Last name|County)$/.test((term.textContent || "").trim())) return;
      const value = term.nextElementSibling;
      if (!value) return;
      const suffix = /^County$/.test(term.textContent.trim()) && !/\bCounty$/i.test(value.textContent || "") ? " County" : "";
      value.textContent = smartTitle(value.textContent) + suffix;
    });
  }

  new MutationObserver(enhanceCurrentView).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", enhanceCurrentView);
})();
