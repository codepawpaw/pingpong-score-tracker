class BallTracking {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.canvasCtx = null;
        this.isInitialized = false;
        this.isTracking = false;
        this.onBallDetected = null;
        
        // Ball detection parameters
        this.ballHistory = [];
        this.maxHistorySize = 10;
        this.minBallRadius = 8;
        this.maxBallRadius = 40;
        this.detectionDebounceTime = 1000; // 1 second
        this.lastDetectionTime = 0;
        
        // Scoring zones (will be calibrated)
        this.scoringZones = {
            left: { x: 0, y: 0, width: 0.4, height: 1 }, // Left 40% for away team
            right: { x: 0.6, y: 0, width: 0.4, height: 1 }, // Right 40% for home team
            center: { x: 0.4, y: 0, width: 0.2, height: 1 } // Center 20% neutral zone
        };
        
        // Ball detection state
        this.currentBall = null;
        this.previousBall = null;
        this.ballVelocity = { x: 0, y: 0 };
        
        // UI elements for calibration
        this.showZones = true;
        this.sensitivity = 0.7; // Detection sensitivity (0-1)
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
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
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

            this.isInitialized = true;
            console.log('Ball tracking camera initialized successfully');
            return true;
        } catch (error) {
            console.error('Ball tracking camera setup failed:', error);
            throw error;
        }
    }

    startTracking() {
        if (!this.isInitialized) {
            console.error('Camera not initialized');
            return false;
        }

        this.isTracking = true;
        this.trackingLoop();
        console.log('Ball tracking started');
        return true;
    }

    stopTracking() {
        this.isTracking = false;
        
        if (this.video && this.video.srcObject) {
            const tracks = this.video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            this.video.srcObject = null;
        }
        
        this.isInitialized = false;
        console.log('Ball tracking stopped');
    }

    trackingLoop() {
        if (!this.isTracking) return;

        // Process current frame
        this.processFrame();

        // Continue tracking
        requestAnimationFrame(() => this.trackingLoop());
    }

    processFrame() {
        if (!this.video || !this.canvas) return;

        // Clear canvas and draw video frame
        this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.canvasCtx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

        // Get image data for processing
        const imageData = this.canvasCtx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Detect balls in the frame
        const detectedBalls = this.detectBalls(imageData);
        
        // Process detected balls
        if (detectedBalls.length > 0) {
            this.processBallDetection(detectedBalls[0]); // Use the most confident detection
        }

        // Draw scoring zones
        if (this.showZones) {
            this.drawScoringZones();
        }

        // Draw detected ball
        if (this.currentBall) {
            this.drawBall(this.currentBall);
        }
    }

    detectBalls(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const detectedBalls = [];

        // Simple color-based detection for orange/white balls
        // This is a basic implementation - in production you'd want more sophisticated detection
        for (let y = this.minBallRadius; y < height - this.minBallRadius; y += 4) {
            for (let x = this.minBallRadius; x < width - this.minBallRadius; x += 4) {
                const index = (y * width + x) * 4;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];

                // Check for orange ball (typical ping pong ball color)
                const isOrange = this.isOrangeColor(r, g, b);
                // Check for white ball
                const isWhite = this.isWhiteColor(r, g, b);

                if (isOrange || isWhite) {
                    // Check if this might be a ball by examining surrounding area
                    const ballConfidence = this.checkBallLikelihood(data, x, y, width, height);
                    
                    if (ballConfidence > this.sensitivity) {
                        detectedBalls.push({
                            x: x,
                            y: y,
                            confidence: ballConfidence,
                            color: isOrange ? 'orange' : 'white'
                        });
                    }
                }
            }
        }

        // Sort by confidence and return best detections
        return detectedBalls.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
    }

    isOrangeColor(r, g, b) {
        // HSV-based orange detection
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        
        if (delta === 0) return false;
        
        let hue = 0;
        if (max === r) {
            hue = ((g - b) / delta) % 6;
        } else if (max === g) {
            hue = (b - r) / delta + 2;
        } else {
            hue = (r - g) / delta + 4;
        }
        hue = Math.round(hue * 60);
        if (hue < 0) hue += 360;
        
        const saturation = delta / max;
        const value = max / 255;
        
        // Orange range: hue 15-45, saturation 0.4-1, value 0.4-1
        return hue >= 15 && hue <= 45 && saturation >= 0.4 && value >= 0.4;
    }

    isWhiteColor(r, g, b) {
        // White detection: high values, low variance
        const avg = (r + g + b) / 3;
        const variance = Math.abs(r - avg) + Math.abs(g - avg) + Math.abs(b - avg);
        return avg > 200 && variance < 30;
    }

    checkBallLikelihood(data, centerX, centerY, width, height) {
        let matchingPixels = 0;
        let totalPixels = 0;
        const radius = 15; // Check area around potential ball center

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance <= radius) {
                    const x = centerX + dx;
                    const y = centerY + dy;
                    
                    if (x >= 0 && x < width && y >= 0 && y < height) {
                        const index = (y * width + x) * 4;
                        const r = data[index];
                        const g = data[index + 1];
                        const b = data[index + 2];
                        
                        if (this.isOrangeColor(r, g, b) || this.isWhiteColor(r, g, b)) {
                            matchingPixels++;
                        }
                        totalPixels++;
                    }
                }
            }
        }

        return totalPixels > 0 ? matchingPixels / totalPixels : 0;
    }

    processBallDetection(ball) {
        // Update ball history
        this.previousBall = this.currentBall;
        this.currentBall = ball;

        // Calculate velocity if we have previous position
        if (this.previousBall) {
            this.ballVelocity = {
                x: ball.x - this.previousBall.x,
                y: ball.y - this.previousBall.y
            };

            // Check for scoring based on ball movement and position
            this.checkScoring(ball, this.ballVelocity);
        }

        // Add to history
        this.ballHistory.push({
            ...ball,
            timestamp: Date.now(),
            velocity: { ...this.ballVelocity }
        });

        // Limit history size
        if (this.ballHistory.length > this.maxHistorySize) {
            this.ballHistory.shift();
        }
    }

    checkScoring(ball, velocity) {
        const now = Date.now();
        
        // Debounce scoring detection
        if (now - this.lastDetectionTime < this.detectionDebounceTime) {
            return;
        }

        // Check if ball is moving fast enough to be a scoring hit
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        if (speed < 10) { // Minimum speed threshold
            return;
        }

        // Normalize coordinates to 0-1 range
        const normalizedX = ball.x / this.canvas.width;
        const normalizedY = ball.y / this.canvas.height;

        // Check which scoring zone the ball is in
        let scoringTeam = null;
        
        if (normalizedX <= this.scoringZones.left.width) {
            // Ball in left zone - Away team scores
            scoringTeam = 'away';
        } else if (normalizedX >= (1 - this.scoringZones.right.width)) {
            // Ball in right zone - Home team scores
            scoringTeam = 'home';
        }

        if (scoringTeam && this.onBallDetected) {
            this.lastDetectionTime = now;
            this.onBallDetected(scoringTeam);
            this.showScoringFeedback(scoringTeam);
        }
    }

    showScoringFeedback(team) {
        const gestureStatus = document.getElementById('gestureStatus');
        if (gestureStatus) {
            const teamName = team === 'home' ? 'Home' : 'Away';
            gestureStatus.textContent = `🏓 Ball detected in ${teamName} zone - Point scored!`;
            gestureStatus.className = 'detected';
            
            setTimeout(() => {
                gestureStatus.textContent = 'Ball tracking active...';
                gestureStatus.className = '';
            }, 2000);
        }
    }

    drawScoringZones() {
        const ctx = this.canvasCtx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, width, height);

        // Left zone (Away team)
        ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.fillRect(0, 0, width * this.scoringZones.left.width, height);
        
        // Right zone (Home team)
        ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
        ctx.fillRect(width * (1 - this.scoringZones.right.width), 0, width * this.scoringZones.right.width, height);

        // Zone labels
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        
        // Away zone label
        ctx.fillText('AWAY', width * this.scoringZones.left.width / 2, height / 2);
        
        // Home zone label
        ctx.fillText('HOME', width * (1 - this.scoringZones.right.width / 2), height / 2);
        
        // Center line
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    drawBall(ball) {
        const ctx = this.canvasCtx;
        
        // Draw ball circle
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 15, 0, 2 * Math.PI);
        ctx.strokeStyle = ball.color === 'orange' ? '#FF6600' : '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Draw confidence indicator
        ctx.fillStyle = ball.color === 'orange' ? '#FF6600' : '#FFFFFF';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(ball.confidence * 100)}%`, ball.x, ball.y - 25);
        
        // Draw velocity vector
        if (this.ballVelocity.x !== 0 || this.ballVelocity.y !== 0) {
            const scale = 3;
            ctx.beginPath();
            ctx.moveTo(ball.x, ball.y);
            ctx.lineTo(ball.x + this.ballVelocity.x * scale, ball.y + this.ballVelocity.y * scale);
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    setBallDetectedCallback(callback) {
        this.onBallDetected = callback;
    }

    setSensitivity(sensitivity) {
        this.sensitivity = Math.max(0, Math.min(1, sensitivity));
    }

    toggleZoneDisplay() {
        this.showZones = !this.showZones;
    }

    calibrateZones(leftWidth = 0.4, rightWidth = 0.4) {
        this.scoringZones.left.width = leftWidth;
        this.scoringZones.right.width = rightWidth;
        this.scoringZones.center.x = leftWidth;
        this.scoringZones.center.width = 1 - leftWidth - rightWidth;
    }

    async start() {
        if (!this.isInitialized) {
            await this.setupCamera();
        }
        return this.startTracking();
    }

    stop() {
        this.stopTracking();
    }

    isReady() {
        return this.isInitialized && this.isTracking;
    }
}

// Create global instance
window.ballTracking = new BallTracking();
