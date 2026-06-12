#!/usr/bin/env node
/*
 * setup.js — generates index.html + data.json for "Puerta al Cielo".
 *
 * Same model as the "letter" site: a static page served by GitHub Pages that
 * reads/writes its shared state (logs, settings, user code) in data.json via
 * the GitHub Contents API. The GitHub token is encrypted (PBKDF2 + AES-256-GCM)
 * with the admin code and embedded in index.html; the admin decrypts it in the
 * browser after logging in. The user code decrypts a second copy of the same
 * token so the user can append their access log entry.
 *
 * Usage:
 *   node setup.js <github-token>      (or set GH_TOKEN, or have `gh auth login`)
 *   node setup.js <token> --force-data   overwrite an existing data.json
 *
 * After running: commit & push to the `puerta-al-cielo` repo and enable Pages.
 */
const crypto = require("crypto");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// ── CONFIG ──────────────────────────────────────────────────────────
const ADMIN_CODE = "Qwerty1234!";
const DEFAULT_USER_CODE = "locademanual";
const GITHUB_OWNER = "AndresRomero2001";
const GITHUB_REPO = "puerta-al-cielo";

// Default content (admin can change everything from the Configuración tab)
const DEFAULT_LATITUDE = "";
const DEFAULT_LONGITUDE = "";
const DEFAULT_COORDS_LABEL = "";
const DEFAULT_COUNTDOWN_TARGET = ""; // "YYYY-MM-DDTHH:mm" (browser local time)
const DEFAULT_ZERO_MESSAGE = "¿Me acompañas al cielo?"; // shown after accepting the terms
const DEFAULT_TERMS_TEXT =
  "<h3>Términos y condiciones</h3>" +
  "<p>Al aceptar, te comprometes a:</p>" +
  "<ul>" +
  "<li>Reservar los días 19 y 20 para esta aventura.</li>" +
  "<li>Venir con muchas ganas.</li>" +
  "<li>Dejarte sorprender.</li>" +
  "</ul>" +
  "<p>Estos términos pueden incluir momentos inolvidables. No se admiten devoluciones.</p>";
const DEFAULT_GATE_TITLE = "Puerta al Cielo";
const DEFAULT_GATE_SUB = "Introduce el código de acceso";
// ────────────────────────────────────────────────────────────────────

const ADMIN_HASH = crypto.createHash("sha256").update(ADMIN_CODE).digest("hex");
const GITHUB_API_FILE =
  "https://api.github.com/repos/" + GITHUB_OWNER + "/" + GITHUB_REPO + "/contents/data.json";
const DEPLOY_URL =
  "https://" + GITHUB_OWNER.toLowerCase() + ".github.io/" + GITHUB_REPO + "/";

// ── Get GitHub token ────────────────────────────────────────────────
let ghToken;
const tokenArg = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (tokenArg) {
  ghToken = tokenArg;
  console.log("GitHub token provided via argument");
} else if (process.env.GH_TOKEN) {
  ghToken = process.env.GH_TOKEN;
  console.log("GitHub token provided via GH_TOKEN env var");
} else {
  try {
    ghToken = execSync("gh auth token", { encoding: "utf8" }).trim();
    console.log("GitHub token obtained from gh CLI");
  } catch {
    console.error("ERROR: Provide token as argument or run 'gh auth login'.");
    process.exit(1);
  }
}

// ── Encrypt token with a password (PBKDF2 + AES-256-GCM) ─────────────
function encryptToken(token, password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(token, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const tag = cipher.getAuthTag();
  return (
    salt.toString("hex") + ":" +
    iv.toString("hex") + ":" +
    tag.toString("hex") + ":" +
    encrypted.toString("hex")
  );
}

const encAdminToken = encryptToken(ghToken, ADMIN_CODE);
const encUserToken = encryptToken(ghToken, DEFAULT_USER_CODE);

// ── Write data.json (only if it does not already exist) ──────────────
const dataPath = path.join(__dirname, "data.json");
if (fs.existsSync(dataPath) && !process.argv.includes("--force-data")) {
  console.log("data.json already exists — leaving it untouched (pass --force-data to overwrite)");
} else {
  const dataJson = {
    userCode: DEFAULT_USER_CODE,
    encUserToken: encUserToken,
    coordsLabel: DEFAULT_COORDS_LABEL,
    latitude: DEFAULT_LATITUDE,
    longitude: DEFAULT_LONGITUDE,
    countdownTarget: DEFAULT_COUNTDOWN_TARGET,
    zeroMessage: DEFAULT_ZERO_MESSAGE,
    termsText: DEFAULT_TERMS_TEXT,
    termsAccepted: false,
    reservaAnswer: "",
    reservaAnsweredAt: "",
    pageDisabled: false,
    gateTitle: DEFAULT_GATE_TITLE,
    gateSub: DEFAULT_GATE_SUB,
    logs: []
  };
  fs.writeFileSync(dataPath, JSON.stringify(dataJson, null, 2));
  console.log("data.json created");
}

// ── Generate index.html from the template ────────────────────────────
const templatePath = path.join(__dirname, "index.template.html");
let html = fs.readFileSync(templatePath, "utf8");
html = html
  .replace(/__GITHUB_API__/g, GITHUB_API_FILE)
  .replace(/__ADMIN_HASH__/g, ADMIN_HASH)
  .replace(/__ENC_ADMIN_TOKEN__/g, encAdminToken);
fs.writeFileSync(path.join(__dirname, "index.html"), html);

console.log("index.html generated!");
console.log('Admin code: "' + ADMIN_CODE + '"');
console.log('Default user code: "' + DEFAULT_USER_CODE + '"');
console.log("Deploy URL: " + DEPLOY_URL);
console.log("\nNext steps:");
console.log("  1. Create a GitHub repo named '" + GITHUB_REPO + "' under '" + GITHUB_OWNER + "'.");
console.log("  2. git init && git add . && git commit -m 'init' && git push");
console.log("  3. Enable GitHub Pages (Settings → Pages → deploy from main branch).");
