import { useEffect, useState } from 'react';
import Voice, { SpeechErrorEvent, SpeechResultsEvent } from '@react-native-voice/voice';
import { Alert, PermissionsAndroid, Platform } from 'react-native';

const ACTIVATION_PHRASE = "amba bachao";

/**
 * A hook to manage voice recognition for SOS activation.
 * @param enabled - Whether the voice recognition should be active.
 * @param onActivation - The callback function to execute when the activation phrase is detected.
 */
export const useVoiceSOS = (enabled: boolean, onActivation: () => void) => {
  const [isListening, setIsListening] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  const requestAudioPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: "Microphone Permission",
            message: "SafeRoute needs access to your microphone for voice-activated SOS.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) { console.warn(err); return false; }
    }
    return true; // iOS permissions are handled by the library itself or Info.plist
  };

  useEffect(() => {
    // Define listeners
    const onSpeechResults = (e: SpeechResultsEvent) => {
      if (e.value) {
        const spokenText = e.value[0].toLowerCase();
        console.log('Voice recognized:', spokenText);
        if (spokenText.includes(ACTIVATION_PHRASE)) {
          console.log('✅ Activation phrase detected!');
          onActivation();
          // Stop listening after activation to prevent multiple triggers
          stopListening();
        }
      }
    };

    const onSpeechError = (e: SpeechErrorEvent) => {
      console.error('Voice recognition error', e);
      // Restart listening after a short delay if an error occurs
      if (enabled) {
        setTimeout(startListening, 1000);
      }
    };

    const onSpeechEnd = () => {
      // The listener stops automatically on some platforms. Restart it if enabled.
      if (enabled && isListening) {
        startListening();
      }
    };

    // Do not proceed if the native module is not available.
    if (!Voice) {
      return;
    }

    // Register listeners
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;

    // Start or stop listening based on the `enabled` prop
    if (enabled) {
      // Check for permission before starting
      requestAudioPermission().then(permissionGranted => {
        setHasPermission(permissionGranted);
        if (permissionGranted) {
          startListening();
        } else {
          Alert.alert("Permission Denied", "Microphone permission is required for voice-activated SOS.");
        }
      });
    } else {
      stopListening();
    }

    // Cleanup function to remove listeners
    return () => {
      // Ensure Voice and its methods exist before calling them.
      if (Voice && typeof Voice.destroy === 'function') {
        Voice.destroy().catch((e: any) => console.error("Error destroying voice listener on cleanup", e));
      } else {
        Voice?.removeAllListeners();
      }
    };
  }, [enabled, onActivation]); // isListening removed to prevent re-triggering

  const startListening = async () => {
    if (isListening) return; // Prevent multiple starts
    try {
      await Voice.start('en-US');
      console.log("Voice listening started...");
    } catch (e) {
      console.error('Error starting voice recognition', e);
    }
  };

  const stopListening = async () => {
    if (!isListening) return;
    try {
      await Voice.stop();
      console.log("Voice listening stopped.");
    } catch (e) {
      console.error('Error stopping voice recognition', e);
    }
  };
};