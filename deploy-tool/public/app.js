/* Deploy Tool – SPA Client */

(function () {
  "use strict";

  // ── DOM refs ──────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const cfgSource = $("#cfgSource");
  const cfgTargets = $("#cfgTargets");
  const cfgExFiles = $("#cfgExFiles");
  const cfgExDirs = $("#cfgExDirs");
  const cfgSubs = $("#cfgSubs");

  const btnPreview = $("#btnPreview");
  const btnDeploy = $("#btnDeploy");
  const btnLogs = $("#btnLogs");
  const btnSaveConfig = $("#btnSaveConfig");
  const saveFeedback = $("#saveFeedback");

  const outputCard = $("#outputCard");
  const outputTitle = $("#outputTitle");
  const outputPanels = $("#outputPanels");
  const btnClearOutput = $("#btnClearOutput");

  const confirmModal = $("#confirmModal");
  const modalTargetCount = $("#modalTargetCount");
  const btnModalCancel = $("#btnModalCancel");
  const btnModalConfirm = $("#btnModalConfirm");

  const globalStatus = $("#globalStatus");

  let config = null;

  // ── Map list keys to their DOM containers and input fields ──
  const listMap = {
    targets:      { container: cfgTargets,  input: $("#addTarget") },
    excludeFiles: { container: cfgExFiles,  input: $("#addExFile") },
    excludeDirs:  { container: cfgExDirs,   input: $("#addExDir") },
    subfolders:   { container: cfgSubs,     input: $("#addSub") },
  };

  // ── Helpers ───────────────────────────────────────────────

  function setStatus(state, text) {
    const dot = globalStatus.querySelector(".status-dot");
    const label = globalStatus.querySelector(".status-text");
    dot.className = "status-dot " + state;
    label.textContent = text;
  }

  /** Render tags with × remove buttons */
  function renderTags(listKey) {
    const { container } = listMap[listKey];
    const items = config[listKey];
    container.innerHTML = "";
    items.forEach((item, idx) => {
      const li = document.createElement("li");
      li.innerHTML = `${escapeHtml(item)}<button class="tag-remove" data-list="${listKey}" data-index="${idx}" title="Remove">×</button>`;
      container.appendChild(li);
    });
  }

  function renderAllTags() {
    Object.keys(listMap).forEach(renderTags);
  }

  function setLoading(btn, loading) {
    if (loading) {
      btn.dataset.origHtml = btn.innerHTML;
      const label = btn.textContent.trim();
      btn.innerHTML = `<span class="spinner"></span> ${label}…`;
      btn.disabled = true;
    } else {
      btn.innerHTML = btn.dataset.origHtml || btn.innerHTML;
      btn.disabled = false;
    }
  }

  function showOutput(title, results) {
    outputTitle.textContent = title;
    outputPanels.innerHTML = "";

    if (!results || results.length === 0) {
      outputPanels.innerHTML = `<div class="output-empty">No output to display.</div>`;
    } else {
      results.forEach((r) => {
        const div = document.createElement("div");
        div.className = "output-target";
        const content = r.output || "(no changes detected)";
        div.innerHTML = `
          <div class="output-target-header">
            <span class="dot"></span>
            ${escapeHtml(r.target)}
          </div>
          <pre>${escapeHtml(content)}</pre>
        `;
        outputPanels.appendChild(div);
      });
    }

    outputCard.style.display = "";
    outputCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function flashFeedback(msg, isError) {
    saveFeedback.textContent = msg;
    saveFeedback.style.color = isError ? "var(--red)" : "var(--green)";
    saveFeedback.classList.add("show");
    setTimeout(() => saveFeedback.classList.remove("show"), 2500);
  }

  // ── Config toggle ────────────────────────────────────────
  const configHeader = document.querySelector('[data-toggle="configBody"]');
  const configBody = $("#configBody");
  configHeader.addEventListener("click", () => {
    configHeader.classList.toggle("collapsed");
    configBody.classList.toggle("collapsed");
  });

  // ── Load Config ──────────────────────────────────────────
  async function loadConfig() {
    try {
      const res = await fetch("/api/config");
      config = await res.json();
      cfgSource.value = config.source;
      renderAllTags();
    } catch (e) {
      cfgSource.value = "";
      cfgSource.placeholder = "Error loading config";
      console.error(e);
    }
  }

  // ── Add item to a list ────────────────────────────────────
  function addItem(listKey) {
    const { input } = listMap[listKey];
    const value = input.value.trim();
    if (!value) return;
    if (config[listKey].includes(value)) {
      flashFeedback("Already exists!", true);
      return;
    }
    config[listKey].push(value);
    input.value = "";
    renderTags(listKey);
  }

  // ── Remove item from a list ──────────────────────────────
  function removeItem(listKey, index) {
    config[listKey].splice(index, 1);
    renderTags(listKey);
  }

  // ── Event: Add buttons ───────────────────────────────────
  document.querySelectorAll(".btn-add").forEach((btn) => {
    btn.addEventListener("click", () => {
      addItem(btn.dataset.list);
    });
  });

  // ── Event: Enter key in add inputs ────────────────────────
  Object.entries(listMap).forEach(([key, { input }]) => {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addItem(key);
      }
    });
  });

  // ── Event: Remove buttons (delegated) ─────────────────────
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("tag-remove")) {
      const listKey = e.target.dataset.list;
      const index = parseInt(e.target.dataset.index, 10);
      removeItem(listKey, index);
    }
  });

  // ── Save Config ──────────────────────────────────────────
  btnSaveConfig.addEventListener("click", async () => {
    config.source = cfgSource.value.trim();
    setLoading(btnSaveConfig, true);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      flashFeedback("✓ Config saved");
    } catch (e) {
      flashFeedback("Save failed: " + e.message, true);
    } finally {
      setLoading(btnSaveConfig, false);
    }
  });

  // ── Preview ──────────────────────────────────────────────
  btnPreview.addEventListener("click", async () => {
    setLoading(btnPreview, true);
    setStatus("working", "Previewing…");
    btnDeploy.disabled = true;

    try {
      const res = await fetch("/api/preview", { method: "POST" });
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      showOutput("Preview – Changed Files", data.results);
      setStatus("idle", "Preview complete");
      btnDeploy.disabled = false;
    } catch (e) {
      setStatus("error", "Preview failed");
      showOutput("Error", [{ target: "Error", output: e.message }]);
    } finally {
      setLoading(btnPreview, false);
    }
  });

  // ── Deploy (with confirm) ────────────────────────────────
  btnDeploy.addEventListener("click", () => {
    if (!config) return;
    modalTargetCount.textContent = config.targets.length;
    confirmModal.classList.add("active");
  });

  btnModalCancel.addEventListener("click", () => {
    confirmModal.classList.remove("active");
  });

  confirmModal.addEventListener("click", (e) => {
    if (e.target === confirmModal) confirmModal.classList.remove("active");
  });

  btnModalConfirm.addEventListener("click", async () => {
    confirmModal.classList.remove("active");
    setLoading(btnDeploy, true);
    btnPreview.disabled = true;
    setStatus("working", "Deploying…");

    try {
      const res = await fetch("/api/deploy", { method: "POST" });
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      showOutput("Deployment Results", data.results);
      setStatus("idle", "Deployment complete");
    } catch (e) {
      setStatus("error", "Deployment failed");
      showOutput("Error", [{ target: "Error", output: e.message }]);
    } finally {
      setLoading(btnDeploy, false);
      btnPreview.disabled = false;
      btnDeploy.disabled = true; // require a new preview
    }
  });

  // ── View Logs ────────────────────────────────────────────
  btnLogs.addEventListener("click", async () => {
    setLoading(btnLogs, true);
    try {
      const res = await fetch("/api/logs");
      const data = await res.json();
      showOutput("Deployment Log", [{ target: "deploy_log.txt", output: data.log }]);
    } catch (e) {
      showOutput("Error", [{ target: "Error", output: e.message }]);
    } finally {
      setLoading(btnLogs, false);
    }
  });

  // ── Clear output ─────────────────────────────────────────
  btnClearOutput.addEventListener("click", () => {
    outputCard.style.display = "none";
  });

  // ── Keyboard shortcut (Escape closes modal) ──────────────
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      confirmModal.classList.remove("active");
    }
  });

  // ── Init ─────────────────────────────────────────────────
  loadConfig();
})();
