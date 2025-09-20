class AudioManager {
    constructor() {
        this.sounds = {};
        this.audioContext = null;
        this.isEnabled = true;
        this.voiceEnabled = true;
        this.speechSynthesis = null;
        this.voiceSettings = {
            rate: 1.0,
            pitch: 1.0,
            volume: 0.8,
            voice: null
        };
        this.initializeAudio();
        this.initializeSpeech();
    }

    async initializeAudio() {
        try {
            // Create audio context for Web Audio API
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Generate sound effects using Web Audio API
            this.generateSounds();
        } catch (error) {
            console.warn('Audio initialization failed:', error);
            this.isEnabled = false;
        }
    }

    initializeSpeech() {
        try {
            if ('speechSynthesis' in window) {
                this.speechSynthesis = window.speechSynthesis;
                
                // Wait for voices to load
                const loadVoices = () => {
                    const voices = this.speechSynthesis.getVoices();
                    if (voices.length > 0) {
                        // Try to find a good English voice
                        const englishVoice = voices.find(voice => 
                            voice.lang.startsWith('en') && voice.localService
                        ) || voices.find(voice => voice.lang.startsWith('en')) || voices[0];
                        
                        this.voiceSettings.voice = englishVoice;
                        console.log('Voice initialized:', englishVoice.name);
                    }
                };

                // Load voices immediately if available
                loadVoices();
                
                // Also listen for voices changed event (some browsers load voices asynchronously)
                if (this.speechSynthesis.onvoiceschanged !== undefined) {
                    this.speechSynthesis.onvoiceschanged = loadVoices;
                }
            } else {
                console.warn('Speech synthesis not supported');
                this.voiceEnabled = false;
            }
        } catch (error) {
            console.warn('Speech initialization failed:', error);
            this.voiceEnabled = false;
        }
    }

    generateSounds() {
        // Generate set win sound (ascending beep)
        this.sounds.setWin = this.createBeepSequence([
            { frequency: 523, duration: 0.2 }, // C5
            { frequency: 659, duration: 0.2 }, // E5
            { frequency: 784, duration: 0.3 }  // G5
        ]);

        // Generate match win sound (victory fanfare)
        this.sounds.matchWin = this.createBeepSequence([
            { frequency: 523, duration: 0.15 }, // C5
            { frequency: 659, duration: 0.15 }, // E5
            { frequency: 784, duration: 0.15 }, // G5
            { frequency: 1047, duration: 0.2 }, // C6
            { frequency: 784, duration: 0.1 },  // G5
            { frequency: 1047, duration: 0.4 }  // C6
        ]);

        // Generate point sound (quick beep)
        this.sounds.point = this.createBeepSequence([
            { frequency: 800, duration: 0.1 }
        ]);

        // Generate undo sound (descending beep)
        this.sounds.undo = this.createBeepSequence([
            { frequency: 600, duration: 0.1 }, // Higher tone
            { frequency: 400, duration: 0.1 }  // Lower tone (descending)
        ]);
    }

    createBeepSequence(notes) {
        return async () => {
            if (!this.isEnabled || !this.audioContext) return;

            try {
                // Resume audio context if it's suspended (required for user interaction)
                if (this.audioContext.state === 'suspended') {
                    await this.audioContext.resume();
                }

                let currentTime = this.audioContext.currentTime;

                for (const note of notes) {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();

                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);

                    oscillator.frequency.setValueAtTime(note.frequency, currentTime);
                    oscillator.type = 'sine';

                    // Envelope for smooth attack and release
                    gainNode.gain.setValueAtTime(0, currentTime);
                    gainNode.gain.linearRampToValueAtTime(0.3, currentTime + 0.01);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + note.duration);

                    oscillator.start(currentTime);
                    oscillator.stop(currentTime + note.duration);

                    currentTime += note.duration + 0.05; // Small gap between notes
                }
            } catch (error) {
                console.warn('Sound playback failed:', error);
            }
        };
    }

    async playSound(soundName) {
        if (!this.isEnabled) return;

        try {
            // Enable audio context on first user interaction
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            if (this.sounds[soundName]) {
                await this.sounds[soundName]();
            }
        } catch (error) {
            console.warn(`Failed to play sound ${soundName}:`, error);
        }
    }

    async playSetWin() {
        await this.playSound('setWin');
    }

    async playMatchWin() {
        await this.playSound('matchWin');
    }

    async playPoint() {
        await this.playSound('point');
    }

    async playUndo() {
        await this.playSound('undo');
    }

    // Voice announcement methods
    async announceScore(homeTeam, awayTeam, homeScore, awayScore, gameState = {}) {
        if (!this.voiceEnabled || !this.speechSynthesis) return;

        try {
            // Cancel any ongoing speech
            this.speechSynthesis.cancel();

            // Create the announcement text
            let announcement = this.formatScoreAnnouncement(homeTeam, awayTeam, homeScore, awayScore, gameState);
            
            // Create speech utterance
            const utterance = new SpeechSynthesisUtterance(announcement);
            
            // Apply voice settings
            if (this.voiceSettings.voice) {
                utterance.voice = this.voiceSettings.voice;
            }
            utterance.rate = this.voiceSettings.rate;
            utterance.pitch = this.voiceSettings.pitch;
            utterance.volume = this.voiceSettings.volume;

            // Speak the announcement
            this.speechSynthesis.speak(utterance);
            
            console.log('Announcing:', announcement);
        } catch (error) {
            console.warn('Failed to announce score:', error);
        }
    }

    formatScoreAnnouncement(homeTeam, awayTeam, homeScore, awayScore, gameState) {
        // Basic score format
        let announcement = `${homeTeam} ${homeScore}, ${awayTeam} ${awayScore}`;

        // Add special game state context
        if (gameState.currentSet && gameState.currentSet > 1) {
            announcement = `Set ${gameState.currentSet}. ${announcement}`;
        }

        // Check for deuce (both at 10 or higher and tied)
        if (homeScore >= 10 && awayScore >= 10 && homeScore === awayScore) {
            announcement += ". Deuce";
        }
        // Check for advantage (both at 10+ and one ahead by 1)
        else if (homeScore >= 10 && awayScore >= 10) {
            if (homeScore === awayScore + 1) {
                announcement += `. Advantage ${homeTeam}`;
            } else if (awayScore === homeScore + 1) {
                announcement += `. Advantage ${awayTeam}`;
            }
        }
        // Check for game point (one player at 10 and opponent less than 10)
        else if (homeScore >= 10 && awayScore < 10) {
            announcement += `. Game point ${homeTeam}`;
        } else if (awayScore >= 10 && homeScore < 10) {
            announcement += `. Game point ${awayTeam}`;
        }

        return announcement;
    }

    async announceSetWin(winner, homeTeam, awayTeam, setNumber, homeSets, awaySets) {
        if (!this.voiceEnabled || !this.speechSynthesis) return;

        try {
            this.speechSynthesis.cancel();
            
            const announcement = `${winner} wins set ${setNumber}. Sets: ${homeTeam} ${homeSets}, ${awayTeam} ${awaySets}`;
            
            const utterance = new SpeechSynthesisUtterance(announcement);
            if (this.voiceSettings.voice) utterance.voice = this.voiceSettings.voice;
            utterance.rate = this.voiceSettings.rate;
            utterance.pitch = this.voiceSettings.pitch;
            utterance.volume = this.voiceSettings.volume;

            this.speechSynthesis.speak(utterance);
            console.log('Announcing set win:', announcement);
        } catch (error) {
            console.warn('Failed to announce set win:', error);
        }
    }

    async announceMatchWin(winner, homeTeam, awayTeam, homeSets, awaySets) {
        if (!this.voiceEnabled || !this.speechSynthesis) return;

        try {
            this.speechSynthesis.cancel();
            
            const announcement = `Game over! ${winner} wins the match! Final score: ${homeTeam} ${homeSets}, ${awayTeam} ${awaySets}`;
            
            const utterance = new SpeechSynthesisUtterance(announcement);
            if (this.voiceSettings.voice) utterance.voice = this.voiceSettings.voice;
            utterance.rate = this.voiceSettings.rate;
            utterance.pitch = this.voiceSettings.pitch;
            utterance.volume = this.voiceSettings.volume;

            this.speechSynthesis.speak(utterance);
            console.log('Announcing match win:', announcement);
        } catch (error) {
            console.warn('Failed to announce match win:', error);
        }
    }

    // Enable audio on user interaction (required by browser policies)
    async enableAudio() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                console.log('Audio enabled');
            } catch (error) {
                console.warn('Failed to enable audio:', error);
            }
        }
    }

    toggle() {
        this.isEnabled = !this.isEnabled;
        return this.isEnabled;
    }

    setEnabled(enabled) {
        this.isEnabled = enabled;
    }

    toggleVoice() {
        this.voiceEnabled = !this.voiceEnabled;
        if (!this.voiceEnabled && this.speechSynthesis) {
            this.speechSynthesis.cancel();
        }
        return this.voiceEnabled;
    }

    setVoiceEnabled(enabled) {
        this.voiceEnabled = enabled;
        if (!enabled && this.speechSynthesis) {
            this.speechSynthesis.cancel();
        }
    }

    setVoiceSettings(settings) {
        Object.assign(this.voiceSettings, settings);
    }
}

// Create global instance
window.audioManager = new AudioManager();
