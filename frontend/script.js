/* ===========================================================
   AgriMitra — shared frontend script
   =========================================================== */

const API_BASE = "https://agrimitra-api.onrender.com/api";

/* ---------- Theme (light/dark) ---------- */
const Theme = {
  get: () => localStorage.getItem("agrimitra_theme") || "dark",
  apply: (mode) => {
    document.documentElement.setAttribute("data-theme", mode);
    localStorage.setItem("agrimitra_theme", mode);
    const btn = document.getElementById("theme-toggle-btn");
    if (btn) btn.textContent = mode === "light" ? "🌙" : "☀️";
  },
  toggle: () => Theme.apply(Theme.get() === "light" ? "dark" : "light"),
};
// Apply immediately (before DOMContentLoaded) to avoid a flash of the wrong theme
document.documentElement.setAttribute("data-theme", Theme.get());

/* ---------- Google Translate (Hindi/English toggle) ---------- */
function googleTranslateElementInit() {
  new google.translate.TranslateElement(
    { pageLanguage: "en", includedLanguages: "hi,en", autoDisplay: false },
    "google_translate_element"
  );
}
function loadGoogleTranslateScript() {
  if (document.getElementById("google-translate-script")) return;
  const script = document.createElement("script");
  script.id = "google-translate-script";
  script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  document.body.appendChild(script);
}

const Auth = {
  getToken: () => localStorage.getItem("agrimitra_token"),
  getUser: () => JSON.parse(localStorage.getItem("agrimitra_user") || "null"),
  save: (token, user) => {
    localStorage.setItem("agrimitra_token", token);
    localStorage.setItem("agrimitra_user", JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem("agrimitra_token");
    localStorage.removeItem("agrimitra_user");
  },
  isLoggedIn: () => !!localStorage.getItem("agrimitra_token"),
};

async function apiFetch(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = Auth.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Something went wrong. Please try again.");
  }
  return data;
}

/* ---------- Nav toggle (works on every page) ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const hamburger = document.getElementById("hamburger");
  const nav = document.getElementById("main-nav");
  if (hamburger && nav) {
    hamburger.addEventListener("click", () => {
      nav.classList.toggle("open");
      const expanded = hamburger.getAttribute("aria-expanded") === "true";
      hamburger.setAttribute("aria-expanded", String(!expanded));
    });
  }

  // Theme toggle button
  Theme.apply(Theme.get()); // sync icon
  const themeBtn = document.getElementById("theme-toggle-btn");
  if (themeBtn) themeBtn.addEventListener("click", Theme.toggle);

  // Google Translate widget
  if (document.getElementById("google_translate_element")) {
    loadGoogleTranslateScript();
  }

  // Reflect login state in nav ("Dashboard" link vs "Login")
  const navCta = document.querySelector(".nav-cta");
  if (navCta && !Auth.isLoggedIn() && navCta.getAttribute("href") === "dashboard.html") {
    navCta.setAttribute("href", "login.html");
    navCta.textContent = "Login";
  }

  initTabs();
  initCropForm();
  initSignupPage();
  initLoginPage();
  initDashboardPage();
});

/* ---------- Tools tabs (index.html) ---------- */
function initTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  if (!tabBtns.length) return;
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");
    });
  });
}

/* ---------- Crop recommendation flow (index.html #crop tab) ---------- */
function initCropForm() {
  const getBtn = document.getElementById("get-recommendation");
  if (!getBtn) return;

  const outputEl = document.getElementById("recommendation-output");

  getBtn.addEventListener("click", async () => {
    if (!Auth.isLoggedIn()) {
      outputEl.innerHTML = `<div class="result-error">Please login/signup before requesting a recommendation. <a href="login.html" style="color:inherit;text-decoration:underline;">Login here</a></div>`;
      return;
    }

    const payload = {
      nitrogen: document.getElementById("nitrogen").value,
      phosphorus: document.getElementById("phosphorus").value,
      potassium: document.getElementById("potassium").value,
      humidity: document.getElementById("humidity").value,
      rainfall: document.getElementById("rainfall").value,
      temperature: document.getElementById("temperature").value,
      ph: document.getElementById("ph").value,
    };

    for (const [key, val] of Object.entries(payload)) {
      if (val === "") {
        outputEl.innerHTML = `<div class="result-error">Please fill in the "${key}" field.</div>`;
        return;
      }
    }

    outputEl.innerHTML = `<div class="result-info">Analysing your soil & climate data...</div>`;
    getBtn.disabled = true;

    try {
      const { recommendation } = await apiFetch("/recommend", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      renderCropSuggestions(recommendation);
    } catch (err) {
      outputEl.innerHTML = `<div class="result-error">${err.message}</div>`;
    } finally {
      getBtn.disabled = false;
    }
  });
}

function renderCropSuggestions(recommendation) {
  const outputEl = document.getElementById("recommendation-output");
  const user = Auth.getUser();

  const cardsHtml = recommendation.suggestions
    .map(
      (crop) => `
      <div class="crop-suggest-card" data-crop="${crop.name}">
        <div class="crop-suggest-icon">${crop.icon}</div>
        <div class="crop-suggest-name">${crop.name}</div>
        <div class="crop-suggest-score">${crop.suitabilityScore}% suitable</div>
        <div class="crop-suggest-badge">${crop.profitCategory} profit potential</div>
      </div>`
    )
    .join("");

  outputEl.innerHTML = `
    <p style="margin-top:20px;font-weight:600;color:var(--text);">Choose one of the 3 recommended crops:</p>
    <div class="crop-suggestions">${cardsHtml}</div>

    <div class="fields-select-row">
      <div class="form-field">
        <label for="fields-used-count">How many fields will this crop be planted on?</label>
        <input type="number" id="fields-used-count" min="1" placeholder="e.g. 2">
        <div class="fields-hint">Your total registered fields: <strong>${user?.totalFields ?? "-"}</strong></div>
      </div>
      <button id="confirm-crop-selection" class="btn primary" disabled>Confirm Selection →</button>
    </div>
    <div id="crop-selection-output" class="result-area"></div>
  `;

  let selectedCrop = null;
  const confirmBtn = document.getElementById("confirm-crop-selection");

  document.querySelectorAll(".crop-suggest-card").forEach((card) => {
    card.addEventListener("click", () => {
      document.querySelectorAll(".crop-suggest-card").forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      selectedCrop = card.dataset.crop;
      confirmBtn.disabled = false;
    });
  });

  confirmBtn.addEventListener("click", async () => {
    const fieldsUsedCount = document.getElementById("fields-used-count").value;
    const selectionOutput = document.getElementById("crop-selection-output");

    if (!selectedCrop) {
      selectionOutput.innerHTML = `<div class="result-error">Please select a crop first.</div>`;
      return;
    }
    if (!fieldsUsedCount || Number(fieldsUsedCount) < 1) {
      selectionOutput.innerHTML = `<div class="result-error">Please enter how many fields this crop will be planted on.</div>`;
      return;
    }

    confirmBtn.disabled = true;
    try {
      const { recommendation: updated } = await apiFetch(`/recommend/${recommendation._id}/select`, {
        method: "POST",
        body: JSON.stringify({ selectedCrop, fieldsUsedCount }),
      });
      selectionOutput.innerHTML = `
        <div class="result-info">
          ✅ <strong>${updated.selectedCrop}</strong> confirmed for ${updated.fieldsUsedCount} field(s).
          You'll also see this on your <a href="dashboard.html" style="color:inherit;text-decoration:underline;">Dashboard</a>.
        </div>`;
    } catch (err) {
      // ⭐ Field count validation error surfaces exactly here
      selectionOutput.innerHTML = `<div class="result-error">${err.message}</div>`;
    } finally {
      confirmBtn.disabled = false;
    }
  });
}

/* ---------- Signup page ---------- */
function initSignupPage() {
  const form = document.getElementById("signup-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("auth-error");
    errorEl.style.display = "none";

    const payload = {
      name: document.getElementById("su-name").value,
      email: document.getElementById("su-email").value,
      phone: document.getElementById("su-phone").value,
      password: document.getElementById("su-password").value,
      village: document.getElementById("su-village").value,
      district: document.getElementById("su-district").value,
      state: document.getElementById("su-state").value,
      soilType: document.getElementById("su-soil-type").value,
      soilPh: document.getElementById("su-soil-ph").value,
      irrigationType: document.getElementById("su-irrigation").value,
      totalFields: document.getElementById("su-total-fields").value,
      totalLandAcres: document.getElementById("su-total-land").value,
    };

    try {
      const { token, user } = await apiFetch("/auth/signup", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      Auth.save(token, user);
      window.location.href = "dashboard.html";
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = "block";
    }
  });
}

/* ---------- Login page ---------- */
function initLoginPage() {
  const form = document.getElementById("login-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("auth-error");
    errorEl.style.display = "none";

    try {
      const { token, user } = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: document.getElementById("li-email").value,
          password: document.getElementById("li-password").value,
        }),
      });
      Auth.save(token, user);
      window.location.href = "dashboard.html";
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = "block";
    }
  });
}

/* ---------- Dashboard page ---------- */
function initDashboardPage() {
  const dashRoot = document.getElementById("dashboard-root");
  if (!dashRoot) return;

  if (!Auth.isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }

  loadDashboard();

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      Auth.clear();
      window.location.href = "login.html";
    });
  }
}

async function loadDashboard() {
  try {
    const { user, fields, recommendations } = await apiFetch("/dashboard");
    Auth.save(Auth.getToken(), user); // keep local copy fresh

    // Profile card (matches original dashboard.html markup)
    const avatarEl = document.querySelector(".farmer-avatar");
    if (avatarEl) avatarEl.textContent = user.avatar || "👨‍🌾";
    setText("disp-name", user.name);
    setText("disp-location", "📍 " + ([user.village, user.district, user.state].filter(Boolean).join(", ") || "Location not set"));
    setText("disp-land", `${user.totalLandAcres ?? 0} acres`);
    setText("disp-soil", user.soilType || "-");
    setText("disp-ph", user.soilPh ?? "-");
    setText("disp-irrigation", user.irrigationType || "-");
    setText("disp-phone", user.phone || "—");
    setText("disp-since", new Date(user.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" }));

    // KPI row
    setText("kpi-total-fields", user.totalFields ?? "-");
    setText("kpi-total-land", `${user.totalLandAcres ?? 0} ac`);
    setText("kpi-recommendations", recommendations.length);
    const lastSelected = recommendations.find((r) => r.selectedCrop);
    setText("kpi-active-crop", lastSelected ? lastSelected.selectedCrop : "None yet");

    // Fields list
    setText("fields-count-badge", `${fields.length} field(s)`);
    const fieldsListEl = document.getElementById("fields-list");
    if (fieldsListEl) {
      fieldsListEl.innerHTML = fields
        .map((f) => `<div class="field-row"><span>${f.fieldName}</span><span>${f.landAreaAcres} acres</span></div>`)
        .join("") || `<p style="font-size:.85rem;">No fields found.</p>`;
    }

    // Current / most recent selected crop card
    const cropDisplay = document.getElementById("current-crop-display");
    if (cropDisplay) {
      if (lastSelected) {
        cropDisplay.innerHTML = `
          <div class="crop-emoji">${lastSelected.suggestions.find((s) => s.name === lastSelected.selectedCrop)?.icon || "🌱"}</div>
          <div class="crop-name">${lastSelected.selectedCrop}</div>
          <div class="crop-season">Planted on ${lastSelected.fieldsUsedCount} field(s)</div>`;
      } else {
        cropDisplay.innerHTML = `<p style="font-size:.85rem;">No crop selected yet. <a href="index.html#tools" style="color:var(--accent);">Get a recommendation →</a></p>`;
      }
    }

    // Recommendation history
    const historyEl = document.getElementById("history-list");
    if (historyEl) {
      historyEl.innerHTML = recommendations.length
        ? recommendations
            .map(
              (r) => `
              <div class="history-item">
                <div class="history-date">${new Date(r.createdAt).toLocaleString()}</div>
                <div>Top picks: ${r.suggestions.map((s) => s.name).join(", ")}</div>
                ${r.selectedCrop ? `<div>Selected: <span class="history-crop">${r.selectedCrop}</span> — ${r.fieldsUsedCount} field(s)</div>` : `<div style="color:var(--text-dim);">No crop selected yet</div>`}
              </div>`
            )
            .join("")
        : `<p style="font-size:.85rem;">No recommendations yet. <a href="index.html#tools" style="color:var(--accent);">Try the tool →</a></p>`;
    }
  } catch (err) {
    console.error(err);
    dashRoot.innerHTML = `<div class="result-error">Failed to load dashboard: ${err.message}</div>`;
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/* ---------- Edit Profile modal (dashboard.html) ---------- */
function openEditModal() {
  const user = Auth.getUser();
  if (!user) return;

  document.getElementById("ed-name").value = user.name || "";
  document.getElementById("ed-phone").value = user.phone || "";
  document.getElementById("ed-village").value = user.village || "";
  document.getElementById("ed-district").value = user.district || "";
  setSelectValue("ed-state", user.state);
  setSelectValue("ed-soil", user.soilType);
  setSelectValue("ed-irrigation", user.irrigationType);
  document.getElementById("ed-ph").value = user.soilPh ?? "";

  document.querySelectorAll(".avatar-opt").forEach((btn) => {
    const active = btn.dataset.val === (user.avatar || "👨‍🌾");
    btn.style.borderColor = active ? "var(--accent)" : "transparent";
    btn.style.background = active ? "var(--accent-soft)" : "var(--bg2)";
  });

  document.getElementById("modal-error").style.display = "none";
  document.getElementById("edit-modal").style.display = "block";
  document.body.style.overflow = "hidden";
}

function closeEditModal() {
  const modal = document.getElementById("edit-modal");
  if (modal) modal.style.display = "none";
  document.body.style.overflow = "";
}

function setSelectValue(id, val) {
  const sel = document.getElementById(id);
  if (!sel || !val) return;
  for (const opt of sel.options) {
    if (opt.value === val || opt.text === val) { sel.value = opt.value; return; }
  }
}

function selectAvatar(btn) {
  document.querySelectorAll(".avatar-opt").forEach((b) => {
    b.style.borderColor = "transparent";
    b.style.background = "var(--bg2)";
  });
  btn.style.borderColor = "var(--accent)";
  btn.style.background = "var(--accent-soft)";
}

function getSelectedAvatar() {
  const btn = [...document.querySelectorAll(".avatar-opt")].find((b) => b.style.borderColor === "var(--accent)");
  return btn ? btn.dataset.val : "👨‍🌾";
}

async function saveProfile() {
  const errEl = document.getElementById("modal-error");
  const name = document.getElementById("ed-name").value.trim();
  if (!name) {
    errEl.textContent = "Please enter the farmer name.";
    errEl.style.display = "block";
    return;
  }
  const ph = parseFloat(document.getElementById("ed-ph").value);
  if (document.getElementById("ed-ph").value && (isNaN(ph) || ph < 0 || ph > 14)) {
    errEl.textContent = "Soil pH must be between 0 and 14.";
    errEl.style.display = "block";
    return;
  }
  errEl.style.display = "none";

  try {
    const { user } = await apiFetch("/dashboard/profile", {
      method: "PUT",
      body: JSON.stringify({
        name,
        phone: document.getElementById("ed-phone").value.trim(),
        village: document.getElementById("ed-village").value.trim(),
        district: document.getElementById("ed-district").value.trim(),
        state: document.getElementById("ed-state").value,
        soilType: document.getElementById("ed-soil").value,
        soilPh: document.getElementById("ed-ph").value,
        irrigationType: document.getElementById("ed-irrigation").value,
        avatar: getSelectedAvatar(),
      }),
    });
    Auth.save(Auth.getToken(), user);
    closeEditModal();
    loadDashboard();

    const toast = document.getElementById("save-toast");
    if (toast) {
      toast.style.display = "block";
      setTimeout(() => { toast.style.display = "none"; }, 3000);
    }
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = "block";
  }
}

// Close modal on Escape
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeEditModal(); });
