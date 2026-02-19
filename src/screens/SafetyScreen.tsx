import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  Vibration,
  Modal,
  FlatList,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  FadeInDown
} from 'react-native-reanimated';

import { ScreenLayout } from '../components/ScreenLayout';
import { GuardianHeader } from '../components/GuardianHeader';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme/guardianTheme';
import { MenuContext } from '../context/MenuContext';

const { width } = Dimensions.get('window');

// Grid Configuration
const GAP = SPACING.m;
const TILE_SIZE = (width - (SPACING.l * 2) - GAP) / 2;

interface Recording {
  uri: string;
  duration: string;
  date: string;
}

export default function SafetyScreen() {
  const navigation = useNavigation<any>();
  const { toggleMenu } = React.useContext(MenuContext);

  // State
  const [sirenPlaying, setSirenPlaying] = useState(false);
  const [flashlightOn, setFlashlightOn] = useState(false);

  // Audio State
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [audioModalVisible, setAudioModalVisible] = useState(false);
  const [playingUri, setPlayingUri] = useState<string | null>(null);

  const [permissionResponse, requestPermission] = useCameraPermissions();

  // Refs
  const soundRef = useRef<Audio.Sound | null>(null);
  const playbackRef = useRef<Audio.Sound | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) soundRef.current.unloadAsync();
      if (playbackRef.current) playbackRef.current.unloadAsync();
      if (recordingRef.current) recordingRef.current.stopAndUnloadAsync();
    };
  }, []);

  // --- 1. Siren Logic ---
  const toggleSiren = async () => {
    try {
      if (sirenPlaying) {
        if (soundRef.current) {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }
        setSirenPlaying(false);
      } else {
        console.log("🔊 LOADING SAFETY SCREEN SIREN: siren.mp3");
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/siren.mp3'),
          { shouldPlay: true, isLooping: true, volume: 1.0 }
        );
        soundRef.current = sound;
        setSirenPlaying(true);
      }
    } catch (error) {
      console.log('Siren Error:', error);
      Alert.alert("Error", "Could not play siren sound.");
      setSirenPlaying(false);
    }
  };

  // --- 2. Flashlight Logic ---
  const toggleFlashlight = async () => {
    if (!permissionResponse?.granted) {
      const { status } = await requestPermission();
      if (status !== 'granted') {
        Alert.alert("Permission", "Camera permission needed for flashlight.");
        return;
      }
    }
    setFlashlightOn(prev => !prev);
    Vibration.vibrate(50);
  };

  // --- 3. Audio Recording Logic ---
  const toggleRecording = async () => {
    try {
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        if (uri) {
          const newRecording: Recording = {
            uri,
            date: new Date().toLocaleTimeString(),
            duration: '00:??',
          };
          setRecordings(prev => [newRecording, ...prev]);
        }
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        recordingRef.current = null;
        setRecording(null); // Keep for UI state if needed, or remove
        setIsRecording(false);
        Alert.alert("Saved", "Audio evidence saved securely.");
      } else {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert("Permission", "Microphone access is required.");
          return;
        }
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        recordingRef.current = newRecording;
        setRecording(newRecording);
        setIsRecording(true);
      }
    } catch (err) {
      console.log("Recording Error", err);
      Alert.alert("Error", "Failed to toggle recording.");
    }
  };

  const playRecording = async (uri: string) => {
    try {
      if (playbackRef.current) {
        await playbackRef.current.unloadAsync();
        playbackRef.current = null;
        setPlayingUri(null);
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );
      playbackRef.current = sound;
      setPlayingUri(uri);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingUri(null);
        }
      });
    } catch (error) {
      Alert.alert("Error", "Could not play audio.");
    }
  };

  // --- 4. Fake Call Logic ---
  const triggerFakeCall = () => {
    navigation.navigate('FakeCall', { callerName: 'Mom' });
  };

  // --- Animation for Active States ---
  const PulseIndicator = ({ color }: { color: string }) => {
    const opacity = useSharedValue(0.3);
    useEffect(() => {
      opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
    }, []);
    const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
    return <Animated.View style={[styles.activeDot, { backgroundColor: color }, style]} />;
  };

  // --- Components ---
  const Tile = ({
    title,
    icon,
    color,
    onPress,
    isActive,
    extraIcon,
    onExtraPress,
    IconComponent,
  }: {
    title: string,
    icon: any,
    color: string,
    onPress: () => void,
    isActive: boolean,
    extraIcon?: string,
    onExtraPress?: () => void,
    IconComponent?: any,
  }) => {
    const IconLib = IconComponent || Ionicons;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={[
          styles.tile,
          isActive && { borderColor: color, borderWidth: 2, backgroundColor: color + '10' }
        ]}
      >
        <LinearGradient
          colors={['#FFFFFF', '#F8FAFC']}
          style={StyleSheet.absoluteFill}
        />

        {isActive && <PulseIndicator color={color} />}

        {extraIcon && (
          <TouchableOpacity style={styles.extraBtn} onPress={onExtraPress}>
            <View style={[styles.extraIconBg, { backgroundColor: color }]}>
              <Ionicons name={extraIcon as any} size={14} color="#FFF" />
            </View>
          </TouchableOpacity>
        )}

        <View style={[styles.iconContainer, { backgroundColor: isActive ? color : COLORS.background }]}>
          <IconLib name={icon} size={32} color={isActive ? '#FFF' : color} />
        </View>
        <View>
          <Text style={[styles.tileTitle, isActive && { color: color }]}>{title}</Text>
          <Text style={styles.tileStatus}>{isActive ? 'ACTIVE' : 'READY'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // --- Specialized Team Card ---
  const TeamCard = ({ onPress }: { onPress: () => void }) => (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
      <View style={styles.teamCard}>
        <LinearGradient
          colors={[COLORS.accentOrange, '#FFF7ED']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.teamIconContainer}>
          <Ionicons name="shield-half" size={28} color="#EA580C" />
        </View>
        <View style={styles.teamContent}>
          <Text style={styles.teamTitle}>Trusted Team</Text>
          <Text style={styles.teamSubtitle}>Manage Emergency Contacts</Text>
        </View>
        <View style={styles.chevronContainer}>
          <Ionicons name="chevron-forward" size={20} color="#EA580C" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenLayout>
      <GuardianHeader
        title="Safety Tools"
        subtitle="Tactical Response Toolkit"
        onMenuPress={toggleMenu}
        onNotificationPress={() => navigation.navigate('Notifications')}
        hasNotifications
      />

      {/* Hidden Camera for Flashlight */}
      {permissionResponse?.granted && (
        <CameraView
          style={{ height: 0, width: 0 }}
          enableTorch={flashlightOn}
          facing="back"
        />
      )}

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gridContainer}>
          {/* Row 1: Team (Full Width) */}
          <View style={styles.row}>
            <Animated.View entering={FadeInDown.delay(100).springify()} style={{ width: '100%' }}>
              <TeamCard onPress={() => navigation.navigate('MyTeam')} />
            </Animated.View>
          </View>

          {/* Row 2: Nearest Police & Hospital */}
          <View style={styles.row}>
            <Animated.View entering={FadeInDown.delay(200).springify()}>
              <Tile
                title="Police"
                icon="police-badge"
                color={COLORS.primary}
                isActive={false}
                onPress={() => navigation.navigate('NearbyPlaces', { type: 'police' })}
                IconComponent={MaterialCommunityIcons}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300).springify()}>
              <Tile
                title="Hospital"
                icon="hospital-box"
                color={COLORS.danger}
                isActive={false}
                onPress={() => navigation.navigate('NearbyPlaces', { type: 'hospital' })}
                IconComponent={MaterialCommunityIcons}
              />
            </Animated.View>
          </View>

          {/* Row 3: Siren & Fake Call */}
          <View style={styles.row}>
            <Animated.View entering={FadeInDown.delay(400).springify()}>
              <Tile
                title="Siren Alert"
                icon="megaphone-outline"
                color={COLORS.danger}
                isActive={sirenPlaying}
                onPress={toggleSiren}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(500).springify()}>
              <Tile
                title="Fake Call"
                icon="call-outline"
                color={COLORS.success}
                isActive={false}
                onPress={triggerFakeCall}
              />
            </Animated.View>
          </View>

          {/* Row 4: Strobe & Evidence Rec */}
          <View style={styles.row}>
            <Animated.View entering={FadeInDown.delay(600).springify()}>
              <Tile
                title="Strobe"
                icon="flashlight-outline"
                color={COLORS.warning}
                isActive={flashlightOn}
                onPress={toggleFlashlight}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(700).springify()}>
              <Tile
                title="Evidence"
                icon="mic-outline"
                color={COLORS.primary}
                isActive={isRecording}
                onPress={toggleRecording}
                extraIcon="list"
                onExtraPress={() => setAudioModalVisible(true)}
              />
            </Animated.View>
          </View>
        </View>

        <View style={styles.footerNote}>
          <Ionicons name="shield-checkmark" size={14} color={COLORS.textTertiary} />
          <Text style={styles.footerText}>Secure & Encrypted Tools</Text>
        </View>
      </ScrollView>

      {/* Audio Recordings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={audioModalVisible}
        onRequestClose={() => setAudioModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Evidence Log</Text>
              <TouchableOpacity onPress={() => setAudioModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={recordings}
              keyExtractor={(item) => item.uri}
              ListEmptyComponent={<Text style={styles.emptyText}>No recordings yet.</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.recordingItem}
                  onPress={() => playRecording(item.uri)}
                >
                  <View style={[styles.recordingIcon, { backgroundColor: COLORS.primaryPale }]}>
                    <Ionicons
                      name={playingUri === item.uri ? "pause" : "play"}
                      size={18}
                      color={COLORS.primary}
                    />
                  </View>
                  <View>
                    <Text style={styles.recordingText}>Audio Evidence</Text>
                    <Text style={styles.recordingSubtext}>{item.date}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    gap: GAP,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: GAP,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE * 1.1,
    borderRadius: RADIUS.l,
    padding: SPACING.m,
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.s,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tileTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  tileStatus: {
    fontSize: 10,
    color: COLORS.textTertiary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  activeDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  extraBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 10,
  },
  extraIconBg: {
    padding: 6,
    borderRadius: RADIUS.full,
  },
  footerNote: {
    marginTop: SPACING.xl,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    color: COLORS.textTertiary,
    fontSize: 12,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    height: '60%',
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.l,
    ...SHADOWS.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.l,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 8,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyText: {
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
  recordingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.m,
  },
  recordingIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 16,
  },
  recordingSubtext: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  // Team Card Styles
  teamCard: {
    width: '100%',
    height: 80,
    borderRadius: RADIUS.l,
    paddingHorizontal: SPACING.m,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    overflow: 'hidden',
    ...SHADOWS.soft,
  },
  teamIconContainer: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: '#FFEDD5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.m,
  },
  teamContent: {
    flex: 1,
  },
  teamTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9A3412',
    marginBottom: 2,
  },
  teamSubtitle: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '500',
  },
  chevronContainer: {
    padding: 4,
  }
});
