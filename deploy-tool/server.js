const express = require("express");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");

const app = express();
const PORT = 3000;
const CONFIG_PATH = path.join(__dirname, "config.json");
const LOG_PATH = path.join(__dirname, "deploy_log.txt");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ─── Helpers ────────────────────────────────────────────────────────

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf-8");
}

/**
 * Build robocopy commands for a single target.
 * @param {string} source
 * @param {string} target
 * @param {object} opts  – { excludeFiles, excludeDirs, subfolders, listOnly }
 * @returns {string[]}   array of robocopy command strings
 */
function buildRobocopyCommands(source, target, opts) {
  const xfFlags = opts.excludeFiles.map((f) => `"${f}"`).join(" ");
  const xdFlags = opts.excludeDirs.map((d) => `"${d}"`).join(" ");

  const listFlag = opts.listOnly ? " /L" : "";
  const common = `/XO /XF ${xfFlags} /XD ${xdFlags} /NJH /NJS /NDL /NS /NC /NP`;
  const deployCom = `/XO /XF ${xfFlags} /XD ${xdFlags} /V /R:2 /W:2`;

  const flags = opts.listOnly ? common + listFlag : deployCom;

  const cmds = [];

  // Root – /LEV:1 (only top-level files)
  cmds.push(`robocopy "${source}" "${target}" /LEV:1 ${flags}`);

  // Sub-folders – /E (recursive)
  for (const sub of opts.subfolders) {
    cmds.push(
      `robocopy "${source}\\${sub}" "${target}\\${sub}" /E ${flags}`
    );
  }

  return cmds;
}

/**
 * Execute a command and return { stdout, stderr, code }.
 * Robocopy returns exit-codes < 8 on success, so we treat < 8 as OK.
 */
function run(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      const code = err ? err.code || 1 : 0;
      resolve({ stdout, stderr, code });
    });
  });
}

/**
 * Clean robocopy output for UI display.
 * Strips absolute source/target path prefixes and normalizes markers.
 */
function cleanRobocopyOutput(output, source, target) {
  if (!output) return "";

  const normSource = source.toLowerCase().replace(/\\/g, "/");
  const normTarget = target.toLowerCase().replace(/\\/g, "/");

  const lines = output.split(/\r?\n/);
  const cleaned = lines.map(line => {
    let l = line.trim();
    if (!l) return null;

    let normL = l.toLowerCase().replace(/\\/g, "/");
    let found = false;

    if (normL.includes(normSource)) {
      const idx = normL.indexOf(normSource);
      l = l.substring(0, idx) + l.substring(idx + source.length);
      found = true;
    }
    
    normL = l.toLowerCase().replace(/\\/g, "/");
    if (normL.includes(normTarget)) {
      const idx = normL.indexOf(normTarget);
      l = l.substring(0, idx) + l.substring(idx + target.length);
      found = true;
    }

    if (!found) return l;

    // Clean up markers and leading slashes
    l = l.replace(/(\*.*?\*\s+)[\\\/]+/, "$1");
    l = l.replace(/^[\\\/]+/, "");
    
    return l.trim();
  }).filter(l => l && l.length > 0);

  return [...new Set(cleaned)].join("\n");
}

// ─── API Routes ─────────────────────────────────────────────────────

/** Return current config */
app.get("/api/config", (_req, res) => {
  try {
    res.json(loadConfig());
  } catch (e) {
    res.status(500).json({ error: "Failed to load config: " + e.message });
  }
});

/** Save updated config */
app.post("/api/config", (req, res) => {
  try {
    saveConfig(req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to save config: " + e.message });
  }
});

/** Preview (dry-run) for all targets */
app.post("/api/preview", async (_req, res) => {
  try {
    const cfg = loadConfig();
    const results = [];

    for (const target of cfg.targets) {
      const cmds = buildRobocopyCommands(cfg.source, target, {
        excludeFiles: cfg.excludeFiles,
        excludeDirs: cfg.excludeDirs,
        subfolders: cfg.subfolders,
        listOnly: true,
      });

      let output = "";
      for (const cmd of cmds) {
        const r = await run(cmd);
        output += r.stdout;
        if (r.stderr) output += r.stderr;
      }
      const cleaned = cleanRobocopyOutput(output.trim(), cfg.source, target);
      results.push({ target, output: cleaned });
    }

    res.json({ results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** Deploy to all targets */
app.post("/api/deploy", async (_req, res) => {
  try {
    const cfg = loadConfig();
    const timestamp = new Date().toLocaleString();
    let logContent = `Deployment Started: ${timestamp}\n${"=".repeat(60)}\n\n`;
    const results = [];

    for (const target of cfg.targets) {
      const cmds = buildRobocopyCommands(cfg.source, target, {
        excludeFiles: cfg.excludeFiles,
        excludeDirs: cfg.excludeDirs,
        subfolders: cfg.subfolders,
        listOnly: false,
      });

      let output = `>>> UPDATING TARGET: ${target}\n`;
      for (const cmd of cmds) {
        const r = await run(cmd);
        output += r.stdout;
        if (r.stderr) output += r.stderr;
        // robocopy exit codes < 8 are success
        if (r.code >= 8) {
          output += `\n[ERROR] robocopy exited with code ${r.code}\n`;
        }
      }

      logContent += output + "\n";
      const cleaned = cleanRobocopyOutput(output.trim(), cfg.source, target);
      results.push({ target, output: cleaned });
    }

    logContent += `\n${"=".repeat(60)}\nDeployment Finished: ${new Date().toLocaleString()}\n`;
    fs.writeFileSync(LOG_PATH, logContent, "utf-8");

    res.json({ results, logFile: LOG_PATH });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** Read the latest log file */
app.get("/api/logs", (_req, res) => {
  try {
    if (!fs.existsSync(LOG_PATH)) {
      return res.json({ log: "No deployment log found yet." });
    }
    res.json({ log: fs.readFileSync(LOG_PATH, "utf-8") });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Start ──────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Deploy Tool running at http://localhost:${PORT}`);
});
