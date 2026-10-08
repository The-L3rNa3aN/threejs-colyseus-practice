Neutralino.init();

let serverProcessId = null;
let tunnelProcessId = null;
let publicUrl = null;

const logEl = document.getElementById("log");
const statusEl = document.getElementById("status");
const publicUrlBox = document.getElementById("publicUrlBox");
const btnCopyUrl = document.getElementById("btnCopyUrl");

function log(message) {
    const time = new Date().toLocaleTimeString();
    logEl.textContent += `[${time}] ${message}\n`;
    logEl.scrollTop = logEl.scrollHeight;
    console.log(message);
}

function setStatus(text) {
    statusEl.textContent = "Status: " + text;
}

function updateButtons(running) {
    document.getElementById("btnStartServer").disabled = running;
    document.getElementById("btnStartTunnel").disabled = running;
    document.getElementById("btnStartBoth").disabled = running;
    document.getElementById("btnStop").disabled = !running;
}

function setPublicUrl(url) {
    publicUrl = url;
    if (url) {
        publicUrlBox.textContent = url;
        btnCopyUrl.disabled = false;
    } else {
        publicUrlBox.textContent = "Not available yet";
        btnCopyUrl.disabled = true;
    }
}

// Single event listener for all spawned processes
Neutralino.events.on("spawnedProcess", (evt) => {
    const { id, action, data } = evt.detail;

    if (id === serverProcessId) {
        if (action === "stdOut" || action === "stdErr") {
            log(`[Server] ${data}`);
        }
        if (action === "exit") {
            log("Server process exited");
            serverProcessId = null;
        }
    }

    if (id === tunnelProcessId) {
        if (action === "stdOut" || action === "stdErr") {
            log(`[Tunnel] ${data}`);

            const match = data.match(/https:\/\/[a-zA-Z0-9-]+\.lhr\.life/);
            if (match && !publicUrl) {
                setPublicUrl(match[0]);
                log("Public URL detected: " + match[0]);
                setStatus("Ready → " + match[0]);
            }
        }
        if (action === "exit") {
            log("Tunnel process exited");
            tunnelProcessId = null;
            setPublicUrl(null);
        }
    }
});

async function startServer() {
    try {
        log("Starting Colyseus server...");
        const result = await Neutralino.os.spawnProcess("node ../build/index.js");
        serverProcessId = result.id;
        log("Server started");
        setStatus("Server running");
    } catch (err) {
        log("Failed to start server: " + err.message);
    }
}

async function startTunnel() {
    try {
        log("Starting tunnel...");
        const command = `ssh -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o StrictHostKeyChecking=no -R 80:localhost:2567 nokey@localhost.run`;
        const result = await Neutralino.os.spawnProcess(command);
        tunnelProcessId = result.id;
        log("Tunnel started");
    } catch (err) {
        log("Failed to start tunnel: " + err.message);
    }
}

async function startBoth() {
    updateButtons(true);
    setStatus("Starting...");
    setPublicUrl(null);
    await startServer();

    setTimeout(async () => {
        await startTunnel();
    }, 2000);
}

async function stopAll() {
    log("Stopping processes...");

    try {
        if (serverProcessId !== null) {
            await Neutralino.os.updateSpawnedProcess(serverProcessId, "exit");
            serverProcessId = null;
        }
        if (tunnelProcessId !== null) {
            await Neutralino.os.updateSpawnedProcess(tunnelProcessId, "exit");
            tunnelProcessId = null;
        }
    } catch (err) {
        log("Error while stopping: " + err.message);
    }

    setPublicUrl(null);
    updateButtons(false);
    setStatus("Idle");
    log("All processes stopped");
}

// Button events
document.getElementById("btnStartServer").addEventListener("click", async () => {
    updateButtons(true);
    await startServer();
});

document.getElementById("btnStartTunnel").addEventListener("click", async () => {
    updateButtons(true);
    await startTunnel();
});

document.getElementById("btnClearLog").addEventListener("click", () => {
  logEl.textContent = "";
  log("Log cleared.");
});

document.getElementById("btnStartBoth").addEventListener("click", startBoth);
document.getElementById("btnStop").addEventListener("click", stopAll);

btnCopyUrl.addEventListener("click", async () => {
    if (!publicUrl) return;
    try {
        await Neutralino.clipboard.writeText(publicUrl);
        log("Public URL copied to clipboard");
    } catch (err) {
        log("Failed to copy: " + err.message);
    }
});

// Clean shutdown
Neutralino.events.on("windowClose", async () => {
    await stopAll();
    Neutralino.app.exit();
});

log("Launcher ready.");
setStatus("Idle");
updateButtons(false);
setPublicUrl(null);