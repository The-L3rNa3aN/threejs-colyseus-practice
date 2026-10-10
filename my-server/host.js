import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverEntry = path.join(__dirname, "build", "index.js");

console.log("=================================");
console.log("  Colyseus Host");
console.log("=================================");
console.log("");

// Start Colyseus server
console.log("Starting Colyseus server...");
const server = spawn(process.execPath, [serverEntry], {
  cwd: __dirname,
  stdio: ["ignore", "pipe", "pipe"],
});

server.stdout.on("data", (data) => {
  process.stdout.write(`[Server] ${data}`);
});

server.stderr.on("data", (data) => {
  process.stderr.write(`[Server Error] ${data}`);
});

server.on("exit", (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code ?? 1);
});

// Give server a moment, then start tunnel
setTimeout(() => {
  console.log("");
  console.log("Starting tunnel...");
  console.log("");

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

  tunnel.stdout.on("data", (data) => {
    const text = data.toString();
    process.stdout.write(`[Tunnel] ${text}`);

    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.lhr\.life/);
    if (match) {
      console.log("");
      console.log("=================================");
      console.log("  PUBLIC URL");
      console.log("=================================");
      console.log(match[0]);
      console.log("");
      console.log("Copy this URL into the client, create a room,");
      console.log("then share roomId@url with your friend.");
      console.log("=================================");
      console.log("");
    }
  });

  tunnel.stderr.on("data", (data) => {
    const text = data.toString();
    process.stderr.write(`[Tunnel] ${text}`);

    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.lhr\.life/);
    if (match) {
      console.log("");
      console.log("=================================");
      console.log("  PUBLIC URL");
      console.log("=================================");
      console.log(match[0]);
      console.log("");
      console.log("Copy this URL into the client, create a room,");
      console.log("then share roomId@url with your friend.");
      console.log("=================================");
      console.log("");
    }
  });

  tunnel.on("exit", (code) => {
    console.log(`Tunnel exited with code ${code}`);
    server.kill();
    process.exit(code ?? 1);
  });

  const shutdown = () => {
    console.log("\nShutting down...");
    try { tunnel.kill(); } catch {}
    try { server.kill(); } catch {}
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}, 2000);