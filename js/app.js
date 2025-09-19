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
            totalPoints: 0
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

    async startNewGame() {
        try {
            // Get setup values
            this.gameState.homeTeam = this.setupElements.homeTeamInput.value.trim() || 'Home';
            this.gameState.awayTeam = this.setupElements.awayTeamInput.value.trim() || 'Away';
            this.gameState.maxSets = parseInt(this.setupElements.numSetsSelect.value);
            this.gameState.firstServer = this.setupElements.firstServerSelect.value;

            // Reset game state and clear history
            this.resetGameState();
            this.clearHistory();
            
            // Initialize serve state
            this.initializeServeState();

            // Update UI
            this.updateGameUI();
            this.showScreen('game');

            // Start camera and gesture recognition
            await this.startGestureRecognition();

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

        // Play set win sound
        if (window.audioManager) {
            window.audioManager.playSetWin();
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
        this.stopGestureRecognition();
    }

    returnToSetup() {
        this.stopGestureRecognition();
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
