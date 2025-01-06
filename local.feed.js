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
        'video': true,
        'audio': false // audio capture is assumed to be handled by a separate device
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
    } else {
        wsAddress = "ws://" + prompt("Choose your WS address: (10.100.102.2:8080, 10.100.102.14:6633, etc.)");
    }
    console.log(wsAddress);
    ws = new WebSocket(wsAddress);

    // Await WS connection
    ws.onopen = () => {
        console.log('WebSocket connected');
        callback(ws);
    };

    // Check for RTC-related messages
    ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        console.log("WS: " + message.type, message);
        if (message.type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(message));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            send({ type: 'answer', sdp: pc.localDescription });
        } else if (message.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(message));
        } else if (message.type === 'ice-candidate') {
            if (message.candidate) {
                try {
                    await pc.addIceCandidate(message.candidate);
                } catch (e) {
                    console.error('Error adding ICE candidate:', e);
                }
            }
        }
    };

    // Await WS disconnection
    ws.onclose = () => {
        console.log('WebSocket disconnected');
        document.writeln("Error: WebSocket disconnected.");
    }
}

// Start a WebRTC connection
async function startWebRTC(ws, trackCallback, streamOut = false) {
    console.log("Initiating WebRTC connection...");
    pc = new RTCPeerConnection({
        iceServers: [], // Crucial for local connections
        iceTransportPolicy: 'relay' // Crucial for local connections
    });

    pc.onicecandidate = event => {
        console.log('Got a candidate...');
        if (event.candidate) {
            send(ws, { type: 'ice-candidate', candidate: event.candidate });
        }
    };

    pc.oniceconnectionstatechange = e => {
        console.log("ICE connection state: " + pc.iceConnectionState);
    }

    pc.ontrack = event => {
        console.log('Got a remote track...');
        trackCallback(event.streams[0]);
    };

    try {
        if (streamOut instanceof MediaStream) { // Determine who initiates the connection
            // Attach out streams to tracks
            streamOut.getTracks().forEach(track => pc.addTrack(track, streamOut));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            send(ws, { type: 'offer', sdp: pc.localDescription });
        }
    } catch (error) {
        document.writeln('Error accessing media devices!');
        console.error('Error accessing media devices:', error);
    }
}

// Send WS messages
function send(ws, message) {
    console.log("Sending WS message:", message);
    ws.send(JSON.stringify(message));
}
