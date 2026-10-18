import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  TouchableOpacity,
  Platform,
  AppState,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useKeepAwake } from 'expo-keep-awake';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';

// Fallback looping video before the user picks their own from the gallery
const DEFAULT_VIDEO_URI =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

export default function App() {
  // 1. Keep Awake (Wakelock): Prevents the screen from dimming or sleeping
  useKeepAwake();

  const [videoUri, setVideoUri] = useState<string>(DEFAULT_VIDEO_URI);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [showPickerButton, setShowPickerButton] = useState<boolean>(false);
  const hideButtonTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 2. Configure Video Player: Endless loop, muted by default, auto-play
  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = true;
    p.muted = true; // Optional: remove or set to false if you want video audio
    p.play();
  });

  // Helper to enforce Android Full-Screen Immersive Mode & Landscape Lock
  const enableImmersiveLandscapeMode = async () => {
    try {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE
      );
      if (Platform.OS === 'android') {
        await NavigationBar.setPositionAsync('absolute');
        await NavigationBar.setBackgroundColorAsync('#00000000');
        await NavigationBar.setBehaviorAsync('overlay-swipe');
        await NavigationBar.setVisibilityAsync('hidden');
      }
    } catch (error) {
      console.warn('Failed to set immersive/landscape mode:', error);
    }
  };

  // Enforce landscape & hide system bars on mount and when returning from background/picker
  useEffect(() => {
    enableImmersiveLandscapeMode();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        enableImmersiveLandscapeMode();
        player.play();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [player]);

  // 3. Clock Overlay Timer: Updates every second (HH:MM format)
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };

    updateClock(); // Initial call so there is no 1-second delay on launch
    const timerId = setInterval(updateClock, 1000);

    return () => clearInterval(timerId);
  }, []);

  // Cleanup button auto-hide timer on unmount
  useEffect(() => {
    return () => {
      if (hideButtonTimeoutRef.current) {
        clearTimeout(hideButtonTimeoutRef.current);
      }
    };
  }, []);

  // Show the 'Select Video' button briefly (3.5 seconds) when screen is tapped
  const handleScreenTap = () => {
    setShowPickerButton(true);

    if (hideButtonTimeoutRef.current) {
      clearTimeout(hideButtonTimeoutRef.current);
    }

    hideButtonTimeoutRef.current = setTimeout(() => {
      setShowPickerButton(false);
    }, 3500);
  };

  // 4. Native Android Video Picker
  const handleSelectVideo = async () => {
    if (hideButtonTimeoutRef.current) {
      clearTimeout(hideButtonTimeoutRef.current);
    }

    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        alert('Permission to access the media gallery is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;
        setVideoUri(selectedUri);
      }
    } catch (error) {
      console.error('Error picking video:', error);
    } finally {
      setShowPickerButton(false);
      // Re-hide Android system bars after returning from the native file picker intent
      enableImmersiveLandscapeMode();
    }
  };

  return (
    <View style={styles.container}>
      {/* Hide top Android Status Bar */}
      <StatusBar hidden={true} translucent={true} />

      {/* Full-Screen Looping Video Background */}
      <VideoView
        player={player}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        nativeControls={false}
        allowsFullscreen={false}
        allowsPictureInPicture={false}
      />

      {/* Full-Screen Touch Interceptor & Clock Overlay */}
      <Pressable style={styles.overlay} onPress={handleScreenTap}>
        <Text style={styles.clockText} selectable={false}>
          {currentTime}
        </Text>

        {/* Temporary 'Select Video' Button */}
        {showPickerButton && (
          <TouchableOpacity
            style={styles.pickerButton}
            activeOpacity={0.8}
            onPress={handleSelectVideo}
          >
            <Text style={styles.pickerButtonText}>Select Video</Text>
          </TouchableOpacity>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clockText: {
    color: '#FFFFFF',
    fontSize: 140,
    fontWeight: '700',
    letterSpacing: 4,
    includeFontPadding: false,
    // Subtle dark drop-shadow for high contrast on both light and dark videos
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 16,
  },
  pickerButton: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    // Subtle elevation on Android
    elevation: 6,
  },
  pickerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
});