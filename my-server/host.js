import { spawn } from "child_process";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverEntry = path.join(__dirname, "build", "index.js");

let serverProc = null;
let tunnelProc = null;
let publicUrl = null;
let starting = false;

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

function printBanner()
{
	console.log(`=================================\n   Colyseus Host\n=================================\nCommands:\n  start   Start server + tunnel\n  stop    Stop server + tunnel\n  status  Show current status\n  exit    Quit the host\n=================================\n`);
}

function ask() {
	rl.question("> ", async (input) => {
		const cmd = input.trim().toLowerCase();

		switch(cmd)
		{
			case "start":
				await startAll();
				break;

			case "stop":
				await stopAll();
				break;

			case "status":
				showStatus();
				break;

			case "exit":
			case "quit":
				await stopAll();
				rl.close();
				process.exit(0);
				break;

			default:
				console.log("Unknown command. Use: start | stop | status | exit");
				break;
		}

		ask();
	});
}

function showStatus()
{
	console.log(`Status:\n  Server: ${serverProc ? "running" : "stopped"}\n  Tunnel: ${tunnelProc ? "running" : "stopped"}\n  Public URL: ${publicUrl || "n/a"}\n`);
}

async function startAll()
{
	if (starting)
	{
		console.log("Already starting...");
		return;
	}

	if (serverProc || tunnelProc)
	{
		console.log("Already running. Use 'stop' first.");
		return;
	}

	starting = true;
	publicUrl = null;

	console.log("Starting Colyseus server...");
	serverProc = spawn(process.execPath, [serverEntry],
	{
		cwd: __dirname,
		stdio: ["ignore", "pipe", "pipe"],
		env:
		{
			...process.env,
			NODE_ENV: "production",
		},
	});

	serverProc.stdout.on("data", (data) =>
	{
		const text = data.toString();
		if (/error|cannot|failed|EADDRINUSE/i.test(text)) process.stdout.write(`[Server] ${text}`);
	});

	serverProc.stderr.on("data", (data) =>
    {
		const text = data.toString();
		if (/error|cannot|failed|EADDRINUSE/i.test(text)) process.stdout.write(`[Server] ${text}`);
	});

	serverProc.on("exit", (code) =>
    {
		console.log(`Server stopped${code ? ` (code ${code})` : ""}`);
		serverProc = null;
	});

	// Wait a moment for server boot, then start tunnel
	setTimeout(() => {
		console.log("Starting tunnel...");

		tunnelProc = spawn(
			"ssh",
			[
				"-o", "ServerAliveInterval=30",
				"-o", "ServerAliveCountMax=3",
				"-o", "StrictHostKeyChecking=no",
				"-R", "80:localhost:2567",
				"nokey@localhost.run",
			],
			{ stdio: ["ignore", "pipe", "pipe"] }
		);

		const handleTunnel = (data) => {
			const text = data.toString();
			const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.lhr\.life/);

			if (match && !publicUrl) {
				publicUrl = match[0];

				console.log(`=================================\n  PUBLIC URL READY\n=================================\n${publicUrl}\n=================================\n`);
			}

			if (/permission denied|failed|error/i.test(text) && !/Welcome to localhost\.run/i.test(text))
				process.stdout.write(`[Tunnel] ${text}`);
		};

		tunnelProc.stdout.on("data", handleTunnel);
		tunnelProc.stderr.on("data", handleTunnel);

		tunnelProc.on("exit", (code) =>
		{
			console.log(`Tunnel stopped${code ? ` (code ${code})` : ""}`);
			tunnelProc = null;
			publicUrl = null;
		});

		starting = false;
		console.log("Start requested. Waiting for public URL...");
	}, 1500);
}

async function stopAll() {
	console.log("Stopping...");

	if (tunnelProc) {
		try { tunnelProc.kill(); } catch { }
		tunnelProc = null;
	}

	if (serverProc) {
		try { serverProc.kill(); } catch { }
		serverProc = null;
	}

	publicUrl = null;
	starting = false;
	console.log("Stopped.");
}

printBanner();
ask();

process.on("SIGINT", async () => {
	await stopAll();
	process.exit(0);
});