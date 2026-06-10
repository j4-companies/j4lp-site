// J4 Legacy Properties — Shared Form Handler
// Save as: js/forms.js
// Include on every page: <script src="/js/forms.js"></script>

(function () {
  const EDGE_FN = "https://rqnvfruyhkkmsqvzqdli.supabase.co/functions/v1/lead-capture";
  const ANON_KEY = "sb_publishable_NCHYcy09Yi5s60udyOcyFA_W9zW-prt"; // publishable key — safe to ship in client code

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
  // Only the properties.html sidebar form is a native HTML form.
  // Every other form on the site (contact, selling, off-market, team, property detail)
  // is a Community Market Leader iframe — cross-origin, so JS handlers here can't reach it.
  document.addEventListener("DOMContentLoaded", () => {
    const sidebarForm = document.querySelector(".sidebar-form");
    if (sidebarForm) {
      sidebarForm.addEventListener("submit", e =>
        handleSubmit(e, "property_search",
          "Got it. We'll be in touch with options that match your criteria — including off-market properties."
        )
      );
    }
  });

})();
