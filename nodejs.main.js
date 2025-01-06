/**
 * 
 * Start WS and WebRTC connections through ElectronJS!
 * 
**/

// Import modules
const { app, BrowserWindow, contextBridge, ipcMain } = require('electron');
const WebSocket = require('ws');
const os = require('os');
const path = require('path');

// Keep track of WS address
let WebSocketPort = 8080;
let WebSocketAddress = false;

// Create a new window
function createWindow() {
    startWebSocket(() => {
        const win = new BrowserWindow({
            width: 800,
            height: 600,
            fullscreen: true,
            webPreferences: {
                preload: path.join(__dirname, 'nodejs.preload.js'), // Important: Use a preload script
                contextIsolation: true, // Recommended: Enable context isolation
                nodeIntegration: false, // Recommended: Disable Node.js integration in the renderer
                enableRemoteModule: false // Disable remote module
            },
        });    
        win.loadFile('index.html');
    });
}

// Await ElectronJS
app.whenReady().then(() => {
    createWindow();
    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// End process on window close
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// Handle IPC requests
ipcMain.handle('get-ws-address', async () => {
    // Simulate fetching data or performing an operation
    return WebSocketAddress;
});

// Start a WebSocket server
function startWebSocket(callback) {
    // Prevent duplicate WebSocket servers
    if(WebSocketAddress != false){
        callback();
        return false;
    }

    // signal-host-start

    // Start a WebSocket server, and get its local IP address!
    const wss = new WebSocket.Server({ port: WebSocketPort }, () => {
        const networkInterfaces = os.networkInterfaces();
        let localAddress;

        // Iterate over network interfaces
        for (const name of Object.keys(networkInterfaces)) {
            for (const iface of networkInterfaces[name]) {
                // Skip over non-IPv4 and internal (loopback) addresses
                if (iface.family === 'IPv4' && !iface.internal) {
                    localAddress = iface.address;
                    break; // Found an external IPv4 address
                }
            }
            if (localAddress) {
                break; // Exit outer loop once IP is found
            }
        }

        if (localAddress) {
            console.log(`WebSocket server started on ws://${localAddress}:${WebSocketPort}`);
            WebSocketAddress = `ws://${localAddress}:${WebSocketPort}`;
        } else {
            console.log(`Could not determine local IP address. Server started on port ${WebSocketPort}.`);
            WebSocketAddress = "!";
        }

        // Signal that the WebSocket server has been initiated!
        callback();
    });

    // Keep track of connections!
    wss.on('connection', ws => {
        console.log('Client connected');

        ws.on('message', message => {
            // Broadcast the message to all connected clients
            wss.clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    console.log("Sending WS message:", message);
                    client.send(message);
                }
            });
        });

        ws.on('close', () => {
            console.log('Client disconnected');
        });
    });
}