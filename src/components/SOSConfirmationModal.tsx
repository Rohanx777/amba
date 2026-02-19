import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
  Vibration,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { Audio } from 'expo-av';
import { CameraView, useCameraPermissions } from 'expo-camera';

const { width } = Dimensions.get('window');
const SLIDER_WIDTH = width * 0.8;
const SLIDER_THRESHOLD = SLIDER_WIDTH * 0.7;

interface SOSConfirmationModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SOSConfirmationModal({
  visible,
  onConfirm,
  onCancel,
}: SOSConfirmationModalProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  // State
  const [countdown, setCountdown] = useState(10);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [isPanicActive, setIsPanicActive] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const strobeRef = useRef<NodeJS.Timeout | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPanicMode();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      if (!permission?.granted) {
        requestPermission();
      }
      setCountdown(10);
      slideAnim.setValue(0);
      Vibration.vibrate([500, 500, 500]); // Initial Alert Vibes

      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleSendSOS(); // Trigger Panic Mode
            return 0;
          }
          Vibration.vibrate(100); // Haptic tick
          return prev - 1;
        });
      }, 1000);
    } else {
      resetModal();
    }
  }, [visible]);

  const resetModal = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    stopPanicMode();
  };

  // --- PANIC MODE LOGIC ---
  const startPanicMode = async () => {
    setIsPanicActive(true);
    try {
      // A: Audio Config
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
      });

      // B: Play Siren (Local Asset for Offline Reliability)
      // B: Play Siren (Local Asset for Offline Reliability)
      // console.log("🔊 LOADING LOCAL ASSET: siren.mp3");
      // const { sound } = await Audio.Sound.createAsync(
      //   require('../../assets/siren.mp3'),
      //   { isLooping: true, shouldPlay: true, volume: 1.0 }
      // );
      // soundRef.current = sound;

      // C: Start Strobe
      let toggle = false;
      strobeRef.current = setInterval(() => {
        toggle = !toggle;
        setTorchEnabled(toggle);
      }, 500); // 500ms strobe interval

    } catch (error) {
      console.error("❌ Panic Mode Error:", error);
    }
  };

  const stopPanicMode = async () => {
    setIsPanicActive(false);

    // Stop Audio
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (e) {
        console.log("Error stopping sound", e);
      }
      soundRef.current = null;
    }

    // Stop Strobe
    if (strobeRef.current) {
      clearInterval(strobeRef.current);
      strobeRef.current = null;
    }
    setTorchEnabled(false);
  };

  const handleSendSOS = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    // Vibrate heavily to confirm action
    Vibration.vibrate([0, 100, 50, 100]);

    startPanicMode(); // START PHYSICAL ALERTS
    onConfirm(); // SEND SMS/WHATSAPP
  };

  const handleCancelPress = () => {
    resetModal();
    onCancel();
  };

  // Slide to Cancel Logic
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0 && gestureState.dx < SLIDER_WIDTH - 50) {
          slideAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SLIDER_THRESHOLD) {
          handleCancelPress(); // Stop everything
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.container}>
        {/* Hidden Camera for Flashlight Control */}
        <CameraView
          style={{ width: 0, height: 0 }}
          enableTorch={torchEnabled}
          facing="back"
        />

        <LinearGradient
          colors={[colors.danger, colors.accent]}
          style={styles.gradient}
        >
          <Text style={styles.title}>EMERGENCY SOS</Text>
          <Text style={styles.subtitle}>
            {isPanicActive ? "ALARM ACTIVE! Sending Location..." : "Sending your location to emergency contacts in..."}
          </Text>

          {!isPanicActive && (
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{countdown}</Text>
            </View>
          )}

          {isPanicActive && (
            <View style={[styles.timerContainer, { borderColor: '#FFF', backgroundColor: 'red' }]}>
              <Text style={{ fontSize: 60 }}>🚨</Text>
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12, position: 'absolute', bottom: 10 }}>OFFLINE SIREN</Text>
            </View>
          )}

          {!isPanicActive && (
            <TouchableOpacity style={styles.sendNowBtn} onPress={handleSendSOS} activeOpacity={0.8}>
              <Text style={styles.sendNowText}>🚨 TAP TO SEND NOW</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.cancelInstruction}>
            Slide to cancel & stop alarm
          </Text>

          <View style={styles.sliderContainer}>
            <Animated.View
              style={[styles.sliderHandle, { transform: [{ translateX: slideAnim }] }]}
              {...panResponder.panHandlers}
            >
              <Text style={styles.sliderIcon}>››</Text>
            </Animated.View>
            <Text style={styles.sliderText}>CANCEL</Text>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.9)',
    },
    gradient: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    title: {
      fontSize: 36,
      fontWeight: '900',
      color: colors.text,
      letterSpacing: 2,
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 16,
      color: colors.text,
      opacity: 0.8,
      textAlign: 'center',
      marginBottom: 40,
    },
    timerContainer: {
      width: 150,
      height: 150,
      borderRadius: 75,
      borderWidth: 5,
      borderColor: colors.text,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 40,
    },
    timerText: {
      fontSize: 72,
      fontWeight: 'bold',
      color: colors.text,
    },
    cancelInstruction: {
      fontSize: 18,
      color: colors.text,
      opacity: 0.9,
      marginBottom: 20,
    },
    sliderContainer: {
      width: SLIDER_WIDTH,
      height: 60,
      borderRadius: 30,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'flex-start',
      paddingLeft: 5,
    },
    sliderHandle: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.text,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sliderIcon: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.danger,
    },
    sliderText: {
      position: 'absolute',
      alignSelf: 'center',
      color: colors.text,
      fontSize: 16,
      fontWeight: 'bold',
      opacity: 0.5,
      letterSpacing: 2,
    },
    sendNowBtn: {
      backgroundColor: '#FFF',
      paddingVertical: 18,
      paddingHorizontal: 40,
      borderRadius: 16,
      marginBottom: 30,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    sendNowText: {
      color: colors.danger,
      fontSize: 20,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
  });