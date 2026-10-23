# Desk Clock & PC Stream Deck Ultimate 🕒💻

A highly customizable Android Desk Clock app that doubles as a live video wallpaper and a PC Stream Deck macro pad. Built using pure HTML/CSS/JS and a lightweight Python Flask server.

## ✨ Features

**Android App**
* **Live Video Wallpaper:** Set any video from your gallery as an endlessly looping background.
* **Smart Playlist:** Automatically rotate background videos every time the app opens or on a set timer (1m, 5m, 30m, 1h).
* **Ultra-Customizable Clock:** Change fonts, colors, sizes, and text glow intensity to match your aesthetic.
* **Drag-and-Drop Layout:** Move the clock, PC stats, and macro buttons anywhere on the screen with a tap-to-swap edit mode.
* **True Immersive Mode:** Utilizes the Screen Wake Lock API to prevent the phone from sleeping and hides Android system bars.



## 🚀 Installation & Usage

### 1. The Android App
The app is built as a self-contained, offline-ready web application. 
1. Zip the contents of the `/App` folder (`index.html` and `icon.png`).
2. Use a free Website-to-APK converter (like WebIntoApp) and upload the `.zip` file using the "HTML Files" option.
3. Download and install the resulting `.apk` on your Android device.


## 🛠️ Built With
* **Frontend:** Vanilla HTML5, CSS3 (Glassmorphism UI), JavaScript
* **Backend (PC Server):** Python 3, Flask, psutil
