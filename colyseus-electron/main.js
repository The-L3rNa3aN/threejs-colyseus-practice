const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const kill = require('tree-kill');

let mainWindow;
let serverProcess = null;
let tunnelProcess = null;

// Path to your Colyseus server folder
const serverPath = path.join(__dirname, '..', 'my-server');

function startTunnel()
{
    return new Promise((resolve, reject) =>
    {
        if (tunnelProcess) return reject(new Error("Tunnel is already running"));

        console.log("Starting tunnel...");

        tunnelProcess = spawn("ssh",
        [
            "-o", "ServerAliveInterval=30",
            "-o", "ServerAliveCountMax=3",
            "-o", "StrictHostKeyChecking=no",
            "-R", "80:localhost:2567",
            "nokey@localhost.run"
        ]);

        let resolved = false;
        let fullOutput = "";
        let onData = (data) =>
        {
            let text = data.toString();

            fullOutput += text;
            console.log(`[Tunnel]: ${text}`);

            let match = fullOutput.match(/https:\/\/[a-zA-Z0-9-]+\.lhr\.life/);

            if(match && !resolved)
            {
                resolved = true;
                console.log("Public URL detected:", match[0]);
                resolve(match[0]);
            }
        };

        tunnelProcess.stdout.on("data", onData);
        tunnelProcess.stderr.on("data", onData);

        tunnelProcess.on("close", (code) =>
        {
            console.log(`Tunnel process exited with code ${code}`);
            tunnelProcess = null;

            if(!resolved) reject(new Error("Tunnel closed before URL was received."));
        });

        // Timeout in case it takes too long
        setTimeout(() =>
        {
            if(!resolved)
            {
                console.log("Full output received:");
                console.log(fullOutput);
    
                reject(new Error("Timeout while starting server."));
            }
        }, 20000);
    });
}

function stopTunnel()
{
    return new Promise((resolve) =>
    {
        if (tunnelProcess && tunnelProcess.pid)
        {
            console.log("Stopping tunnel...");
            kill(tunnelProcess.pid, "SIGTERM", () =>
            {
                tunnelProcess = null;
                resolve();
            });
        }
        else
        {
            tunnelProcess = null;
            resolve();
        }
    });
}

function createWindow() {
    mainWindow = new BrowserWindow
    ({
        width: 950,
        height: 750,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js') // We'll create this next
        }
    });

    mainWindow.loadFile('index.html');

    // Optional: Open DevTools while developing
    // mainWindow.webContents.openDevTools();
}

function startServer()
{
    if (serverProcess)
    {
        console.log('Server is already running');
        return false;
    }

    console.log('Starting Colyseus server...');

    // Start the server using npm start
    serverProcess = spawn('cmd.exe', ['/c', 'npm', 'start'],
    {
        cwd: serverPath,
        // shell: false,
        windowsHide: true,
        env: { ...process.env, FORCE_COLOR: '1' }
    });

    serverProcess.stdout.on('data', (data) => { console.log(`[Server]: ${data}`) });

    serverProcess.stderr.on('data', (data) => { console.error(`[Server Error]: ${data}`) });

    serverProcess.on('close', (code) =>
    {
        console.log(`Server process exited with code ${code}`);
        serverProcess = null;
    });

    serverProcess.on('error', (err) =>
    {
        console.log("Failed to start server:", err);
        serverProcess = null;
    });

    return true;
}

function stopServer()
{
    return new Promise((resolve) =>
    {
        if(!serverProcess || !serverProcess.pid)
        {
            console.log("No server processes to stop.");
            serverProcess = null;
            return resolve();
        }

        console.log("Stopping server...");
    
        kill(serverProcess.pid, 'SIGTERM', (err) =>
        {
            if(err)
            {
                if(err.code === "ESRCH")
                    console.log("Process already stopped.");
                else
                    console.error("Error killing process: ", err);
            }
            else
                console.log("Server stopped successfully.");
    
            serverProcess = null;
            resolve();
        });
    });
}

app.whenReady().then(() => {
    createWindow();

    // Start the server when the app opens (optional)
    // startServer();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', async () =>
{
    await stopServer();
    if (process.platform !== 'darwin') app.quit();
});

app.on("before-quit", async (event) =>
{
    event.preventDefault();
    await stopServer();
    app.exit();
});

// Allow the HTML page to request starting/stopping the server
ipcMain.handle('start-server', async () => { return startServer() });

ipcMain.handle("start-tunnel", async () =>
{
    try
    {
        return await startTunnel();
    }
    catch (err)
    {
        console.error("Tunnel error:", err);
        throw err;
    }
});

ipcMain.handle('stop-all', async () =>
{
    await stopTunnel();
    await stopServer();
    return true;
});