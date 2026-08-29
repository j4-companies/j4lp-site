(() => {
  "use strict";

  const SUBMIT_ENDPOINT = "https://rqnvfruyhkkmsqvzqdli.supabase.co/functions/v1/submit-property-intake";
  const MANAGE_ENDPOINT = "https://rqnvfruyhkkmsqvzqdli.supabase.co/functions/v1/manage-property-intake";
  const LOCAL_DRAFT_KEY = "j4lp-property-intake-autosave-v1";
  const SERVER_DRAFT_KEY = "j4lp-property-intake-server-draft-v1";
  const REFERENCE_PATTERN = /^(?:J4|TEST)-\d{6}-[A-F0-9]{6}$/;
  const nativeFetch = window.fetch.bind(window);
  const nativeSetItem = Storage.prototype.setItem;
  const nativeRemoveItem = Storage.prototype.removeItem;

  let pendingSnapshot = null;
  let saveTimer = null;
  let saveInFlight = false;
  let saveAgain = false;
  let statusText = "Your progress is saved on this device.";
  let returnLinkRetryCount = 0;
  let resumePending = new URLSearchParams(window.location.search).has("draft");

  function cleanPayload(payload) {
    const clean = { ...(payload || {}) };
    delete clean.companyWebsite;
    return clean;
  }

  function validEmail(value) {
    return /^\S+@\S+\.\S+$/.test(String(value || "").trim());
  }

  function readCredentials() {
    const params = new URLSearchParams(window.location.search);
    const urlDraftKey = params.get("draft");
    const urlResumeToken = params.get("token");
    if (urlDraftKey && urlResumeToken) {
      return { draftKey: urlDraftKey, resumeToken: urlResumeToken, expiresAtMs: Date.now() + 30 * 86400000, emailSent: true, source: "url" };
    }
    try {
      const saved = JSON.parse(window.localStorage.getItem(SERVER_DRAFT_KEY) || "null");
      if (saved?.draftKey && saved?.resumeToken && Number(saved.expiresAtMs || 0) > Date.now()) return saved;
    } catch (_) {
      // A corrupt convenience record must not block the person's local answers.
    }
    return null;
  }

  function storeCredentials(result, emailSent, email) {
    if (!result?.draftKey || !result?.resumeToken) return;
    const expiresAtMs = Date.parse(result.expiresAt || "") || Date.now() + 30 * 86400000;
    nativeSetItem.call(window.localStorage, SERVER_DRAFT_KEY, JSON.stringify({
      draftKey: result.draftKey,
      resumeToken: result.resumeToken,
      expiresAtMs,
      emailSent: emailSent ?? readCredentials()?.emailSent ?? false,
      email: String(email || readCredentials()?.email || "").trim().toLowerCase(),
      source: "local",
    }));
  }

  function resumeUrl(credentials) {
    if (!credentials?.draftKey || !credentials?.resumeToken) return "";
    return `${window.location.origin}/property-intake/?draft=${encodeURIComponent(credentials.draftKey)}&token=${encodeURIComponent(credentials.resumeToken)}`;
  }

  function renderStatus() {
    const note = document.querySelector(".autosave-note");
    if (!note) return;
    if (note.textContent !== statusText) note.textContent = statusText;
    note.setAttribute("aria-live", "polite");
    const honeypot = document.querySelector('[name="companyWebsite"]');
    if (honeypot) {
      honeypot.value = "";
      honeypot.disabled = true;
    }
  }

  function setStatus(message) {
    statusText = message;
    renderStatus();
  }

  function secureSavedMessage(emailSent) {
    const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (emailSent === false) {
      const credentials = readCredentials();
      const link = resumeUrl(credentials);
      return link
        ? `Secure copy saved at ${time}, but the return-link email has not been confirmed. Keep this page open or copy this private return link: ${link}`
        : `Secure copy saved at ${time}, but the return-link email has not been confirmed.`;
    }
    return `Secure copy saved at ${time}. A private return link was sent to the email provided.`;
  }

  async function saveSnapshot(snapshot, keepalive = false) {
    if (!snapshot?.data || !validEmail(snapshot.data.email)) {
      setStatus("Your progress is saved on this device. Add a valid email on the contact step for a secure return link.");
      return;
    }
    if (resumePending) {
      setStatus("Restoring your private draft before autosaving changes...");
      return;
    }
    if (saveInFlight) {
      saveAgain = true;
      return;
    }
    saveInFlight = true;
    let credentials = readCredentials();
    const normalizedEmail = String(snapshot.data.email).trim().toLowerCase();
    if (credentials?.email && credentials.email !== normalizedEmail) credentials = null;
    const shouldRetryLink = credentials?.emailSent === false && returnLinkRetryCount < 3;
    const turnstileToken = document.querySelector('[name="cf-turnstile-response"]')?.value || "";
    if (!credentials && !turnstileToken) {
      saveInFlight = false;
      setStatus("Your progress is saved on this device. Complete the security check to create the secure return link.");
      return;
    }
    try {
      const response = await nativeFetch(MANAGE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive,
        body: JSON.stringify({
          action: "saveDraft",
          email: snapshot.data.email,
          payload: cleanPayload(snapshot.data),
          currentStep: snapshot.step,
          draftKey: credentials?.draftKey,
          resumeToken: credentials?.resumeToken,
          resendReturnLink: shouldRetryLink,
          autosave: true,
          turnstileToken: credentials ? undefined : turnstileToken,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (result.draftKey && result.resumeToken) storeCredentials(result, result.emailSent, snapshot.data.email);
      if (result.isNew && window.turnstile && window.__j4PropertyTurnstileId != null) window.turnstile.reset(window.__j4PropertyTurnstileId);
      if (shouldRetryLink) returnLinkRetryCount += 1;
      if (!result.stored && (!response.ok || !result.success)) throw new Error(result.error || "The secure copy could not be saved.");
      setStatus(secureSavedMessage(result.emailSent ?? readCredentials()?.emailSent));
    } catch (error) {
      setStatus(`Your answers are still saved on this device, but the secure copy could not be updated. ${error instanceof Error ? error.message : "Please try again."}`);
    } finally {
      saveInFlight = false;
      if (saveAgain) {
        saveAgain = false;
        scheduleServerSave(250);
      }
    }
  }

  function scheduleServerSave(delay = 1500) {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => pendingSnapshot && saveSnapshot(pendingSnapshot), delay);
  }

  Storage.prototype.setItem = function (key, value) {
    nativeSetItem.call(this, key, value);
    if (this !== window.localStorage || key !== LOCAL_DRAFT_KEY) return;
    try {
      pendingSnapshot = JSON.parse(value);
      setStatus("Saving your progress on this device...");
      scheduleServerSave();
    } catch (_) {
      setStatus("Your progress is saved on this device.");
    }
  };

  Storage.prototype.removeItem = function (key) {
    nativeRemoveItem.call(this, key);
    if (this === window.localStorage && key === LOCAL_DRAFT_KEY) {
      nativeRemoveItem.call(window.localStorage, SERVER_DRAFT_KEY);
    }
  };

  window.fetch = async (input, init = {}) => {
    const url = String(input);
    const method = String(init.method || "GET").toUpperCase();
    let nextInit = init;
    let requestBody = null;

    if (method === "POST" && typeof init.body === "string" && (url === SUBMIT_ENDPOINT || url === MANAGE_ENDPOINT)) {
      try {
        requestBody = JSON.parse(init.body);
        if (requestBody.payload) requestBody.payload = cleanPayload(requestBody.payload);
        delete requestBody.companyWebsite;
        if (requestBody.sourceUrl) {
          try {
            const source = new URL(requestBody.sourceUrl, window.location.origin);
            requestBody.sourceUrl = `${source.origin}${source.pathname}`;
          } catch (_) {
            delete requestBody.sourceUrl;
          }
        }
        let credentials = readCredentials();
        const requestEmail = String(requestBody.email || requestBody.payload?.email || "").trim().toLowerCase();
        if (credentials?.email && requestEmail && credentials.email !== requestEmail) credentials = null;
        if (credentials && !requestBody.draftKey && (url === SUBMIT_ENDPOINT || requestBody.action === "saveDraft")) {
          requestBody.draftKey = credentials.draftKey;
          requestBody.resumeToken = credentials.resumeToken;
        }
        if (url === MANAGE_ENDPOINT && requestBody.action === "saveDraft" && credentials?.emailSent === false) {
          requestBody.resendReturnLink = true;
        }
        if (url === MANAGE_ENDPOINT && requestBody.action === "saveDraft" && !credentials) {
          requestBody.turnstileToken = document.querySelector('[name="cf-turnstile-response"]')?.value || "";
        }
        nextInit = { ...init, body: JSON.stringify(requestBody) };
      } catch (_) {
        requestBody = null;
      }
    }

    const response = await nativeFetch(input, nextInit);
    if (url === MANAGE_ENDPOINT && requestBody?.action === "saveDraft") {
      const result = await response.clone().json().catch(() => ({}));
      if (result.draftKey && result.resumeToken) storeCredentials(result, result.emailSent, requestBody.email);
      if (result.isNew && window.turnstile && window.__j4PropertyTurnstileId != null) window.turnstile.reset(window.__j4PropertyTurnstileId);
      if (result.stored) setStatus(secureSavedMessage(result.emailSent ?? readCredentials()?.emailSent));
    }
    if (url === MANAGE_ENDPOINT && requestBody?.action === "loadDraft") {
      const result = await response.clone().json().catch(() => ({}));
      if (response.ok && result.success) {
        resumePending = false;
        storeCredentials({ ...requestBody, expiresAt: result.expiresAt }, true, result.payload?.email);
        window.history.replaceState({}, "", `${window.location.pathname}${window.location.hash || ""}`);
        window.setTimeout(() => pendingSnapshot && scheduleServerSave(250), 0);
      }
    }
    if (url === MANAGE_ENDPOINT && requestBody?.action === "loadSubmission" && response.ok) {
      window.history.replaceState({}, "", `${window.location.pathname}${window.location.hash || ""}`);
    }
    if (url === SUBMIT_ENDPOINT && method === "POST") {
      const result = await response.clone().json().catch(() => ({}));
      if (response.ok && result.success && result.stored && !REFERENCE_PATTERN.test(String(result.reference || ""))) {
        setStatus("The final submission was not confirmed. Your answers remain saved on this device.");
        return new Response(JSON.stringify({
          success: false,
          stored: false,
          error: "The final submission was not confirmed. Your answers are still saved. Please try again or call 833-543-LAND.",
        }), { status: 503, headers: { "Content-Type": "application/json" } });
      }
    }
    return response;
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && pendingSnapshot) saveSnapshot(pendingSnapshot, true);
  });
  window.addEventListener("j4lp-turnstile-ready", () => pendingSnapshot && scheduleServerSave(100));
  new MutationObserver(renderStatus).observe(document.documentElement, { childList: true, subtree: true });
})();
