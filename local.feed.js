/**
 * 
 * Enable local-network-level camera feed-sharing for OBS!
 * 
 * WebRTC Docs: https://webrtc.org/getting-started/overview
 * 
**/

// Get user camera feed
// return: MediaStream
function getDeviceFeed(){
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

