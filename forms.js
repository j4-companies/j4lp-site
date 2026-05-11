// J4 Legacy Properties — Shared Form Handler
// Save as: js/forms.js
// Include on every page: <script src="/js/forms.js"></script>

(function () {
  const EDGE_FN = "https://rqnvfruyhkkmsqvzqdli.supabase.co/functions/v1/lead-capture";
  const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxbnZmcnV5aGtrbXNxdnpxZGxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NDgzNzUsImV4cCI6MjA5NDAyNDM3NX0.4G4qpvZV03MUtNo4uBDCYTOGF9AEckxSsLcQrmhbx5M"; // paste anon/public key here

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

    return data;
  }

  // ── Helper: show success state ──
  function showSuccess(form, message) {
    const successHtml = `
      <div style="padding:24px;border-left:3px solid #500203;background:#f7f5f0;">
        <p style="font-family:'Arvo',serif;font-size:16px;font-weight:700;color:#131414;margin-bottom:6px;">Message received.</p>
        <p style="font-size:13px;color:#7F8194;line-height:1.75;">${message}</p>
      </div>`;
    form.insertAdjacentHTML("afterend", successHtml);
    form.style.display = "none";
  }

  // ── Helper: show error state ──
  function showError(form, btn, originalText) {
    btn.textContent = originalText;
    btn.disabled = false;
    const existing = form.querySelector(".form-submit-error");
    if (!existing) {
      const err = document.createElement("p");
      err.className = "form-submit-error";
      err.style.cssText = "font-size:12px;color:#c0392b;margin-top:8px;text-align:center;";
      err.textContent = "Something went wrong. Please call us at 833-543-LAND.";
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
  async function handleSubmit(e, formType, successMsg) {
    e.preventDefault();
    const form = e.target;
    if (!validateForm(form)) return;

    const btn = form.querySelector("button[type='submit']");
    const originalText = btn ? btn.textContent : "";
    if (btn) { btn.textContent = "Sending..."; btn.disabled = true; }

    const fields = collectFields(form);
    const payload = {
      form_type: formType,
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
        showSuccess(form, successMsg);
      } else {
        showError(form, btn, originalText);
      }
    } catch (err) {
      console.error("Form submission error:", err);
      showError(form, btn, originalText);
    }
  }

  // ── Wire forms on DOM ready ──
  document.addEventListener("DOMContentLoaded", () => {

    // 1. CONTACT PAGE — main form
    const contactForm = document.getElementById("contactForm");
    if (contactForm) {
      contactForm.addEventListener("submit", e =>
        handleSubmit(e, "contact",
          "We'll be in touch same business day. If it's urgent, call us at 833-543-LAND."
        )
      );
    }

    // 2. SELLING PAGE — valuation form
    const valForm = document.querySelector(".val-form");
    if (valForm) {
      valForm.addEventListener("submit", e =>
        handleSubmit(e, "valuation",
          "We'll reach out same business day to schedule your valuation call. If urgent, call 833-543-LAND."
        )
      );
    }

    // 3. PROPERTIES SIDEBAR — tell us what you're looking for
    const sidebarForm = document.querySelector(".sidebar-form");
    if (sidebarForm) {
      sidebarForm.addEventListener("submit", e =>
        handleSubmit(e, "property_search",
          "Got it. We'll be in touch with options that match your criteria — including off-market properties."
        )
      );
    }

    // 4. PROPERTY DETAIL PAGES — inquiry form
    const contactCardForm = document.querySelector(".contact-form");
    if (contactCardForm && !document.getElementById("contactForm")) {
      // Only on property pages (contact.html has #contactForm, property pages use .contact-form)
      contactCardForm.addEventListener("submit", e =>
        handleSubmit(e, "property_inquiry",
          "Inquiry received. We'll be in touch same business day. Call 833-543-LAND if you need to move faster."
        )
      );
    }

    // 5. TEAM PAGE — join the team form
    const joinForm = document.querySelector(".join-form");
    if (joinForm) {
      joinForm.addEventListener("submit", e =>
        handleSubmit(e, "join_team",
          "We'll reach out within one business day to schedule a conversation."
        )
      );
    }

    // 6. SIDEBAR VALUATION (selling page sidebar shortcut)
    const sidebarValBtn = document.querySelector(".sidebar-btn.gold");
    // Already handled by val-form above if present

  });

})();
