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

  // ── Helpers ───────────────────────────────────────────────

  function setStatus(state, text) {
    const dot = globalStatus.querySelector(".status-dot");
    const label = globalStatus.querySelector(".status-text");
    dot.className = "status-dot " + state;
    label.textContent = text;
  }

  function tags(container, items, cls) {
    container.innerHTML = "";
    items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      container.appendChild(li);
    });
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
      cfgSource.textContent = config.source;
      tags(cfgTargets, config.targets);
      tags(cfgExFiles, config.excludeFiles);
      tags(cfgExDirs, config.excludeDirs);
      tags(cfgSubs, config.subfolders);
    } catch (e) {
      cfgSource.textContent = "Error loading config";
      console.error(e);
    }
  }

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
