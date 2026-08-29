// J4 Legacy Properties — Shared Form Handler
// Save as: js/forms.js
// Include on every page: <script src="/js/forms.js"></script>

(function () {
  const EDGE_FN = "https://rqnvfruyhkkmsqvzqdli.supabase.co/functions/v1/lead-capture";
  const ANON_KEY = "sb_publishable_NCHYcy09Yi5s60udyOcyFA_W9zW-prt"; // publishable key — safe to ship in client code
  const TURNSTILE_SITE_KEY = "0x4AAAAAAEf5tLI9lkYWGs4C";

  let turnstileLoader;
  function loadTurnstile() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (turnstileLoader) return turnstileLoader;
    turnstileLoader = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-j4-turnstile]');
      const script = existing || document.createElement("script");
      script.dataset.j4Turnstile = "true";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.addEventListener("load", () => resolve(window.turnstile), { once: true });
      script.addEventListener("error", reject, { once: true });
      if (!existing) document.head.appendChild(script);
    });
    return turnstileLoader;
  }

  async function attachTurnstile(form) {
    let mount = form.querySelector(".cf-turnstile");
    if (!mount) {
      mount = document.createElement("div");
      mount.className = "cf-turnstile";
      mount.style.cssText = "display:flex;justify-content:center;margin:16px 0;";
      const submit = form.querySelector('button[type="submit"]');
      form.insertBefore(mount, submit || null);
    }
    const api = await loadTurnstile();
    if (api && form._j4TurnstileWidgetId == null) {
      form._j4TurnstileWidgetId = api.render(mount, { sitekey: TURNSTILE_SITE_KEY, theme: "light" });
    }
  }

  function resetTurnstile(form) {
    if (window.turnstile && form._j4TurnstileWidgetId != null) {
      window.turnstile.reset(form._j4TurnstileWidgetId);
    }
  }

  // ── Helper: collect all form fields into an object ──
  function collectFields(form) {
    const data = {};
    const fd = new FormData(form);

    // Checkboxes — collect as comma-separated string
    const checkboxGroups = {};
    form.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
      const name = cb.name;
      if (!checkboxGroups[name]) checkboxGroups[name] = [];
      checkboxGroups[name].push(cb.value);
    });

    fd.forEach((val, key) => {
      if (form.querySelector(`input[name="${key}"][type="checkbox"]`)) return; // handled above
      data[key] = val;
    });

    // Merge checkbox groups as comma-separated
    Object.entries(checkboxGroups).forEach(([k, v]) => {
      data[k] = v.join(", ");
    });

    // An UNCHECKED checkbox submits nothing at all, so a declined consent box
    // would simply be absent from the payload and look identical to a form that
    // never had one. For SMS consent that distinction is the whole record, so
    // record every checkbox explicitly, including the ones left unticked.
    form.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      if (!(cb.name in data)) data[cb.name] = "no";
    });

    return data;
  }

  // ── Helper: show success state ──
  // `heading` defaults to the original wording so existing forms are unchanged.
  // role="status" announces the confirmation to screen readers, which otherwise
  // get no feedback at all when the form disappears.
  function showSuccess(form, message, heading) {
    const successHtml = `
      <div role="status" style="padding:24px;border-left:3px solid #500203;background:#f7f5f0;">
        <p style="font-family:'Arvo',serif;font-size:16px;font-weight:700;color:#131414;margin-bottom:6px;">${heading || "Message received."}</p>
        <p style="font-size:13px;color:#7F8194;line-height:1.75;">${message}</p>
      </div>`;
    form.insertAdjacentHTML("afterend", successHtml);
    form.style.display = "none";
  }

  // ── Helper: show error state ──
  function showError(form, btn, originalText, message) {
    btn.textContent = originalText;
    btn.disabled = false;
    const existing = form.querySelector(".form-submit-error");
    if (!existing) {
      const err = document.createElement("p");
      err.className = "form-submit-error";
      err.style.cssText = "font-size:12px;color:#c0392b;margin-top:8px;text-align:center;";
      err.textContent = message || "Something went wrong. Please call us at 833-543-LAND.";
      form.appendChild(err);
    }
  }

  // ── Helper: validate required fields ──
  function validateForm(form) {
    let valid = true;
    form.querySelectorAll("[required]").forEach(field => {
      field.style.borderColor = "";
      if (!field.value.trim()) {
        field.style.borderColor = "#c0392b";
        valid = false;
      }
    });
    if (!valid) {
      const first = form.querySelector("[required][style*='c0392b']");
      if (first) first.focus();
    }
    return valid;
  }

  // ── Main submit handler ──
  async function handleSubmit(e, formType, successMsg, successHeading) {
    e.preventDefault();
    const form = e.target;
    if (!validateForm(form)) return;

    const btn = form.querySelector("button[type='submit']");
    const originalText = btn ? btn.textContent : "";
    const existingError = form.querySelector(".form-submit-error");
    if (existingError) existingError.remove();
    const turnstileToken = form.querySelector('[name="cf-turnstile-response"]')?.value?.trim() || "";
    if (!turnstileToken) {
      showError(form, btn, originalText, "Please complete the security check before submitting.");
      return;
    }
    if (btn) { btn.textContent = "Sending..."; btn.disabled = true; }

    const fields = collectFields(form);
    const payload = {
      form_type: formType,
      turnstileToken,
      ...fields,
    };

    // Pull URL param extras
    const params = new URLSearchParams(window.location.search);
    if (params.get("property")) payload.property_ref = params.get("property");
    if (params.get("agent"))    payload.agent_ref    = params.get("agent");
    if (params.get("intent"))   payload.intent       = params.get("intent");

    try {
      const res = await fetch(EDGE_FN, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${ANON_KEY}`,
          "apikey":        ANON_KEY,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showSuccess(form, successMsg, successHeading);
      } else {
        resetTurnstile(form);
        showError(form, btn, originalText);
      }
    } catch (err) {
      console.error("Form submission error:", err);
      resetTurnstile(form);
      showError(form, btn, originalText);
    }
  }

  // ── Wire forms on DOM ready ──
  // Native HTML forms handled here. The remaining forms on the site (contact,
  // selling, off-market, team, property detail) are Community Market Leader
  // iframes — cross-origin, so JS handlers here can't reach them.
  document.addEventListener("DOMContentLoaded", () => {
    const sidebarForm = document.querySelector(".sidebar-form");
    if (sidebarForm) {
      attachTurnstile(sidebarForm).catch(console.error);
      sidebarForm.addEventListener("submit", e =>
        handleSubmit(e, "property_search",
          "Got it. We'll be in touch with options that match your criteria, including off-market properties."
        )
      );
    }

    // Suburbs to 10 Acres seminar registration.
    const seminarForm = document.querySelector("#seminar-registration");
    if (seminarForm) {
      attachTurnstile(seminarForm).catch(console.error);
      seminarForm.addEventListener("submit", e =>
        handleSubmit(e, "seminar_registration",
          "Watch your email for the Zoom link and the Starter Guide. If it doesn't show up in a few minutes, check your spam folder or call 833-543-LAND.",
          "You're registered."
        )
      );
    }

    // General contact page.
    const contactForm = document.querySelector("#j4lp-contact-form");
    if (contactForm) {
      attachTurnstile(contactForm).catch(console.error);
      contactForm.addEventListener("submit", e =>
        handleSubmit(e, "contact",
          "Someone from J4 Legacy Properties will be in touch same business day. If it's urgent, call or text 833-543-LAND."
        )
      );
    }
  });

})();
