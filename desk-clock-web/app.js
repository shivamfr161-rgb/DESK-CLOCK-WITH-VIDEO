/**
 * Responsive Mobile Desk Clock Web App
 * Features:
 *  1. Persistent floating action bar (Settings, Full Mode, Exit buttons for Android & PC)
 *  2. Custom clock size (slider, quick presets, touch pinch-to-zoom gesture)
 *  3. Video rotation engine: Auto best-fit as per mobile orientation + 0°, 90°, 180°, 270°
 *  4. Endlessly looping video background with CSS object-fit: contain & solid black letterboxing
 *  5. Centered large digital clock (HH:MM format) with strong thick dark drop-shadow
 *  6. Screen Wake Lock API to prevent phone screen sleep
 *  7. Fullscreen API with explicit Exit / Escape button handling
 *  8. Android touch optimization & 100dvh responsiveness
 */

(() => {
  'use strict';

  // --- DOM Elements ---
  const bgVideo = document.getElementById('bg-video');
  const videoStage = document.getElementById('video-stage');
  const generatorCanvas = document.getElementById('generator-canvas');
  const videoFileInput = document.getElementById('video-file-input');
  const clockTime = document.getElementById('clock-time');
  const clockDate = document.getElementById('clock-date');
  const clockSeconds = document.getElementById('clock-seconds');
  const clockAmPm = document.getElementById('clock-ampm');
  const touchInterceptor = document.getElementById('touch-interceptor');
  const pinchHud = document.getElementById('pinch-hud');
  const pinchHudText = document.getElementById('pinch-hud-text');
  
  // Floating Action Bar (Always visible on screen)
  const floatingActionBar = document.getElementById('floating-action-bar');
  const floatingSettingsBtn = document.getElementById('floating-settings-btn');
  const floatingFullmodeBtn = document.getElementById('floating-fullmode-btn');
  const floatingExitBtn = document.getElementById('floating-exit-btn');
  const fullmodeLabel = document.getElementById('fullmode-label');

  // Settings Modal / Overlay
  const controlsOverlay = document.getElementById('controls-overlay');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const modalExitBtn = document.getElementById('modal-exit-btn');
  const changeBgBtn = document.getElementById('change-bg-btn');
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  const fullscreenIcon = document.getElementById('fullscreen-icon');
  const fullscreenText = document.getElementById('fullscreen-text');
  const currentRotationLabel = document.getElementById('current-rotation-label');
  const fitContainBtn = document.getElementById('fit-contain-btn');
  const fitCoverBtn = document.getElementById('fit-cover-btn');
  const clockSizeSlider = document.getElementById('clock-size-slider');
  const clockSizeVal = document.getElementById('clock-size-val');
  const clockSizeMinus = document.getElementById('clock-size-minus');
  const clockSizePlus = document.getElementById('clock-size-plus');
  const formatToggleBtn = document.getElementById('format-toggle-btn');
  const formatLabel = document.getElementById('format-label');
  const secondsToggleBtn = document.getElementById('seconds-toggle-btn');
  const wakeLockBadge = document.getElementById('wake-lock-badge');
  const wakeLockText = document.getElementById('wake-lock-text');
  const dimmerLayer = document.getElementById('dimmer-layer');
  const brightnessSlider = document.getElementById('brightness-slider');
  const brightnessVal = document.getElementById('brightness-val');
  const toastEl = document.getElementById('toast');

  // --- State Variables ---
  let is24Hour = localStorage.getItem('deskClock_is24Hour') !== 'false';
  let showSeconds = localStorage.getItem('deskClock_showSeconds') === 'true';
  let clockScalePercent = parseInt(localStorage.getItem('deskClock_scalePercent') || '100', 10);
  let videoRotationMode = localStorage.getItem('deskClock_videoRotation') || 'auto'; // 'auto', '0', '90', '180', '270'
  let videoFitMode = localStorage.getItem('deskClock_fitMode') || 'contain'; // 'contain', 'cover'
  
  let wakeLock = null;
  let wakeLockSupported = 'wakeLock' in navigator;
  let currentBlobUrl = null;
  let activeGeneratorAnimId = null;
  let currentPreset = 'matrix';
  let floatingBarIdleTimeout = null;

  // Touch Pinch Variables
  let initialPinchDistance = 0;
  let initialPinchScale = 100;
  let isPinching = false;
  let pinchHudTimeout = null;

  // ==========================================================================
  // 1. Digital Clock Engine (HH:MM Format, Updates Every Second)
  // ==========================================================================
  function updateClock() {
    const now = new Date();

    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    let ampm = '';

    if (!is24Hour) {
      ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
    }

    const formattedHours = is24Hour ? String(hours).padStart(2, '0') : String(hours);
    clockTime.textContent = `${formattedHours}:${minutes}`;

    if (showSeconds) {
      clockSeconds.style.display = 'inline';
      clockSeconds.textContent = `:${seconds}`;
    } else {
      clockSeconds.style.display = 'none';
    }

    if (!is24Hour) {
      clockAmPm.style.display = 'inline';
      clockAmPm.textContent = ampm;
    } else {
      clockAmPm.style.display = 'none';
    }

    const dateOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    clockDate.textContent = now.toLocaleDateString(undefined, dateOptions);
  }

  function startClock() {
    updateClock();
    const now = new Date();
    const delayToNextSecond = 1000 - now.getMilliseconds();
    setTimeout(() => {
      updateClock();
      setInterval(updateClock, 1000);
    }, delayToNextSecond);
  }

  // Format toggles
  formatLabel.textContent = is24Hour ? '24H' : '12H';
  formatToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    is24Hour = !is24Hour;
    localStorage.setItem('deskClock_is24Hour', is24Hour);
    formatLabel.textContent = is24Hour ? '24H' : '12H';
    updateClock();
    showToast(`Format set to ${is24Hour ? '24-Hour' : '12-Hour'}`);
  });

  if (showSeconds) secondsToggleBtn.style.color = '#22c55e';
  secondsToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showSeconds = !showSeconds;
    localStorage.setItem('deskClock_showSeconds', showSeconds);
    secondsToggleBtn.style.color = showSeconds ? '#22c55e' : '#ffffff';
    updateClock();
  });

  // ==========================================================================
  // 2. Custom Clock Size Engine (Slider, Steppers, Chips, Touch Pinch-to-Zoom)
  // ==========================================================================
  function setClockSize(percent, save = true) {
    percent = Math.max(50, Math.min(230, Math.round(percent)));
    clockScalePercent = percent;

    document.documentElement.style.setProperty('--clock-scale', (percent / 100).toString());

    clockSizeSlider.value = percent;
    clockSizeVal.textContent = `${percent}%`;

    document.querySelectorAll('#clock-size-card .chip-btn').forEach(btn => {
      const chipSize = parseInt(btn.getAttribute('data-size'), 10);
      btn.classList.toggle('active', Math.abs(chipSize - percent) <= 12);
    });

    if (save) {
      localStorage.setItem('deskClock_scalePercent', percent);
    }
  }

  clockSizeSlider.addEventListener('input', (e) => {
    setClockSize(e.target.value, false);
  });

  clockSizeSlider.addEventListener('change', (e) => {
    setClockSize(e.target.value, true);
  });

  clockSizeMinus.addEventListener('click', (e) => {
    e.stopPropagation();
    setClockSize(clockScalePercent - 10, true);
  });

  clockSizePlus.addEventListener('click', (e) => {
    e.stopPropagation();
    setClockSize(clockScalePercent + 10, true);
  });

  document.querySelectorAll('#clock-size-card .chip-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetSize = parseInt(btn.getAttribute('data-size'), 10);
      setClockSize(targetSize, true);
      showToast(`Clock size: ${targetSize}%`);
    });
  });

  setClockSize(clockScalePercent, false);

  // --- Touch Pinch-to-Zoom Gesture Implementation ---
  function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  touchInterceptor.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      isPinching = true;
      initialPinchDistance = getTouchDistance(e.touches);
      initialPinchScale = clockScalePercent;
      
      if (pinchHudTimeout) clearTimeout(pinchHudTimeout);
      pinchHudText.textContent = `Clock Size: ${clockScalePercent}%`;
      pinchHud.classList.add('show');
    }
  }, { passive: true });

  touchInterceptor.addEventListener('touchmove', (e) => {
    if (isPinching && e.touches.length === 2) {
      const currentDist = getTouchDistance(e.touches);
      const ratio = currentDist / initialPinchDistance;
      const newScale = Math.round(initialPinchScale * ratio);
      
      setClockSize(newScale, false);
      pinchHudText.textContent = `Clock Size: ${clockScalePercent}%`;
    }
  }, { passive: true });

  touchInterceptor.addEventListener('touchend', (e) => {
    if (isPinching && e.touches.length < 2) {
      isPinching = false;
      setClockSize(clockScalePercent, true);
      
      pinchHudTimeout = setTimeout(() => {
        pinchHud.classList.remove('show');
      }, 800);
    }
  });

  // Tapping screen toggles Settings modal
  touchInterceptor.addEventListener('click', () => {
    if (isPinching) return;
    toggleSettings();
  });

  // ==========================================================================
  // 3. Video Rotation Engine & Mobile Orientation Adaptation
  // ==========================================================================
  function isScreenLandscape() {
    return window.innerWidth > window.innerHeight;
  }

  function isVideoVertical() {
    const vw = bgVideo.videoWidth || 16;
    const vh = bgVideo.videoHeight || 9;
    return vh > vw;
  }

  function computeAutoRotationAngle() {
    const landscapeScreen = isScreenLandscape();
    const verticalVideo = isVideoVertical();

    if (landscapeScreen && verticalVideo) {
      return 90;
    }
    return 0;
  }

  function applyVideoRotation(mode = videoRotationMode) {
    videoRotationMode = mode;
    localStorage.setItem('deskClock_videoRotation', mode);

    let effectiveAngle = 0;
    if (mode === 'auto') {
      effectiveAngle = computeAutoRotationAngle();
      currentRotationLabel.textContent = `Auto (${effectiveAngle}°)`;
    } else {
      effectiveAngle = parseInt(mode, 10);
      currentRotationLabel.textContent = `${effectiveAngle}°`;
    }

    videoStage.classList.remove('rotate-0', 'rotate-90', 'rotate-180', 'rotate-270');
    videoStage.classList.add(`rotate-${effectiveAngle}`);

    document.querySelectorAll('.rotation-chips .chip-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-rotation') === mode);
    });
  }

  function setFitMode(mode) {
    videoFitMode = mode;
    localStorage.setItem('deskClock_fitMode', mode);

    videoStage.classList.remove('fit-contain', 'fit-cover');
    videoStage.classList.add(`fit-${mode}`);

    fitContainBtn.classList.toggle('active', mode === 'contain');
    fitCoverBtn.classList.toggle('active', mode === 'cover');

    showToast(`Fit Mode: ${mode === 'contain' ? 'Contain (No Crop)' : 'Fill (Cover)'}`);
  }

  document.querySelectorAll('.rotation-chips .chip-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const rot = btn.getAttribute('data-rotation');
      applyVideoRotation(rot);
      showToast(`Video rotation: ${rot === 'auto' ? 'Auto Best-Fit' : rot + '°'}`);
    });
  });

  fitContainBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setFitMode('contain');
  });

  fitCoverBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setFitMode('cover');
  });

  bgVideo.addEventListener('loadedmetadata', () => {
    if (videoRotationMode === 'auto') {
      applyVideoRotation('auto');
    }
  });

  function handleScreenOrientationChange() {
    setTimeout(() => {
      updateClock();
      if (videoRotationMode === 'auto') {
        applyVideoRotation('auto');
      }
    }, 120);
  }

  window.addEventListener('resize', handleScreenOrientationChange);
  window.addEventListener('orientationchange', handleScreenOrientationChange);
  if (screen.orientation) {
    screen.orientation.addEventListener('change', handleScreenOrientationChange);
  }

  setFitMode(videoFitMode);
  applyVideoRotation(videoRotationMode);

  // ==========================================================================
  // 4. FLOATING ACTION BAR & SETTINGS MODAL / FULL MODE / EXIT ENGINE
  // ==========================================================================
  function openSettings() {
    controlsOverlay.classList.add('visible');
    controlsOverlay.setAttribute('aria-hidden', 'false');
    updateExitButtonState();
    resetFloatingBarIdleTimer();
  }

  function closeSettings() {
    controlsOverlay.classList.remove('visible');
    controlsOverlay.setAttribute('aria-hidden', 'true');
    updateExitButtonState();
    resetFloatingBarIdleTimer();
  }

  function toggleSettings() {
    if (controlsOverlay.classList.contains('visible')) {
      closeSettings();
    } else {
      openSettings();
    }
  }

  function updateExitButtonState() {
    const inFullscreen = isFullscreen();
    const settingsOpen = controlsOverlay.classList.contains('visible');
    if (inFullscreen || settingsOpen) {
      floatingExitBtn.classList.add('active');
    } else {
      floatingExitBtn.classList.remove('active');
    }
  }

  // Handle Exit action (closes Settings or exits Fullscreen)
  function handleExit() {
    let handled = false;
    if (controlsOverlay.classList.contains('visible')) {
      closeSettings();
      handled = true;
    }
    if (isFullscreen()) {
      exitFullscreen();
      handled = true;
    }
    if (!handled) {
      showToast('Desk Clock is running');
    }
  }

  // 1. Settings button clicks
  floatingSettingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSettings();
  });

  closeSettingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeSettings();
  });

  modalExitBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeSettings();
  });

  // 2. Full Mode button clicks
  floatingFullmodeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFullscreen();
  });

  fullscreenBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFullscreen();
  });

  // 3. Exit button click
  floatingExitBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleExit();
  });

  // 4. Keyboard Escape key & Android Back button listener
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
      handleExit();
    }
  });

  // Auto-dim floating action bar when idle to prevent burn-in
  function resetFloatingBarIdleTimer() {
    floatingActionBar.classList.remove('idle-dim');
    if (floatingBarIdleTimeout) clearTimeout(floatingBarIdleTimeout);
    floatingBarIdleTimeout = setTimeout(() => {
      if (!controlsOverlay.classList.contains('visible')) {
        floatingActionBar.classList.add('idle-dim');
      }
    }, 4500);
  }

  ['touchstart', 'pointerdown', 'mousemove', 'scroll'].forEach(evt => {
    window.addEventListener(evt, resetFloatingBarIdleTimer, { passive: true });
  });
  resetFloatingBarIdleTimer();

  // ==========================================================================
  // 5. Fullscreen API Implementation
  // ==========================================================================
  function isFullscreen() {
    return Boolean(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  }

  async function enterFullscreen() {
    const root = document.documentElement;
    if (root.requestFullscreen) {
      await root.requestFullscreen();
    } else if (root.webkitRequestFullscreen) {
      await root.webkitRequestFullscreen();
    } else if (root.mozRequestFullScreen) {
      await root.mozRequestFullScreen();
    } else if (root.msRequestFullscreen) {
      await root.msRequestFullscreen();
    }
  }

  async function exitFullscreen() {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      await document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      await document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      await document.msExitFullscreen();
    }
  }

  async function toggleFullscreen() {
    try {
      if (!isFullscreen()) {
        await enterFullscreen();
      } else {
        await exitFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen error:', err);
      showToast('Fullscreen mode toggled');
    }
  }

  function updateFullscreenUI() {
    const active = isFullscreen();
    if (active) {
      fullscreenText.textContent = 'Exit Fullscreen';
      fullmodeLabel.textContent = 'Exit Full';
      fullscreenIcon.innerHTML = `
        <path d="M4 14h6m0 0v6m0-6-7 7"/>
        <path d="M20 10h-6m0 0V4m0 6 7-7"/>
        <path d="M14 20v-6m0 0h6m-6 0 7 7"/>
        <path d="M10 4v6m0 0H4m0 0 7-7"/>
      `;
    } else {
      fullscreenText.textContent = 'Go Fullscreen';
      fullmodeLabel.textContent = 'Full Mode';
      fullscreenIcon.innerHTML = `
        <path d="M8 3H5a2 2 0 0 0-2 2v3"/>
        <path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
        <path d="M3 16v3a2 2 0 0 0 2 2h3"/>
        <path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
      `;
    }
    updateExitButtonState();
  }

  ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(evt => {
    document.addEventListener(evt, updateFullscreenUI);
  });

  // ==========================================================================
  // 6. Change Background Button & Video Gallery Picker
  // ==========================================================================
  changeBgBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    videoFileInput.click();
  });

  videoFileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      showToast('Please select a valid video file');
      return;
    }

    stopGenerator();

    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
      currentBlobUrl = null;
    }

    currentBlobUrl = URL.createObjectURL(file);
    bgVideo.srcObject = null;
    bgVideo.src = currentBlobUrl;
    bgVideo.load();

    bgVideo.play().then(() => {
      showToast(`Loaded: ${file.name}`);
      document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
    }).catch(err => {
      console.warn('Video play error:', err);
      showToast('Video selected. Tap screen to resume autoplay.');
    });

    videoFileInput.value = '';
  });

  bgVideo.addEventListener('ended', () => {
    bgVideo.currentTime = 0;
    bgVideo.play().catch(() => {});
  });

  bgVideo.play().catch(() => {});

  // ==========================================================================
  // 7. Background Presets
  // ==========================================================================
  document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const preset = chip.getAttribute('data-preset');
      loadPreset(preset);
    });
  });

  function loadPreset(presetName) {
    currentPreset = presetName;
    stopGenerator();

    if (presetName === 'matrix') {
      bgVideo.srcObject = null;
      bgVideo.src = 'assets/matrix.mp4';
      bgVideo.load();
      bgVideo.play().catch(() => {});
      showToast('Preset: Matrix Digital Rain');
    } else {
      startCanvasGenerator(presetName);
    }
  }

  function startCanvasGenerator(type) {
    generatorCanvas.width = 640;
    generatorCanvas.height = 360;
    const ctx = generatorCanvas.getContext('2d');

    try {
      const stream = generatorCanvas.captureStream(30);
      bgVideo.src = '';
      bgVideo.srcObject = stream;
      bgVideo.play().catch(() => {});
    } catch (e) {
      console.warn('captureStream not available, using fallback renderer', e);
    }

    let frame = 0;

    if (type === 'cosmic') {
      showToast('Preset: Cosmic Aurora');
      function renderCosmic() {
        frame += 0.015;
        const w = generatorCanvas.width;
        const h = generatorCanvas.height;
        ctx.fillStyle = '#020208';
        ctx.fillRect(0, 0, w, h);

        for (let i = 0; i < 3; i++) {
          const grad = ctx.createRadialGradient(
            w * (0.3 + 0.4 * Math.sin(frame + i * 2)),
            h * (0.3 + 0.4 * Math.cos(frame * 0.8 + i)),
            20,
            w * 0.5,
            h * 0.5,
            w * 0.7
          );
          if (i === 0) {
            grad.addColorStop(0, 'rgba(139, 92, 246, 0.4)');
            grad.addColorStop(1, 'transparent');
          } else if (i === 1) {
            grad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
            grad.addColorStop(1, 'transparent');
          } else {
            grad.addColorStop(0, 'rgba(236, 72, 153, 0.3)');
            grad.addColorStop(1, 'transparent');
          }
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);
        }
        activeGeneratorAnimId = requestAnimationFrame(renderCosmic);
      }
      renderCosmic();

    } else if (type === 'starfield') {
      showToast('Preset: Deep Starfield');
      const stars = Array.from({ length: 180 }, () => ({
        x: (Math.random() - 0.5) * 640,
        y: (Math.random() - 0.5) * 360,
        z: Math.random() * 640
      }));

      function renderStars() {
        const w = generatorCanvas.width;
        const h = generatorCanvas.height;
        ctx.fillStyle = '#030712';
        ctx.fillRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h / 2;

        stars.forEach(s => {
          s.z -= 1.8;
          if (s.z <= 0) {
            s.x = (Math.random() - 0.5) * w;
            s.y = (Math.random() - 0.5) * h;
            s.z = w;
          }
          const k = 250 / s.z;
          const px = s.x * k + cx;
          const py = s.y * k + cy;
          if (px >= 0 && px < w && py >= 0 && py < h) {
            const size = Math.min(3, Math.max(0.8, (1 - s.z / w) * 3));
            const alpha = Math.min(1, Math.max(0.2, (1 - s.z / w) * 1.5));
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        activeGeneratorAnimId = requestAnimationFrame(renderStars);
      }
      renderStars();

    } else if (type === 'fire') {
      showToast('Preset: Cozy Hearth Fire');
      const embers = Array.from({ length: 60 }, () => ({
        x: Math.random() * 640,
        y: 360 + Math.random() * 40,
        vy: 1 + Math.random() * 2,
        vx: (Math.random() - 0.5) * 1.2,
        r: 1.5 + Math.random() * 2.5,
        alpha: 1
      }));

      function renderFire() {
        frame += 0.05;
        const w = generatorCanvas.width;
        const h = generatorCanvas.height;
        ctx.fillStyle = '#0a0302';
        ctx.fillRect(0, 0, w, h);

        const glow = ctx.createRadialGradient(w / 2, h * 0.9, 30, w / 2, h * 0.9, w * 0.5);
        glow.addColorStop(0, 'rgba(249, 115, 22, 0.45)');
        glow.addColorStop(0.5, 'rgba(234, 88, 12, 0.2)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);

        embers.forEach(e => {
          e.y -= e.vy;
          e.x += e.vx + Math.sin(frame + e.y * 0.02) * 0.5;
          e.alpha -= 0.007;

          if (e.y < 50 || e.alpha <= 0) {
            e.y = h + Math.random() * 20;
            e.x = w * 0.3 + Math.random() * (w * 0.4);
            e.alpha = 0.8 + Math.random() * 0.2;
          }

          ctx.fillStyle = `rgba(251, 146, 60, ${e.alpha})`;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
          ctx.fill();
        });

        activeGeneratorAnimId = requestAnimationFrame(renderFire);
      }
      renderFire();

    } else if (type === 'cyber') {
      showToast('Preset: Cyber Neon Grid');
      function renderCyber() {
        frame += 0.02;
        const w = generatorCanvas.width;
        const h = generatorCanvas.height;
        ctx.fillStyle = '#080112';
        ctx.fillRect(0, 0, w, h);

        const horizon = h * 0.6;

        const sun = ctx.createRadialGradient(w / 2, horizon - 20, 10, w / 2, horizon - 20, 80);
        sun.addColorStop(0, 'rgba(244, 63, 94, 0.9)');
        sun.addColorStop(0.7, 'rgba(236, 72, 153, 0.4)');
        sun.addColorStop(1, 'transparent');
        ctx.fillStyle = sun;
        ctx.beginPath();
        ctx.arc(w / 2, horizon - 20, 80, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(168, 85, 247, 0.45)';
        ctx.lineWidth = 1.2;

        for (let i = 1; i <= 8; i++) {
          const y = horizon + Math.pow(i / 8, 2) * (h - horizon);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }

        const vanishingX = w / 2;
        for (let x = -w * 0.5; x <= w * 1.5; x += 50) {
          ctx.beginPath();
          ctx.moveTo(vanishingX, horizon);
          ctx.lineTo(x + ((frame * 20) % 50), h);
          ctx.stroke();
        }

        activeGeneratorAnimId = requestAnimationFrame(renderCyber);
      }
      renderCyber();
    }
  }

  function stopGenerator() {
    if (activeGeneratorAnimId) {
      cancelAnimationFrame(activeGeneratorAnimId);
      activeGeneratorAnimId = null;
    }
  }

  // ==========================================================================
  // 8. Screen Wake Lock API
  // ==========================================================================
  async function requestWakeLock() {
    if (!wakeLockSupported) {
      updateWakeLockUI('unsupported');
      return;
    }

    try {
      wakeLock = await navigator.wakeLock.request('screen');
      updateWakeLockUI('active');

      wakeLock.addEventListener('release', () => {
        if (document.visibilityState === 'visible') {
          updateWakeLockUI('inactive');
        }
      });
    } catch (err) {
      console.warn(`Screen Wake Lock request failed: ${err.name}, ${err.message}`);
      updateWakeLockUI('error');
    }
  }

  function updateWakeLockUI(status) {
    wakeLockBadge.classList.remove('disabled', 'error');
    if (status === 'active') {
      wakeLockText.textContent = 'Screen Awake';
    } else if (status === 'inactive') {
      wakeLockBadge.classList.add('disabled');
      wakeLockText.textContent = 'Wake Lock Idle';
    } else if (status === 'unsupported') {
      wakeLockBadge.classList.add('disabled');
      wakeLockText.textContent = 'Wake Lock N/A';
    } else {
      wakeLockBadge.classList.add('error');
      wakeLockText.textContent = 'Wake Lock Error';
    }
  }

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      await requestWakeLock();
      if (bgVideo.paused) {
        bgVideo.play().catch(() => {});
      }
    }
  });

  requestWakeLock();
  window.addEventListener('click', () => { if (!wakeLock && wakeLockSupported) requestWakeLock(); }, { once: true });
  window.addEventListener('touchstart', () => { if (!wakeLock && wakeLockSupported) requestWakeLock(); }, { once: true });

  // ==========================================================================
  // 9. Nightstand Bedside Dimmer Slider
  // ==========================================================================
  brightnessSlider.addEventListener('input', (e) => {
    const val = Number(e.target.value);
    brightnessVal.textContent = `${val}%`;
    const darkness = (100 - val) / 100 * 0.85;
    dimmerLayer.style.opacity = darkness;
  });

  // ==========================================================================
  // 10. Toast Helper
  // ==========================================================================
  let toastTimeout = null;
  function showToast(message) {
    if (toastTimeout) clearTimeout(toastTimeout);
    toastEl.textContent = message;
    toastEl.classList.add('show');
    toastTimeout = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 2800);
  }

  // ==========================================================================
  // 11. Initialization
  // ==========================================================================
  startClock();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.log('SW registration skipped:', err);
      });
    });
  }

  // Brief initial glance of settings
  openSettings();
  setTimeout(closeSettings, 2800);

})();
