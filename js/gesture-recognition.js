class GestureRecognition {
    constructor() {
        this.hands = null;
        this.camera = null;
        this.video = null;
        this.canvas = null;
        this.canvasCtx = null;
        this.isInitialized = false;
        this.onGestureDetected = null;
        this.lastGestureTime = 0;
        this.gestureDebounceTime = 3000; // 3 second debounce
        this.confidenceThreshold = 0.8;
        
        this.initializeMediaPipe();
    }

    async initializeMediaPipe() {
        try {
            // Initialize MediaPipe Hands
            this.hands = new Hands({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                }
            });

            this.hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            this.hands.onResults(this.onResults.bind(this));
            
            console.log('MediaPipe Hands initialized');
        } catch (error) {
            console.error('Failed to initialize MediaPipe:', error);
        }
    }

    async setupCamera() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.canvasCtx = this.canvas.getContext('2d');

        if (!this.video || !this.canvas) {
            throw new Error('Video or canvas element not found');
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            });

            this.video.srcObject = stream;
            
            // Wait for video metadata to load
            await new Promise((resolve) => {
                this.video.onloadedmetadata = resolve;
            });

            // Set canvas size to match video
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;

            // Initialize camera for MediaPipe
            this.camera = new Camera(this.video, {
                onFrame: async () => {
                    if (this.hands) {
                        await this.hands.send({ image: this.video });
                    }
                },
                width: this.video.videoWidth,
                height: this.video.videoHeight
            });

            await this.camera.start();
            this.isInitialized = true;
            
            console.log('Camera initialized successfully');
            return true;
        } catch (error) {
            console.error('Camera setup failed:', error);
            throw error;
        }
    }

    onResults(results) {
        // Clear canvas
        this.canvasCtx.save();
        this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw the image
        this.canvasCtx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            
            // Draw hand landmarks
            this.drawHandLandmarks(landmarks);
            
            // Classify gesture
            const gesture = this.classifyGesture(landmarks);
            this.handleGestureDetection(gesture);
        }

        this.canvasCtx.restore();
    }

    drawHandLandmarks(landmarks) {
        // Draw connections
        drawConnectors(this.canvasCtx, landmarks, HAND_CONNECTIONS, {
            color: '#00FF00',
            lineWidth: 2
        });
        
        // Draw landmarks
        drawLandmarks(this.canvasCtx, landmarks, {
            color: '#FF0000',
            lineWidth: 1,
            radius: 3
        });
    }

    classifyGesture(landmarks) {
        // Check if fingers are extended with improved detection
        const fingersExtended = this.getFingersExtended(landmarks);
        const extendedCount = fingersExtended.filter(Boolean).length;
        
        // Additional check: make sure it's a clear gesture
        const isValidGesture = this.validateGesture(landmarks, fingersExtended);

        // Only classify if it's a valid and clear gesture
        if (!isValidGesture) {
            return 'unknown';
        }

        // Check for thumbs up gesture specifically
        if (this.isThumbsUpGesture(fingersExtended)) {
            return 'thumbsUp';
        } else if (extendedCount >= 4) {
            // Open palm = 4-5 fingers extended for away team score
            return 'openPalm';
        }

        // All other cases return unknown
        return 'unknown';
    }

    getFingersExtended(landmarks) {
        const fingersExtended = [];
        const extendedThreshold = 0.05; // Minimum distance for considering finger extended

        // Thumb (special case - check if tip is significantly extended from MCP)
        const thumbTip = landmarks[4];
        const thumbIP = landmarks[3];
        const thumbMCP = landmarks[2];
        
        // For thumb, check if it's clearly extended by comparing distances
        const thumbDistance = Math.abs(thumbTip.x - thumbMCP.x);
        const thumbBaseDistance = Math.abs(thumbIP.x - thumbMCP.x);
        const thumbExtended = thumbDistance > (thumbBaseDistance + extendedThreshold);
        fingersExtended.push(thumbExtended);

        // Other fingers (check if tip is significantly above PIP and MCP joints)
        const fingerIndices = [
            [8, 6, 5],   // Index finger: tip, PIP, MCP
            [12, 10, 9], // Middle finger: tip, PIP, MCP
            [16, 14, 13], // Ring finger: tip, PIP, MCP
            [20, 18, 17]  // Pinky: tip, PIP, MCP
        ];

        fingerIndices.forEach(([tipIndex, pipIndex, mcpIndex]) => {
            const tip = landmarks[tipIndex];
            const pip = landmarks[pipIndex];
            const mcp = landmarks[mcpIndex];
            
            // Finger is extended if tip is significantly above both PIP and MCP
            const tipAbovePip = (pip.y - tip.y) > extendedThreshold;
            const tipAboveMcp = (mcp.y - tip.y) > extendedThreshold;
            
            fingersExtended.push(tipAbovePip && tipAboveMcp);
        });

        return fingersExtended;
    }

    isThumbsUpGesture(fingersExtended) {
        // Thumbs up: thumb extended, all other fingers closed
        const [thumb, index, middle, ring, pinky] = fingersExtended;
        
        // Thumb must be extended, all other fingers must be closed
        return thumb && !index && !middle && !ring && !pinky;
    }

    validateGesture(landmarks, fingersExtended) {
        // Check hand stability and clear finger positions
        const extendedCount = fingersExtended.filter(Boolean).length;
        
        // For thumbs up gesture (only thumb extended)
        if (this.isThumbsUpGesture(fingersExtended)) {
            return true;
        }
        
        // For open palm gesture (4-5 fingers extended)
        if (extendedCount >= 4) {
            // Ensure most fingers are clearly extended for open palm
            return true;
        }
        
        // Reject gestures that don't clearly match thumbs up or open palm
        return false;
    }

    handleGestureDetection(gesture) {
        const now = Date.now();
        
        if (gesture !== 'unknown' && 
            now - this.lastGestureTime > this.gestureDebounceTime) {
            
            this.lastGestureTime = now;
            
            if (this.onGestureDetected) {
                this.onGestureDetected(gesture);
            }

            // Update UI feedback
            this.updateGestureUI(gesture);
        }
    }

    updateGestureUI(gesture) {
        const gestureStatus = document.getElementById('gestureStatus');
        if (gestureStatus) {
            if (gesture === 'thumbsUp') {
                gestureStatus.textContent = '👍 Thumbs Up Detected - Home Point!';
                gestureStatus.className = 'detected';
            } else if (gesture === 'openPalm') {
                gestureStatus.textContent = '🖐️ Open Palm Detected - Away Point!';
                gestureStatus.className = 'detected';
            }

            // Reset status after 2 seconds
            setTimeout(() => {
                gestureStatus.textContent = 'Show gesture to camera';
                gestureStatus.className = '';
            }, 2000);
        }
    }

    setGestureCallback(callback) {
        this.onGestureDetected = callback;
    }

    setDebounceTime(time) {
        this.gestureDebounceTime = time;
    }

    async start() {
        if (!this.isInitialized) {
            await this.setupCamera();
        }
        return true;
    }

    stop() {
        if (this.camera) {
            this.camera.stop();
        }
        
        if (this.video && this.video.srcObject) {
            const tracks = this.video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            this.video.srcObject = null;
        }
        
        this.isInitialized = false;
    }

    isReady() {
        return this.isInitialized;
    }
}

// Create global instance
window.gestureRecognition = new GestureRecognition();
