class PingPongScoreTracker {
    constructor() {
        this.gameState = {
            homeTeam: 'Home',
            awayTeam: 'Away',
            homeScore: 0,
            awayScore: 0,
            homeSets: 0,
            awaySets: 0,
            currentSet: 1,
            maxSets: 3,
            isGameActive: false,
            gameWinner: null,
            currentServer: 'home',
            firstServer: 'home',
            serveCount: 0,
            totalPoints: 0,
            trackingMode: 'gesture'
        };

        // History management for undo functionality
        this.gameHistory = [];
        this.maxHistorySize = 10;

        this.screens = {
            setup: document.getElementById('setupScreen'),
            game: document.getElementById('gameScreen'),
            victory: document.getElementById('victoryScreen')
        };

        this.setupElements = {
            homeTeamInput: document.getElementById('homeTeam'),
            awayTeamInput: document.getElementById('awayTeam'),
            numSetsSelect: document.getElementById('numSets'),
            firstServerSelect: document.getElementById('firstServer'),
            trackingModeSelect: document.getElementById('trackingMode'),
            voiceEnabledCheckbox: document.getElementById('voiceEnabled'),
            voiceSpeedSlider: document.getElementById('voiceSpeed'),
            voiceSpeedValue: document.getElementById('voiceSpeedValue'),
            startGameBtn: document.getElementById('startGame')
        };

        this.gameElements = {
            homeTeamName: document.getElementById('homeTeamName'),
            awayTeamName: document.getElementById('awayTeamName'),
            homeScore: document.getElementById('homeScore'),
            awayScore: document.getElementById('awayScore'),
            homeSets: document.getElementById('homeSets'),
            awaySets: document.getElementById('awaySets'),
            currentSet: document.getElementById('currentSet'),
            maxSets: document.getElementById('maxSets'),
            homeServeIndicator: document.getElementById('homeServeIndicator'),
            awayServeIndicator: document.getElementById('awayServeIndicator'),
            serveCount: document.getElementById('serveCount'),
            resetSetBtn: document.getElementById('resetSet'),
            newGameBtn: document.getElementById('newGame')
        };

        this.victoryElements = {
            victoryTitle: document.getElementById('victoryTitle'),
            victoryMessage: document.getElementById('victoryMessage'),
            playAgainBtn: document.getElementById('playAgain')
        };

        this.initializeEventListeners();
        this.initializeGestureRecognition();
    }

    initializeEventListeners() {
        // Setup screen events
        this.setupElements.startGameBtn.addEventListener('click', () => {
            this.startNewGame();
        });

        // Tracking mode change event
        this.setupElements.trackingModeSelect.addEventListener('change', () => {
            this.updateSetupInstructions();
        });

        // Voice settings events
        this.setupElements.voiceEnabledCheckbox.addEventListener('change', () => {
            this.updateVoiceSettings();
            this.toggleVoiceSettingsVisibility();
        });

        this.setupElements.voiceSpeedSlider.addEventListener('input', () => {
            this.updateVoiceSpeedDisplay();
            this.updateVoiceSettings();
        });

        // Initialize voice settings display
        this.updateVoiceSpeedDisplay();
        this.toggleVoiceSettingsVisibility();

        // Game screen events
        this.gameElements.resetSetBtn.addEventListener('click', () => {
            this.resetCurrentSet();
        });

        this.gameElements.newGameBtn.addEventListener('click', () => {
            this.returnToSetup();
        });

        // Undo button event
        const undoBtn = document.getElementById('undoBtn');
        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                this.undoLastPoint();
            });
        }

        // Victory screen events
        this.victoryElements.playAgainBtn.addEventListener('click', () => {
            this.returnToSetup();
        });

        // Enable audio on any user interaction
        document.addEventListener('click', () => {
            if (window.audioManager) {
                window.audioManager.enableAudio();
            }
        });
    }

    initializeGestureRecognition() {
        if (window.gestureRecognition) {
            window.gestureRecognition.setGestureCallback((gesture) => {
                this.handleGestureDetected(gesture);
            });
        }
    }

    initializeBallTracking() {
        if (window.ballTracking) {
            window.ballTracking.setBallDetectedCallback((team) => {
                this.handleBallDetected(team);
            });
        }
    }

    async startTrackingSystem() {
        if (this.gameState.trackingMode === 'ball') {
            this.initializeBallTracking();
            await this.startBallTracking();
        } else {
            await this.startGestureRecognition();
        }
    }

    async startBallTracking() {
        if (window.ballTracking) {
            await window.ballTracking.start();
        }
    }

    stopBallTracking() {
        if (window.ballTracking) {
            window.ballTracking.stop();
        }
    }

    stopTrackingSystem() {
        if (this.gameState.trackingMode === 'ball') {
            this.stopBallTracking();
        } else {
            this.stopGestureRecognition();
        }
    }

    updateInstructionsForMode() {
        const gestureStatus = document.getElementById('gestureStatus');
        const gestureGuide = document.querySelector('.gesture-guide');
        
        if (this.gameState.trackingMode === 'ball') {
            // Update for ball tracking mode
            if (gestureStatus) {
                gestureStatus.textContent = 'Ball tracking active...';
            }
            if (gestureGuide) {
                gestureGuide.innerHTML = `
                    <div class="gesture-item">
                        <span class="gesture-icon">🔴</span>
                        <span>Left Zone = Away Point</span>
                    </div>
                    <div class="gesture-item">
                        <span class="gesture-icon">🟢</span>
                        <span>Right Zone = Home Point</span>
                    </div>
                `;
            }
        } else {
            // Update for gesture mode
            if (gestureStatus) {
                gestureStatus.textContent = 'Show gesture to camera';
            }
            if (gestureGuide) {
                gestureGuide.innerHTML = `
                    <div class="gesture-item">
                        <span class="gesture-icon">☝️</span>
                        <span>One Finger = Home Point</span>
                    </div>
                    <div class="gesture-item">
                        <span class="gesture-icon">✌️</span>
                        <span>Two Fingers = Away Point</span>
                    </div>
                `;
            }
        }
    }

    updateSetupInstructions() {
        const instructionsList = document.getElementById('instructionsList');
        const trackingMode = this.setupElements.trackingModeSelect.value;
        
        if (trackingMode === 'ball') {
            instructionsList.innerHTML = `
                <li>🏓 Position camera to view ping pong table</li>
                <li>🔴 Left zone = Away team points</li>
                <li>🟢 Right zone = Home team points</li>
                <li>⚪ Orange/white ball detection</li>
                <li>First to 11 points wins the set</li>
                <li>Most sets won wins the match</li>
            `;
        } else {
            instructionsList.innerHTML = `
                <li>☝️ Show <strong>one finger</strong> to camera for Home team point</li>
                <li>✌️ Show <strong>two fingers</strong> to camera for Away team point</li>
                <li>First to 11 points wins the set</li>
                <li>Most sets won wins the match</li>
            `;
        }
    }

    handleBallDetected(team) {
        if (!this.gameState.isGameActive) return;
        
        console.log(`Ball detected in ${team} zone`);
        this.addPoint(team);
    }

    async startNewGame() {
        try {
            // Get setup values
            this.gameState.homeTeam = this.setupElements.homeTeamInput.value.trim() || 'Home';
            this.gameState.awayTeam = this.setupElements.awayTeamInput.value.trim() || 'Away';
            this.gameState.maxSets = parseInt(this.setupElements.numSetsSelect.value);
            this.gameState.firstServer = this.setupElements.firstServerSelect.value;
            this.gameState.trackingMode = this.setupElements.trackingModeSelect.value;

            // Reset game state and clear history
            this.resetGameState();
            this.clearHistory();
            
            // Initialize serve state
            this.initializeServeState();

            // Update UI
            this.updateGameUI();
            this.updateInstructionsForMode();
            this.showScreen('game');

            // Start camera and tracking system
            await this.startTrackingSystem();

            this.gameState.isGameActive = true;
            
            console.log('New game started:', this.gameState);
        } catch (error) {
            console.error('Failed to start game:', error);
            alert('Failed to start camera. Please ensure camera permissions are granted and try again.');
        }
    }

    async startGestureRecognition() {
        if (window.gestureRecognition) {
            await window.gestureRecognition.start();
        }
    }

    stopGestureRecognition() {
        if (window.gestureRecognition) {
            window.gestureRecognition.stop();
        }
    }

    resetGameState() {
        this.gameState.homeScore = 0;
        this.gameState.awayScore = 0;
        this.gameState.homeSets = 0;
        this.gameState.awaySets = 0;
        this.gameState.currentSet = 1;
        this.gameState.isGameActive = false;
        this.gameState.gameWinner = null;
    }

    initializeServeState() {
        this.gameState.currentServer = this.gameState.firstServer;
        this.gameState.serveCount = 0;
        this.gameState.totalPoints = 0;
        this.updateServeUI();
    }

    updateServeRotation() {
        this.gameState.totalPoints++;
        this.gameState.serveCount++;

        // Check if it's time to switch server (after 2 serves)
        if (this.gameState.serveCount >= 2) {
            this.gameState.currentServer = this.gameState.currentServer === 'home' ? 'away' : 'home';
            this.gameState.serveCount = 0;
        }

        this.updateServeUI();
    }

    updateServeUI() {
        // Update serve indicators
        if (this.gameState.currentServer === 'home') {
            this.gameElements.homeServeIndicator.classList.add('active');
            this.gameElements.awayServeIndicator.classList.remove('active');
        } else {
            this.gameElements.awayServeIndicator.classList.add('active');
            this.gameElements.homeServeIndicator.classList.remove('active');
        }

        // Update serve count display
        const currentServeNum = this.gameState.serveCount + 1;
        this.gameElements.serveCount.textContent = `Serve ${currentServeNum} of 2`;
    }

    resetServeState() {
        this.gameState.currentServer = this.gameState.firstServer;
        this.gameState.serveCount = 0;
        this.gameState.totalPoints = 0;
        this.updateServeUI();
    }

    // History management methods for undo functionality
    saveGameStateToHistory(actionType = 'point') {
        const stateSnapshot = {
            homeScore: this.gameState.homeScore,
            awayScore: this.gameState.awayScore,
            homeSets: this.gameState.homeSets,
            awaySets: this.gameState.awaySets,
            currentSet: this.gameState.currentSet,
            currentServer: this.gameState.currentServer,
            serveCount: this.gameState.serveCount,
            totalPoints: this.gameState.totalPoints,
            actionType: actionType,
            timestamp: Date.now()
        };

        this.gameHistory.push(stateSnapshot);

        // Limit history size
        if (this.gameHistory.length > this.maxHistorySize) {
            this.gameHistory.shift();
        }

        this.updateUndoButtonState();
    }

    undoLastPoint() {
        if (!this.canUndo()) {
            console.log('Cannot undo: no history available or game not active');
            return false;
        }

        const previousState = this.gameHistory.pop();
        
        // Restore previous game state
        this.gameState.homeScore = previousState.homeScore;
        this.gameState.awayScore = previousState.awayScore;
        this.gameState.homeSets = previousState.homeSets;
        this.gameState.awaySets = previousState.awaySets;
        this.gameState.currentSet = previousState.currentSet;
        this.gameState.currentServer = previousState.currentServer;
        this.gameState.serveCount = previousState.serveCount;
        this.gameState.totalPoints = previousState.totalPoints;

        // Update UI
        this.updateGameUI();
        this.updateServeUI();
        this.updateUndoButtonState();

        // Play undo sound
        if (window.audioManager && window.audioManager.playUndo) {
            window.audioManager.playUndo();
        }

        // Show feedback
        this.showUndoFeedback();

        console.log('Undo successful, restored state:', previousState);
        return true;
    }

    canUndo() {
        return this.gameState.isGameActive && this.gameHistory.length > 0;
    }

    clearHistory() {
        this.gameHistory = [];
        this.updateUndoButtonState();
    }

    showUndoFeedback() {
        const gestureStatus = document.getElementById('gestureStatus');
        if (gestureStatus) {
            const originalText = gestureStatus.textContent;
            const originalClass = gestureStatus.className;
            
            gestureStatus.textContent = 'Undo successful!';
            gestureStatus.className = 'undo-feedback';
            
            setTimeout(() => {
                gestureStatus.textContent = originalText;
                gestureStatus.className = originalClass;
            }, 2000);
        }
    }

    updateUndoButtonState() {
        const undoBtn = document.getElementById('undoBtn');
        if (undoBtn) {
            undoBtn.disabled = !this.canUndo();
            undoBtn.style.opacity = this.canUndo() ? '1' : '0.5';
        }
    }

    handleGestureDetected(gesture) {
        if (!this.gameState.isGameActive) return;

        if (gesture === 'paper') {
            this.addPoint('home');
        } else if (gesture === 'rock') {
            this.addPoint('away');
        }
    }

    addPoint(team) {
        if (!this.gameState.isGameActive) return;

        // Save current state to history before making changes
        this.saveGameStateToHistory('point');

        // Add point
        if (team === 'home') {
            this.gameState.homeScore++;
        } else {
            this.gameState.awayScore++;
        }

        // Update serve rotation after point is scored
        this.updateServeRotation();

        // Play point sound
        if (window.audioManager) {
            window.audioManager.playPoint();
        }

        // Announce the current score
        if (window.audioManager) {
            window.audioManager.announceScore(
                this.gameState.homeTeam,
                this.gameState.awayTeam,
                this.gameState.homeScore,
                this.gameState.awayScore,
                {
                    currentSet: this.gameState.currentSet,
                    homeSets: this.gameState.homeSets,
                    awaySets: this.gameState.awaySets
                }
            );
        }

        // Check if set is won
        if (this.gameState.homeScore >= 11 || this.gameState.awayScore >= 11) {
            this.checkSetWin();
        }

        this.updateGameUI();
        this.animateScoreUpdate(team);
    }

    checkSetWin() {
        let setWinner = null;

        if (this.gameState.homeScore >= 11 && this.gameState.homeScore - this.gameState.awayScore >= 2) {
            setWinner = 'home';
        } else if (this.gameState.awayScore >= 11 && this.gameState.awayScore - this.gameState.homeScore >= 2) {
            setWinner = 'away';
        }

        if (setWinner) {
            this.completeSet(setWinner);
        }
    }

    completeSet(winner) {
        // Update sets won
        if (winner === 'home') {
            this.gameState.homeSets++;
        } else {
            this.gameState.awaySets++;
        }

        // Get winner team name
        const winnerName = winner === 'home' ? this.gameState.homeTeam : this.gameState.awayTeam;

        // Play set win sound
        if (window.audioManager) {
            window.audioManager.playSetWin();
        }

        // Announce set win
        if (window.audioManager) {
            window.audioManager.announceSetWin(
                winnerName,
                this.gameState.homeTeam,
                this.gameState.awayTeam,
                this.gameState.currentSet,
                this.gameState.homeSets,
                this.gameState.awaySets
            );
        }

        // Check if match is won
        const setsToWin = Math.ceil(this.gameState.maxSets / 2);
        if (this.gameState.homeSets >= setsToWin || this.gameState.awaySets >= setsToWin) {
            this.completeMatch();
        } else {
            // Start next set
            this.startNextSet();
        }
    }

    startNextSet() {
        this.gameState.currentSet++;
        this.gameState.homeScore = 0;
        this.gameState.awayScore = 0;
        
        // Reset serve state for new set
        this.resetServeState();
        
        this.updateGameUI();

        // Show set completion message briefly
        const gestureStatus = document.getElementById('gestureStatus');
        if (gestureStatus) {
            gestureStatus.textContent = `Set ${this.gameState.currentSet - 1} Complete! Starting Set ${this.gameState.currentSet}`;
            gestureStatus.className = 'detected';
            
            setTimeout(() => {
                gestureStatus.textContent = 'Show gesture to camera';
                gestureStatus.className = '';
            }, 3000);
        }
    }

    completeMatch() {
        this.gameState.isGameActive = false;
        
        // Determine winner
        if (this.gameState.homeSets > this.gameState.awaySets) {
            this.gameState.gameWinner = this.gameState.homeTeam;
        } else {
            this.gameState.gameWinner = this.gameState.awayTeam;
        }

        // Play match win sound
        if (window.audioManager) {
            window.audioManager.playMatchWin();
        }

        // Announce match win
        if (window.audioManager) {
            window.audioManager.announceMatchWin(
                this.gameState.gameWinner,
                this.gameState.homeTeam,
                this.gameState.awayTeam,
                this.gameState.homeSets,
                this.gameState.awaySets
            );
        }

        // Show victory screen
        setTimeout(() => {
            this.showVictoryScreen();
        }, 2000);
    }

    resetCurrentSet() {
        this.gameState.homeScore = 0;
        this.gameState.awayScore = 0;
        
        // Reset serve state for current set
        this.resetServeState();
        
        this.updateGameUI();
    }

    updateGameUI() {
        // Update team names
        this.gameElements.homeTeamName.textContent = this.gameState.homeTeam;
        this.gameElements.awayTeamName.textContent = this.gameState.awayTeam;

        // Update scores
        this.gameElements.homeScore.textContent = this.gameState.homeScore;
        this.gameElements.awayScore.textContent = this.gameState.awayScore;

        // Update sets
        this.gameElements.homeSets.textContent = this.gameState.homeSets;
        this.gameElements.awaySets.textContent = this.gameState.awaySets;

        // Update set info
        this.gameElements.currentSet.textContent = this.gameState.currentSet;
        this.gameElements.maxSets.textContent = this.gameState.maxSets;
    }

    animateScoreUpdate(team) {
        const scoreElement = team === 'home' ? 
            this.gameElements.homeScore : this.gameElements.awayScore;
        
        scoreElement.classList.add('animate');
        
        setTimeout(() => {
            scoreElement.classList.remove('animate');
        }, 300);
    }

    showVictoryScreen() {
        this.victoryElements.victoryMessage.innerHTML = `
            <strong>${this.gameState.gameWinner}</strong> wins the match!<br>
            <small>Sets: ${this.gameState.homeSets} - ${this.gameState.awaySets}</small>
        `;
        
        this.showScreen('victory');
        this.stopTrackingSystem();
    }

    returnToSetup() {
        this.stopTrackingSystem();
        this.resetGameState();
        this.showScreen('setup');
    }

    showScreen(screenName) {
        // Hide all screens
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });

        // Show target screen
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
        }
    }

    // Manual scoring methods (for testing or backup)
    addHomePoint() {
        this.addPoint('home');
    }

    addAwayPoint() {
        this.addPoint('away');
    }

    // Voice settings management
    updateVoiceSpeedDisplay() {
        if (this.setupElements.voiceSpeedSlider && this.setupElements.voiceSpeedValue) {
            const speed = this.setupElements.voiceSpeedSlider.value;
            this.setupElements.voiceSpeedValue.textContent = `${speed}x`;
        }
    }

    updateVoiceSettings() {
        if (window.audioManager) {
            const voiceEnabled = this.setupElements.voiceEnabledCheckbox.checked;
            const voiceSpeed = parseFloat(this.setupElements.voiceSpeedSlider.value);
            
            window.audioManager.setVoiceEnabled(voiceEnabled);
            window.audioManager.setVoiceSettings({
                rate: voiceSpeed
            });
        }
    }

    toggleVoiceSettingsVisibility() {
        const voiceSettingsDiv = document.getElementById('voiceSettings');
        if (voiceSettingsDiv) {
            const isEnabled = this.setupElements.voiceEnabledCheckbox.checked;
            voiceSettingsDiv.style.display = isEnabled ? 'block' : 'none';
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Ping Pong Score Tracker...');
    window.scoreTracker = new PingPongScoreTracker();
    
    // Add keyboard shortcuts for testing and undo
    document.addEventListener('keydown', (event) => {
        if (!window.scoreTracker.gameState.isGameActive) return;
        
        if (event.key === 'h' || event.key === 'H') {
            window.scoreTracker.addHomePoint();
        } else if (event.key === 'a' || event.key === 'A') {
            window.scoreTracker.addAwayPoint();
        } else if (event.key === 'u' || event.key === 'U') {
            window.scoreTracker.undoLastPoint();
        }
    });
    
    console.log('App initialized successfully!');
});
