import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverEntry = path.join(__dirname, "build", "index.js");

let publicUrl = null;
let serverReady = false;
let percent = 0;
let label = "Preparing host...";
let progressTimer = null;
let finished = false;

function printBanner() {
  console.log("=================================");
  console.log("  Colyseus Host");
  console.log("=================================");
  console.log("");
}

function renderProgress() {
  const width = 24;
  const clamped = Math.max(0, Math.min(100, Math.floor(percent)));
  const filled = Math.round((clamped / 100) * width);
  const bar = "█".repeat(filled) + "-".repeat(width - filled);
  process.stdout.write(`\r[${bar}] ${clamped}%  ${label}`.padEnd(80));
}

function setProgress(nextPercent, nextLabel) {
  percent = nextPercent;
  if (nextLabel) label = nextLabel;
  renderProgress();
}

function completeProgress(nextLabel = "Ready") {
  if (finished) return;
  finished = true;
  if (progressTimer) clearInterval(progressTimer);
  setProgress(100, nextLabel);
  process.stdout.write("\n");
}

function logStep(message) {
  console.log(`✔ ${message}`);
}

function logError(message) {
  console.error(`✖ ${message}`);
}

function printPublicUrl(url) {
  console.log("");
  console.log("=================================");
  console.log("  PUBLIC URL READY");
  console.log("=================================");
  console.log(url);
  console.log("");
  console.log("Next steps:");
  console.log("1. Open the client");
  console.log("2. Paste this URL and create a room");
  console.log("3. Share roomId@url with your friend");
  console.log("=================================");
  console.log("");
}

printBanner();
setProgress(5, "Preparing host...");

// Smooth same-line progress animation
progressTimer = setInterval(() => {
  if (finished) return;

  // Creep forward slowly while waiting for real events
  if (percent < 90) {
    percent += percent < 30 ? 2 : percent < 60 ? 1 : 0.5;
    renderProgress();
  }
}, 150);

const server = spawn(process.execPath, [serverEntry], {
  cwd: __dirname,
  stdio: ["ignore", "pipe", "pipe"],
  env: {
    ...process.env,
    NODE_ENV: "production",
  },
});

function handleServerData(data) {
  const text = data.toString();

  if (!serverReady && /2567|listening|Colyseus/i.test(text)) {
    serverReady = true;
    setProgress(55, "Server started. Opening tunnel...");
  }

  if (/error|cannot|failed|EADDRINUSE/i.test(text)) {
    if (progressTimer) clearInterval(progressTimer);
    process.stdout.write("\n");
    logError(text.trim());
  }
}

server.stdout.on("data", handleServerData);
server.stderr.on("data", handleServerData);

server.on("exit", (code) => {
  if (progressTimer) clearInterval(progressTimer);
  process.stdout.write("\n");
  if (code) logError(`Server exited with code ${code}`);
  process.exit(code ?? 1);
});

setTimeout(() => {
  setProgress(Math.max(percent, 65), "Connecting tunnel...");

  const tunnel = spawn(
    "ssh",
    [
      "-o", "ServerAliveInterval=30",
      "-o", "ServerAliveCountMax=3",
      "-o", "StrictHostKeyChecking=no",
      "-R", "80:localhost:2567",
      "nokey@localhost.run",
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  function handleTunnelData(data) {
    const text = data.toString();

    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.lhr\.life/);
    if (match && !publicUrl) {
      publicUrl = match[0];
      completeProgress("Ready");
      logStep("Colyseus server started");
      logStep("Tunnel connected");
      printPublicUrl(publicUrl);
      return;
    }

    if (/Welcome to localhost\.run|Pseudo-terminal|QR:|authn:/i.test(text)) {
      return;
    }

    if (/permission denied|failed|error/i.test(text)) {
      if (progressTimer) clearInterval(progressTimer);
      process.stdout.write("\n");
      logError(text.trim());
    }
  }

  tunnel.stdout.on("data", handleTunnelData);
  tunnel.stderr.on("data", handleTunnelData);

  tunnel.on("exit", (code) => {
    if (progressTimer) clearInterval(progressTimer);
    process.stdout.write("\n");
    if (code) logError(`Tunnel exited with code ${code}`);
    try { server.kill(); } catch {}
    process.exit(code ?? 1);
  });

  const shutdown = () => {
    if (progressTimer) clearInterval(progressTimer);
    process.stdout.write("\n");
    console.log("Shutting down host...");
    try { tunnel.kill(); } catch {}
    try { server.kill(); } catch {}
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}, 1500);