import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as Device from 'expo-device';
import { ScreenLayout } from '../components/ScreenLayout';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme/guardianTheme';

const { width, height } = Dimensions.get('window');

// 🎵 RELIABLE RINGTONE URLS (Google Cloud Storage)
const RINGTONES: Record<string, string> = {
    'Apple': 'https://codeskulptor-demos.commondatastorage.googleapis.com/GalaxyInvaders/theme_01.mp3',
    'Samsung': 'https://commondatastorage.googleapis.com/codeskulptor-assets/week7-brrring.m4a',
    'Xiaomi': 'https://commondatastorage.googleapis.com/codeskulptor-assets/week7-brrring.m4a',
    'Redmi': 'https://commondatastorage.googleapis.com/codeskulptor-assets/week7-brrring.m4a',
    'default': 'https://commondatastorage.googleapis.com/codeskulptor-assets/week7-brrring.m4a'
};

export default function FakeCallScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    // @ts-ignore
    const callerName = route.params?.callerName || 'Papa';

    const [callState, setCallState] = useState<'incoming' | 'active'>('incoming');
    const [seconds, setSeconds] = useState(0);
    const soundRef = useRef<Audio.Sound | null>(null);

    // --- Audio Logic ---
    useEffect(() => {
        let soundObject: Audio.Sound | null = null;

        const setupAudioAndPlay = async () => {
            if (callState !== 'incoming') return;

            try {
                const brand = Device.brand || 'default';
                console.log("📱 Detected Brand:", brand);

                let ringtoneUrl = RINGTONES['default'];
                for (const key of Object.keys(RINGTONES)) {
                    if (brand.toLowerCase().includes(key.toLowerCase())) {
                        ringtoneUrl = RINGTONES[key];
                        break;
                    }
                }

                console.log(`🎵 Loading Ringtone: ${ringtoneUrl}`);

                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    playsInSilentModeIOS: true,
                    shouldDuckAndroid: true,
                    playThroughEarpieceAndroid: false,
                    staysActiveInBackground: true,
                });

                const { sound } = await Audio.Sound.createAsync(
                    { uri: ringtoneUrl },
                    { isLooping: true, shouldPlay: true }
                );

                console.log("✅ Ringtone Playing!");
                soundObject = sound;
                soundRef.current = sound;

            } catch (error) {
                console.error("❌ Ringtone Error:", error);
            }
        };

        setupAudioAndPlay();

        return () => {
            stopRingtone();
        };
    }, [callState]);

    const stopRingtone = async () => {
        if (soundRef.current) {
            console.log('🔇 Stopping Ringtone');
            try {
                await soundRef.current.stopAsync();
                await soundRef.current.unloadAsync();
            } catch (e) {
                console.log("Error unloading sound", e);
            }
            soundRef.current = null;
        }
    };

    // --- Timer Logic ---
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (callState === 'active') {
            interval = setInterval(() => {
                setSeconds(s => s + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [callState]);

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleAccept = () => {
        stopRingtone();
        setCallState('active');
    };

    const handleDecline = () => {
        stopRingtone();
        navigation.goBack();
    };

    return (
        <ScreenLayout>
            <View style={styles.content}>
                <View style={styles.topSection}>
                    <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={60} color={COLORS.textTertiary} />
                    </View>
                    <Text style={styles.callerName}>{callerName}</Text>
                    <Text style={styles.callStatus}>
                        {callState === 'incoming' ? 'Incoming Call...' : formatTime(seconds)}
                    </Text>
                </View>

                <View style={styles.bottomSection}>
                    {callState === 'incoming' ? (
                        <View style={styles.actionsRow}>
                            <TouchableOpacity style={styles.actionBtn} onPress={handleDecline}>
                                <View style={[styles.circleBtn, { backgroundColor: COLORS.danger }]}>
                                    <Ionicons name="call" size={32} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
                                </View>
                                <Text style={styles.btnLabel}>Decline</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionBtn} onPress={handleAccept}>
                                <View style={[styles.circleBtn, { backgroundColor: COLORS.success }]}>
                                    <Ionicons name="call" size={32} color="#FFF" />
                                </View>
                                <Text style={styles.btnLabel}>Accept</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.activeActions}>
                            <View style={{ marginBottom: 40, alignItems: 'center' }}>
                                <Ionicons name="mic-outline" size={32} color={COLORS.text} style={{ opacity: 0.5, marginBottom: 10 }} />
                                <Text style={{ color: COLORS.textSecondary }}>Mute</Text>
                            </View>

                            <TouchableOpacity style={styles.actionBtn} onPress={handleDecline}>
                                <View style={[styles.circleBtn, { backgroundColor: COLORS.danger, width: 80, height: 80 }]}>
                                    <Ionicons name="call" size={40} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
        paddingVertical: 80,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    topSection: {
        alignItems: 'center',
    },
    avatarPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: COLORS.card,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.l,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.soft,
    },
    callerName: {
        fontSize: 36,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 10,
    },
    callStatus: {
        fontSize: 18,
        color: COLORS.textSecondary,
        letterSpacing: 1,
    },
    bottomSection: {
        width: '100%',
        paddingBottom: 40,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        paddingHorizontal: 40,
    },
    activeActions: {
        alignItems: 'center',
    },
    actionBtn: {
        alignItems: 'center',
    },
    circleBtn: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        ...SHADOWS.card,
    },
    btnLabel: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: '500',
    }
});
