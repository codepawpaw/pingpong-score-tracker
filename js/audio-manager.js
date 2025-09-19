class AudioManager {
    constructor() {
        this.sounds = {};
        this.audioContext = null;
        this.isEnabled = true;
        this.initializeAudio();
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
}

// Create global instance
window.audioManager = new AudioManager();
