# 🏓 Ping Pong Score Tracker

A mobile-first web application that tracks ping pong match scores using hand gesture recognition. Perfect for hands-free scoring during competitive matches!

![Ping Pong Score Tracker](https://img.shields.io/badge/version-1.0.0-blue.svg) ![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

## ✨ Features

### 🎮 Core Functionality
- **Gesture Recognition**: Uses MediaPipe Hands for real-time hand gesture detection
  - 📋 **Open Palm** = Home team point
  - ✊ **Closed Fist** = Away team point
- **Customizable Matches**: Set number of sets (1, 3, 5, or 7)
- **Team Names**: Customize home and away team names
- **Standard Ping Pong Rules**: First to 11 points wins a set (must win by 2)
- **Set Tracking**: Best-of-X sets determines match winner

### 🔊 Audio Feedback
- Point scored sound effect
- Set completion sound
- Victory fanfare for match winner
- All sounds generated using Web Audio API

### 📱 Mobile Optimized
- Responsive design for mobile browsers
- Touch-friendly interface
- Camera access for gesture detection
- Optimized for portrait orientation

### 🎯 User Experience
- Real-time gesture detection feedback
- Animated score updates
- Visual gesture guide
- Clean, modern interface
- Three screens: Setup → Game → Victory

## 🚀 Getting Started

### Prerequisites
- Modern web browser with camera support
- HTTPS connection (required for camera access)
- Device with front-facing camera

### Installation
1. Clone or download this repository
2. Open `index.html` in a web browser
3. Grant camera permissions when prompted
4. Start playing!

### Usage

1. **Setup Screen**:
   - Enter team names (optional, defaults to "Home" and "Away")
   - Select number of sets for the match
   - Click "Start Game"

2. **Game Screen**:
   - Position yourself in front of the camera
   - Show gestures to score points:
     - 📋 Open palm = Home team point
     - ✊ Closed fist = Away team point
   - First to 11 points wins the set
   - Match winner determined by most sets won

3. **Controls**:
   - **Reset Set**: Reset current set scores to 0-0
   - **New Game**: Return to setup screen
   - **Keyboard Shortcuts** (for testing):
     - `H` key = Home team point
     - `A` key = Away team point

## 🛠️ Technical Details

### Architecture
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Gesture Recognition**: MediaPipe Hands
- **Audio**: Web Audio API
- **Camera**: WebRTC getUserMedia API

### File Structure
```
score_tracker/
├── index.html              # Main application HTML
├── css/
│   └── styles.css          # Responsive styling
├── js/
│   ├── app.js              # Main application logic
│   ├── gesture-recognition.js  # MediaPipe integration
│   └── audio-manager.js    # Sound effects system
└── README.md              # Documentation
```

### Browser Compatibility
- Chrome 88+ (recommended)
- Safari 14+
- Firefox 85+
- Edge 88+

**Note**: Camera access requires HTTPS in production environments.

## 🎯 Gesture Recognition Details

The application uses MediaPipe Hands to detect and classify hand gestures:

### Supported Gestures
1. **Open Palm (Paper)**: 4+ fingers extended
2. **Closed Fist (Rock)**: 1 or fewer fingers extended

### Performance Features
- Real-time hand landmark detection
- Gesture confidence thresholds
- 1-second debounce to prevent false triggers
- Visual feedback for detected gestures

### Troubleshooting Gestures
- Ensure good lighting
- Position hand clearly in camera view
- Hold gesture for ~1 second
- Avoid rapid hand movements

## 🔧 Customization

### Adjusting Gesture Sensitivity
In `js/gesture-recognition.js`, modify:
```javascript
this.gestureDebounceTime = 1000; // Milliseconds between gestures
this.confidenceThreshold = 0.8;  // Detection confidence (0-1)
```

### Modifying Score Rules
In `js/app.js`, the `checkSetWin()` method handles scoring logic:
```javascript
if (this.gameState.homeScore >= 11 && 
    this.gameState.homeScore - this.gameState.awayScore >= 2) {
    setWinner = 'home';
}
```

### Audio Customization
Sound effects are generated in `js/audio-manager.js` using Web Audio API. Modify frequencies and durations in the `generateSounds()` method.

## 🎨 Styling

The application uses a modern design with:
- Gradient backgrounds
- Rounded corners and shadows
- Smooth animations
- Mobile-first responsive layout
- Touch-friendly button sizes

## 🔒 Privacy & Security

- **Camera Access**: Used only for gesture detection, no data stored
- **No External Dependencies**: All processing happens locally
- **No Data Collection**: No analytics or tracking
- **Offline Capable**: Works without internet after initial load

## 🐛 Troubleshooting

### Camera Issues
- **Permission Denied**: Check browser camera permissions
- **Camera Not Working**: Ensure HTTPS connection
- **Poor Detection**: Improve lighting or camera angle

### Audio Issues
- **No Sound**: Click anywhere to enable audio (browser policy)
- **Silent Mode**: Check device volume and mute settings

### Performance Issues
- **Slow Detection**: Close other camera-using applications
- **Lag**: Reduce browser tabs or restart browser

## 🚧 Known Limitations

- Requires good lighting for optimal gesture detection
- Single hand detection (one gesture at a time)
- Camera permission required for full functionality
- Desktop browsers may have different camera orientations

## 🤝 Contributing

Feel free to submit issues, feature requests, or improvements:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- [MediaPipe](https://mediapipe.dev/) for hand detection
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) for sound generation
- Modern web standards for camera access and responsive design

---

**Enjoy your ping pong matches! 🏓**
