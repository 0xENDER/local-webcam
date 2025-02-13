/**
 * 
 * Enable local-network-level camera feed-sharing for OBS!
 * 
 * WebRTC Docs: https://webrtc.org/getting-started/overview
 * 
**/

// Get user camera feed
// return: MediaStream
function getDeviceFeed() {
    // Only get Video feed
    const constraints = {
        video: {
            width: { ideal: 640, max: 1920 },
            height: { ideal: 480, max: 1080 },
            frameRate: { ideal: 30, max: 40 }
        },
        audio: false // audio capture is assumed to be handled by a separate device
    };

    // Return a promise for the media device
    return new Promise((resolve, reject) => {
        navigator.mediaDevices.getUserMedia(constraints)
            .then(stream => {
                console.log('Got MediaStream:', stream);
                resolve(stream);
            })
            .catch(error => {
                console.error('Error accessing media devices.', error);
                reject(error);
            });
    })
}

// Start a WebSocket
async function startWebSocket(callback) {
    // Ask user for their new WebSocket address
    let wsAddress;
    if (window.nodejsWebcamHost && await window.nodejsWebcamHost.wsAddress() != "!") {
        wsAddress = await window.nodejsWebcamHost.wsAddress();
        alert("The Host WebSocket address is: " + wsAddress);
    } else if(window.OBS == true) {
        wsAddress = window.WS_ADDRESS_OBS;
    } else {
        wsAddress = "ws://" + prompt("Choose your WS address: (10.100.102.2:8080, 10.100.102.14:6633, etc.)");
    }
    console.log(wsAddress);

    ws = new WebSocket(wsAddress);
    ws.binaryType = 'arraybuffer';

    // Await WS connection
    ws.onopen = () => {
        console.log('WebSocket connected');
        if (ws instanceof WebSocket) {
            callback(ws);
        } else {
            report("Error: Couldn't get a valid WebSocket object.");
        }
    };

    // Check for RTC-related messages
    const decoder = new TextDecoder();
    ws.onmessage = async (event) => {
        // decode the message
        const textData = await decoder.decode(event.data);
        const message = JSON.parse(textData);
        console.log("WS: " + message.type, message);
        if (message.type === 'offer') {
            await window.pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
            const answer = await window.pc.createAnswer();
            await window.pc.setLocalDescription(answer);
            send(ws, { type: 'answer', sdp: window.pc.localDescription });
        } else if (message.type === 'answer') {
            await window.pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
        } else if (message.type === 'ice-candidate') {
            if (message.candidate) {
                try {
                    await window.pc.addIceCandidate(message.candidate);
                } catch (e) {
                    console.error('Error adding ICE candidate:', e);
                }
            }
        } else if (message.type === 'signal-new-receiver') {
            window.newReceiver(message.clientsCount);
        } else if (message.type === 'signal-host-start') {
            // Signal that a new receiver has joined
            send(ws, { type: 'signal-new-receiver' });
        }
    };

    // Await WS disconnection
    ws.onclose = () => {
        console.log('WebSocket disconnected');
        report("Error: WebSocket disconnected.");
    }
}

// Start a WebRTC connection
async function startWebRTC(ws, trackCallback, streamOut = false) {
    console.log("Initiating WebRTC connection...");
    window.pc = new RTCPeerConnection({
        iceServers: [] // Crucial for local connections
    });

    // Signal that a new receiver has joined
    send(ws, { type: 'signal-new-receiver' });

    window.pc.onicecandidate = event => {
        console.log('Got a candidate...');
        if (event.candidate) {
            send(ws, { type: 'ice-candidate', candidate: event.candidate });
        }
    };

    window.pc.oniceconnectionstatechange = e => {
        console.log("ICE connection state: " + window.pc.iceConnectionState);
    }

    window.pc.ontrack = event => {
        console.log('Got a remote track...');
        trackCallback(event.streams[0]);
    };

    try {
        if (streamOut instanceof MediaStream) { // Determine who initiates the connection
            console.log("Attempting to send a stream...");
            window.isVideoHosting = true;
            // Attach out streams to tracks
            streamOut.getTracks().forEach(track => window.pc.addTrack(track, streamOut));
            const offer = await window.pc.createOffer();
            await window.pc.setLocalDescription(offer);
            send(ws, { type: 'offer', sdp: window.pc.localDescription });
        }
    } catch (error) {
        report('Error accessing media devices!');
        console.error('Error accessing media devices:', error);
    }
}

// Send WS messages
function send(ws, message) {
    console.log("Sending WS message:", message);
    const msg = JSON.stringify(message);
    console.log("Sending WS message:", msg);
    ws.send(JSON.stringify(message));
}
