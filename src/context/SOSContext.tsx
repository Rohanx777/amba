import React, { createContext, useState, useContext, ReactNode, useMemo, useCallback, useRef, useEffect } from 'react';
import { Linking, Alert } from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from './AuthContext';
import { fetchContacts } from '../services/contactsService';
import { supabase } from '../services/supabaseClient';
import * as SMS from 'expo-sms';
import * as sqlite from '../services/sqlite';
import { startRecording, stopRecording } from '../services/audioRecorder';
import { Audio } from 'expo-av';
import * as Battery from 'expo-battery';
import * as FileSystem from 'expo-file-system';
// @ts-ignore – base64-arraybuffer has no bundled types
import { decode } from 'base64-arraybuffer';

export interface SOSContextType {
  shakeEnabled: boolean;
  setShakeEnabled: (enabled: boolean) => void;
  isConfirmingSOS: boolean;
  isSOSActive: boolean;
  noContactsModalVisible: boolean;
  startSOSConfirmation: () => void;
  cancelSOSConfirmation: () => void;
  confirmSOS: () => void;
  stopSOS: () => void;
  sendSOSAlert: () => void;
  closeNoContactsModal: () => void;
  openWhatsApp: () => void;
  // New: Police Status
  alertId: string | null;
  policeStatus: string | null;
}

// Helper removed, imported from services/audioService
import { uploadAudioEvidence } from '../services/audioService';

const SOSContext = createContext<SOSContextType | undefined>(undefined);

export const SOSProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [shakeEnabled, setShakeEnabled] = useState(false);
  const [isConfirmingSOS, setIsConfirmingSOS] = useState(false);
  const [noContactsModalVisible, setNoContactsModalVisible] = useState(false);

  // Real-Time Tracking State
  const [isSOSActive, setIsSOSActive] = useState(false);
  const [alertId, setAlertIdState] = useState<string | null>(null);
  const alertIdRef = useRef<string | null>(null);

  const setAlertId = (id: string | null) => {
    alertIdRef.current = id;
    setAlertIdState(id);
  };
  const [policeStatus, setPoliceStatus] = useState<string | null>(null);

  // Realtime subscription for police updates
  useEffect(() => {
    if (!alertId) return;

    if (__DEV__) console.log("👮 Subscribing to police updates for alert:", alertId);

    // 1. Initial Fetch
    supabase
      .from('police_responses')
      .select('action, created_at')
      .eq('alert_id', alertId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setPoliceStatus(data.action);
      });

    // 2. Subscribe to new responses AND alert status changes
    const channel = supabase.channel(`alert-updates-${alertId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'police_responses',
          filter: `alert_id=eq.${alertId}`
        },
        (payload) => {
          if (__DEV__) console.log("👮 New Police Action:", payload.new.action);
          setPoliceStatus(payload.new.action);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'active_alerts',
          filter: `id=eq.${alertId}`
        },
        (payload) => {
          if (payload.new.status === 'RESOLVED') {
            setPoliceStatus('RESOLVED');
            // Optionally stop SOS here too, but let's keep it manual or auto-close via UI
            Alert.alert("Safe!", "Police have marked this incident as resolved.");
            stopSOS();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [alertId]);

  // Ref to hold the location subscription
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  // Audio Recording Refs
  const recordingRef = useRef<Audio.Recording | null>(null);
  const autoStopTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup watcher on unmount
  useEffect(() => {
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  const startSOSConfirmation = useCallback(async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to use this feature.');
      return;
    }
    if (isConfirmingSOS || isSOSActive || noContactsModalVisible) return;

    try {
      const contacts = await fetchContacts(user.id);
      if (contacts && contacts.length > 0) {
        setIsConfirmingSOS(true);
      } else {
        setNoContactsModalVisible(true);
      }
    } catch (error: any) {
      console.error('Failed to fetch contacts for SOS:', error);
      Alert.alert('Error', 'Could not verify emergency contacts. Please try again.');
    }
  }, [isConfirmingSOS, isSOSActive, noContactsModalVisible, user]);

  const cancelSOSConfirmation = useCallback(() => setIsConfirmingSOS(false), []);

  const confirmSOS = useCallback(async () => {
    setIsConfirmingSOS(false);

    if (!user) {
      sendSOSAlert();
      return;
    }

    try {
      // --- 1. GPS Pre-Check ---
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        Alert.alert("GPS Disabled", "Please enable GPS/Location Services to use SOS Tracking.");
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "Location permission is required for SOS.");
        return;
      }

      console.log('🚨 SOS CONFIRMED - STARTING LIVE TRACKING 🚨');
      setIsSOSActive(true);

      // --- START AUDIO RECORDING ---
      console.log("🎙️ DEBUG: Starting Audio Recorder...");
      const recording = await startRecording();

      if (!recording) {
        console.error("❌ CRITICAL: Recording failed to start (returned null). Permission issue?");
        Alert.alert("Debug", "Recording FAILED to start.");
      } else {
        console.log("✅ Recording started successfully object:", recording ? "OK" : "NULL");
        // Alert.alert("Debug", "Recording Started!"); // Optional, maybe too noisy
      }
      recordingRef.current = recording;

      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);

      autoStopTimerRef.current = setTimeout(async () => {
        console.log("⏳ Auto-stopping audio recording (1 min limit)...");
        const uri = await stopRecording(recordingRef.current);
        recordingRef.current = null;
        if (uri) {
          // Upload to Supabase Storage first
          let isUploaded = 0;
          try {
            await uploadAudioEvidence(user!.id, null, uri, '60s (Auto)');
            isUploaded = 1;
            console.log("🎙️ Audio uploaded successfully (Auto-stop)");
          } catch (e) {
            console.log('Audio upload failed (auto-stop), saved locally:', e);
          }

          // Save to SQLite
          await sqlite.saveAudioLog({
            id: Date.now().toString(),
            uri,
            timestamp: Date.now(),
            duration: '60s (Auto)',
            uploaded: isUploaded
          });
          console.log("🎙️ Evidence Saved Locally (Auto-Stop)");
        }
      }, 60000);

      // --- 2. Supabase Setup ---
      const alertDocId = user.id;
      setAlertId(alertDocId);

      // --- 3. Initial Location ---
      const initialLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const initialBattery = await Battery.getBatteryLevelAsync();
      const initialSpeed = initialLocation.coords.speed ?? 0;

      // Reverse geocode for address snapshot
      let addressSnapshot: string | null = null;
      try {
        const [geo] = await Location.reverseGeocodeAsync({
          latitude: initialLocation.coords.latitude,
          longitude: initialLocation.coords.longitude,
        });
        if (geo) {
          addressSnapshot = [geo.name, geo.street, geo.district, geo.city, geo.region].filter(Boolean).join(', ');
        }
      } catch (e) {
        console.warn('Reverse geocode failed:', e);
      }

      // Delete any existing alert record for this user to ensure we generate a NEW ID
      // This prevents old police_responses from being linked to the new session
      await supabase.from('active_alerts').delete().eq('user_id', user.id);

      const { error: insertError } = await supabase
        .from('active_alerts')
        .insert({
          user_id: user.id,
          status: 'ACTIVE',
          user_email: user.email,
          user_name: user.fullName || 'Unknown',
          started_at: new Date().toISOString(),
          latitude: initialLocation.coords.latitude,
          longitude: initialLocation.coords.longitude,
          heading: initialLocation.coords.heading,
          speed: initialSpeed,
          battery: initialBattery ?? -1,
          address_snapshot: addressSnapshot,
          last_updated: new Date().toISOString(),
        });

      if (insertError) {
        console.error("SOS Insert Error:", insertError);
        // Fallback? If insert fails, we might still want to try upsert or just throw
        throw insertError;
      }

      // Get the alert ID for future updates
      const { data: alertData } = await supabase
        .from('active_alerts')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const dbAlertId = alertData?.id;
      if (dbAlertId) {
        console.log("✅ Alert ID Assigned:", dbAlertId);
        setAlertId(dbAlertId);
      }

      // --- 4. Start Real-Time Watcher ---
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
          timeInterval: 5000
        },
        async (newLoc) => {
          try {
            const batteryLevel = await Battery.getBatteryLevelAsync();
            const safeBattery = batteryLevel ?? -1;
            const safeSpeed = newLoc.coords.speed ?? 0;

            console.log("📡 Telemetry Update -> Bat:", safeBattery, "Speed:", safeSpeed);

            if (dbAlertId) {
              // Reverse geocode for address snapshot update
              let updatedAddress: string | null = null;
              try {
                const [geo] = await Location.reverseGeocodeAsync({
                  latitude: newLoc.coords.latitude,
                  longitude: newLoc.coords.longitude,
                });
                if (geo) {
                  updatedAddress = [geo.name, geo.street, geo.district, geo.city, geo.region].filter(Boolean).join(', ');
                }
              } catch (_e) { /* geocode not critical */ }

              await supabase
                .from('active_alerts')
                .update({
                  latitude: newLoc.coords.latitude,
                  longitude: newLoc.coords.longitude,
                  heading: newLoc.coords.heading,
                  speed: safeSpeed,
                  battery: safeBattery,
                  ...(updatedAddress ? { address_snapshot: updatedAddress } : {}),
                  last_updated: new Date().toISOString(),
                })
                .eq('id', dbAlertId);
            }

            console.log("✅ SUPABASE WRITE SUCCESS - Battery:", safeBattery);
            console.log('📍 Location updated to Supabase');
          } catch (err) {
            console.log('Error updating location trace:', err);
          }
        }
      );

      // --- INSERTED SMS LOGIC ---
      try {
        const savedContacts = await sqlite.getEmergencyContacts(user.id);
        console.log("📋 DEBUG: Contacts Found:", savedContacts.length);

        const trackingLink = `https://zqeiwdoydwdkdylcomuy.supabase.co`;
        const message = `🚨 HELP! I am in danger. My user ID: ${user.id}`;

        const isSMSAvailable = await SMS.isAvailableAsync();

        if (isSMSAvailable && savedContacts.length > 0) {
          const phoneNumbers = savedContacts.map(c => c.phone);
          console.log("✅ Opening SMS for:", phoneNumbers);
          const { result } = await SMS.sendSMSAsync(phoneNumbers, message);
          console.log("SMS Result:", result);
        } else {
          console.log("⚠️ Fallback to WhatsApp");
          await Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`);
        }
      } catch (err) {
        console.error("SOS Logic Error:", err);
        Linking.openURL(`whatsapp://send?text=HELP`);
      }

    } catch (error: any) {
      console.error("SOS Tracking Error:", error);
      Alert.alert("Tracking Error", error.message || "Unknown error occurred.");
      setIsSOSActive(false);
    }

  }, [user]);

  const stopSOS = useCallback(async () => {
    console.log("🛑 STOP SOS FUNCTION CALLED");
    if (!user) {
      console.warn("🛑 Stop SOS aborted: No user");
      return;
    }

    try {
      // 1. Stop Watcher
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }

      // Stop Audio Recording if active
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }

      let audioUri: string | null = null;
      if (recordingRef.current) {
        console.log("🛑 Stopping Audio Recording...");
        try {
          audioUri = await stopRecording(recordingRef.current);
          console.log("✅ Audio URI obtained:", audioUri);
          if (audioUri) {
            Alert.alert("Debug", "Audio Saved: " + audioUri.split('/').pop());
          } else {
            Alert.alert("Debug", "Audio Save FAILED (URI null)");
          }
        } catch (err) {
          console.error("❌ Error stopping recording:", err);
        }
        recordingRef.current = null;

        if (audioUri) {
          // 5. Upload audio evidence to Supabase Storage
          let isUploaded = 0;
          try {
            // Use the persistent alert ID from REF to avoid stale closures
            const targetAlertId = alertIdRef.current;
            console.log(`🎙️ [DEBUG] Attempting Upload. UserID: ${user.id}, AlertID: ${targetAlertId}`);

            if (!targetAlertId) {
              console.warn("⚠️ [DEBUG] Alert ID is MISSING during upload. Evidence will be unlinked (or linked to user only).");
            }

            await uploadAudioEvidence(user.id, targetAlertId, audioUri, 'Manual Stop');
            isUploaded = 1;
            console.log("🎙️ Audio uploaded successfully (Manual Stop)");
          } catch (e) {
            console.log('Audio upload failed, saved locally:', e);
          }

          await sqlite.saveAudioLog({
            id: Date.now().toString(),
            uri: audioUri,
            timestamp: Date.now(),
            duration: 'Manual Stop',
            uploaded: isUploaded
          });
          console.log("🎙️ Evidence Saved Locally");
        }
      }

      // 2. Fetch active alert data before resolving (for archiving)
      let alertSnapshot: any = null;
      try {
        const { data } = await supabase
          .from('active_alerts')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'ACTIVE')
          .single();
        alertSnapshot = data;
      } catch (e) {
        console.log('Could not fetch alert snapshot for archiving:', e);
      }

      // 3. Update Supabase Status → RESOLVED
      await supabase
        .from('active_alerts')
        .update({
          status: 'RESOLVED',
          resolved_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE');

      // 4. Archive to alert_history
      let historyId: string | null = null;
      try {
        const contactCount = await sqlite.getEmergencyContacts(user.id).then(c => c.length).catch(() => 0);
        const { data: historyData } = await supabase
          .from('alert_history')
          .insert({
            user_id: user.id,
            alert_type: 'SOS_SENT',
            status: 'RESOLVED',
            latitude: alertSnapshot?.latitude ?? null,
            longitude: alertSnapshot?.longitude ?? null,
            contacts_notified: contactCount,
            started_at: alertSnapshot?.started_at ?? new Date().toISOString(),
            resolved_at: new Date().toISOString(),
            is_false_alarm: false,
          })
          .select('id')
          .single();
        historyId = historyData?.id ?? null;
        console.log('📋 Alert archived to history:', historyId);
      } catch (e) {
        console.log('Could not archive alert to history:', e);
      }

      // 6. Reset State
      setIsSOSActive(false);
      setAlertId(null);
      Alert.alert("SOS Ended", "Live tracking has been stopped.");

    } catch (error) {
      console.error("Error stopping SOS:", error);
      setIsSOSActive(false);
    }
  }, [user]);

  const closeNoContactsModal = useCallback(() => setNoContactsModalVisible(false), []);

  const sendSOSAlert = useCallback(async () => {
    console.log("🚀 STARTING SOS ALERT PROCESS...");

    try {
      // 1. Get Fresh Contacts directly from DB
      const uid = user?.id;
      const savedContacts = uid ? await sqlite.getEmergencyContacts(uid) : [];
      console.log("📋 Found Contacts in DB:", savedContacts.length);

      // 2. Get Location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Error", "Location permission needed for SOS.");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

      // 3. Generate Link
      const trackingLink = uid
        ? `https://zqeiwdoydwdkdylcomuy.supabase.co`
        : `http://maps.google.com/?q=${loc.coords.latitude},${loc.coords.longitude}`;

      console.log("\n🔗 ---------------------------------------------------");
      console.log("🔗 GENERATED SOS LINK:", trackingLink);
      console.log("🔗 ---------------------------------------------------\n");

      const message = `🚨 EMERGENCY! I need help.\n\nMy live location is being tracked. User ID: ${uid || 'unknown'}`;

      // 4. DECISION TIME: SMS vs WhatsApp
      const isSMSAvailable = await SMS.isAvailableAsync();

      if (isSMSAvailable && savedContacts.length > 0) {
        console.log("✅ Sending via SMS to:", savedContacts.map(c => c.phone));
        const phoneNumbers = savedContacts.map(c => c.phone);
        const { result } = await SMS.sendSMSAsync(phoneNumbers, message);
        console.log("SMS Result:", result);
      } else {
        console.log("⚠️ SMS Unavailable or No Contacts. Falling back to WhatsApp.");
        Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`);
      }

    } catch (error) {
      console.error("❌ SOS Error:", error);
      Alert.alert("Error", "Failed to send alert.");
    }
  }, [user]);

  const openWhatsApp = useCallback(async () => {
    console.log("🟢 Opening WhatsApp SOS...");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Error", "Location permission needed for SOS.");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const uid = user?.id;

      const trackingLink = uid
        ? `https://zqeiwdoydwdkdylcomuy.supabase.co`
        : `http://maps.google.com/?q=${loc.coords.latitude},${loc.coords.longitude}`;

      const message = `🚨 EMERGENCY! I need help.\n\nMy live location is being tracked. User ID: ${uid || 'unknown'}`;

      Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`);

    } catch (error) {
      console.error("❌ WhatsApp SOS Error:", error);
      Linking.openURL(`whatsapp://send?text=HELP`);
    }
  }, [user]);

  const value = useMemo(() => ({
    shakeEnabled,
    setShakeEnabled,
    isConfirmingSOS,
    isSOSActive,
    noContactsModalVisible,
    startSOSConfirmation,
    cancelSOSConfirmation,
    confirmSOS,
    stopSOS,
    sendSOSAlert,
    closeNoContactsModal,
    openWhatsApp,
    alertId,
    policeStatus,
  }), [
    shakeEnabled,
    setShakeEnabled,
    isConfirmingSOS,
    isSOSActive,
    noContactsModalVisible,
    startSOSConfirmation,
    cancelSOSConfirmation,
    confirmSOS,
    stopSOS,
    sendSOSAlert,
    closeNoContactsModal,
    openWhatsApp,
    alertId,
    policeStatus,
  ]);

  return <SOSContext.Provider value={value}>{children}</SOSContext.Provider>;
};

export const useSOS = (): SOSContextType => {
  const context = useContext(SOSContext);
  if (context === undefined) {
    throw new Error('useSOS must be used within a SOSProvider');
  }
  return context;
};