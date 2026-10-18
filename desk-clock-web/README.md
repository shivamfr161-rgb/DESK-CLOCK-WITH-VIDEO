# 📱 Responsive Mobile Desk Clock Web App

A responsive, high-performance Desk Clock web application built specifically for mobile phones and desktop displays, with full support for **portrait and landscape orientations**, **custom clock sizing**, and **smart video rotation / best-fit matching**.

---

## ✨ New & Core Features

### 1. 🕒 Custom Clock Size
- **Slider & Steppers**: Adjust clock size seamlessly from **50% to 230%** via slider or `−` / `+` stepper buttons.
- **Quick Preset Chips**: One-tap size switching between **Small (70%)**, **Medium (100%)**, **Large (140%)**, and **Giant (185%)**.
- **Touch Pinch-to-Zoom Gesture**: On mobile phones, pinch the screen with two fingers at any time to dynamically scale the clock in real-time, accompanied by a HUD percentage indicator.
- **Persistent Preferences**: Your chosen clock scale is automatically saved to `localStorage` across page reloads.

### 2. 🔄 Video Rotation & Best Fit
- **Auto Best-Fit as per Mobile Orientation**:
  - Automatically detects the phone's physical orientation (Portrait vs. Landscape) and the video's aspect ratio.
  - When playing a vertical/portrait video (such as phone camera recordings, TikToks, or Reels) on a landscape desk dock, the app automatically rotates it 90° so it uses the maximum screen area without distortion!
  - Adapts in real-time when the phone is physically rotated between portrait and landscape.
- **Manual Rotation Controls**:
  - Direct selection of **0°**, **90°**, **180°**, or **270°**.
  - **Quick 1-Tap Rotate Button**: Cycles through rotation angles on each tap (`Auto` ➔ `90°` ➔ `180°` ➔ `270°` ➔ `0°`).
- **Mathematical Dimension Swapping for 90°/270°**:
  - When rotated 90° or 270°, dimensions swap (`width: 100vh; height: 100vw;`) to ensure `object-fit: contain` never distorts, zooms, or crops the video.
- **Fit Modes**:
  - **Contain (No Crop - Letterbox)**: Default mode, guaranteeing 100% of the video is visible with black letterboxing bars.
  - **Cover (Fill Screen)**: Optional mode for full-bleed edge-to-edge playback.

### 3. 🎬 Endlessly Looping Video Background
- Solid `#000000` black background behind the video.
- Play/pause controls hidden (`autoplay`, `muted`, `loop`, `playsinline`, `webkit-playsinline`).
- Pre-bundled offline video: `assets/matrix.mp4` (680 KB).
- Built-in procedural ambient generators: *Matrix Code*, *Cosmic Aurora*, *Deep Starfield*, *Cozy Hearth*, and *Cyber Grid*.

### 4. 🖼️ Tap-to-Reveal "Change Background" Gallery Picker
- Tapping anywhere on the screen displays a sleek glassmorphic overlay that auto-hides after 4.5 seconds of inactivity.
- Clicking **"Change Background"** opens the device's native file picker (`<input type="file" accept="video/*">`) to select any video from your phone's gallery or camera roll.

### 5. ⚡ Screen Wake Lock API
- Uses `navigator.wakeLock.request('screen')` so the phone screen never turns off or dims while the desk clock is open.
- Automatically re-acquires the wake lock on `visibilitychange` when returning from other apps or unlocking.
- Live status badge in the top bar.

### 6. ⛶ Fullscreen API
- One-tap **"Go Fullscreen"** hides mobile system bars and browser UI for a native app feel.

### 7. 🌙 Bedside Nightstand Dimmer
- Quick brightness slider to dim screen intensity for comfortable bedside viewing in dark rooms.

---

## 🚀 Running & Testing

### Using the Built-In Local Server:
```bash
cd desk-clock
node server.js
```

1. **PC / Desktop:** Open [http://localhost:3000](http://localhost:3000)
2. **Mobile Phone:** Connect your phone to the same Wi-Fi and open `http://<YOUR_LAN_IP>:3000` (e.g. `http://10.58.186.1:3000`).
3. Tap the screen to reveal controls, customize your clock size, test video rotation, and tap **"Go Fullscreen"**!
