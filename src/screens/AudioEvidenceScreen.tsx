import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as sqlite from '../services/sqlite';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenLayout } from '../components/ScreenLayout';
import { GuardianHeader } from '../components/GuardianHeader';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme/guardianTheme';

import { useAuth } from '../context/AuthContext'; // Need user ID
import { uploadAudioEvidence } from '../services/audioService';

// Define the shape of our audio log
interface AudioLog {
    id: string;
    uri: string;
    timestamp: number;
    duration: string;
    uploaded?: number; // 0 or 1
}

export default function AudioEvidenceScreen() {
    const navigation = useNavigation();
    const { user } = useAuth(); // Get current user
    const [logs, setLogs] = useState<AudioLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [uploadingId, setUploadingId] = useState<string | null>(null); // Track uploading state
    const soundRef = useRef<Audio.Sound | null>(null);

    useEffect(() => {
        loadLogs();

        // Cleanup sound on unmount
        return () => {
            if (soundRef.current) {
                soundRef.current.unloadAsync();
            }
        };
    }, []);

    const loadLogs = async () => {
        try {
            setLoading(true);
            const data = await sqlite.getAudioLogs();
            setLogs(data);
        } catch (error) {
            console.error("Failed to load audio logs:", error);
            Alert.alert("Error", "Could not load evidence logs.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            "Delete Evidence",
            "Are you sure you want to delete this recording? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            if (playingId === id) {
                                await stopAudio();
                            }
                            await sqlite.deleteAudioLog(id);
                            setLogs(prev => prev.filter(log => log.id !== id));
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete recording.");
                        }
                    }
                }
            ]
        );
    };

    const handleRetryUpload = async (item: AudioLog) => {
        if (!user) {
            Alert.alert("Login Required", "You must be logged in to upload evidence.");
            return;
        }

        try {
            setUploadingId(item.id);
            // Try upload
            await uploadAudioEvidence(user.id, null, item.uri, item.duration);

            // Mark as uploaded in DB
            await sqlite.markAudioUploaded(item.id);

            // Update local state
            setLogs(prev => prev.map(log => log.id === item.id ? { ...log, uploaded: 1 } : log));

            Alert.alert("Success", "Audio evidence uploaded to secure vault.");
        } catch (error) {
            Alert.alert("Upload Failed", "Could not upload audio. Please check your connection.");
        } finally {
            setUploadingId(null);
        }
    };

    const handlePlayStop = async (item: AudioLog) => {
        try {
            // 1. If this file is already playing, stop it.
            if (playingId === item.id) {
                await stopAudio();
                return;
            }

            // 2. If another file is playing, stop it first.
            if (soundRef.current) {
                await soundRef.current.unloadAsync();
                soundRef.current = null;
                setPlayingId(null);
            }

            // 3. Play the new file
            console.log("▶️ Loading sound:", item.uri);
            const { sound } = await Audio.Sound.createAsync(
                { uri: item.uri },
                { shouldPlay: true }
            );

            soundRef.current = sound;
            setPlayingId(item.id);

            // 4. Handle playback finish
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    setPlayingId(null);
                    soundRef.current = null;
                }
            });

        } catch (error) {
            console.error("Playback Error:", error);
            Alert.alert("Playback Failed", "Could not play this audio file. It may have been deleted locally.");
            setPlayingId(null);
        }
    };

    const stopAudio = async () => {
        if (soundRef.current) {
            await soundRef.current.stopAsync();
            await soundRef.current.unloadAsync();
            soundRef.current = null;
        }
        setPlayingId(null);
    };

    const formatTimestamp = (ts: number) => {
        return new Date(ts).toLocaleString('en-US', {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const renderItem = ({ item, index }: { item: AudioLog, index: number }) => {
        const isPlaying = playingId === item.id;
        const isUploading = uploadingId === item.id;
        const isUploaded = item.uploaded === 1;

        return (
            <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
                <View style={[styles.card, isPlaying && styles.playingCard]}>
                    <TouchableOpacity
                        style={[styles.playButton, isPlaying && styles.activePlayBtn]}
                        onPress={() => handlePlayStop(item)}
                    >
                        <Ionicons
                            name={isPlaying ? "stop" : "play"}
                            size={20}
                            color={isPlaying ? "#FFF" : COLORS.primary}
                        />
                    </TouchableOpacity>

                    <View style={styles.infoContainer}>
                        <Text style={styles.dateText}>{formatTimestamp(item.timestamp)}</Text>
                        <View style={styles.metaRow}>
                            {isPlaying && (
                                <View style={styles.recordingIndicator}>
                                    <View style={styles.pulseDot} />
                                    <Text style={styles.playingText}>Playing...</Text>
                                </View>
                            )}
                            <Text style={styles.durationText}>{item.duration}</Text>
                        </View>
                    </View>

                    {/* Retry Upload Button */}
                    {!isUploaded && (
                        <TouchableOpacity
                            style={[styles.actionButton, { marginRight: 8, backgroundColor: COLORS.warning + '20' }]}
                            onPress={() => handleRetryUpload(item)}
                            disabled={isUploading}
                        >
                            {isUploading ? (
                                <ActivityIndicator size="small" color={COLORS.warning} />
                            ) : (
                                <Ionicons name="cloud-upload-outline" size={20} color={COLORS.warning} />
                            )}
                        </TouchableOpacity>
                    )}

                    {/* Verified Icon */}
                    {isUploaded && (
                        <View style={[styles.actionButton, { marginRight: 8, backgroundColor: COLORS.success + '20' }]}>
                            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDelete(item.id)}
                    >
                        <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                    </TouchableOpacity>
                </View>
            </Animated.View>
        );
    };

    return (
        <ScreenLayout>
            <GuardianHeader
                title="Evidence Vault"
                subtitle="Secure Audio Recordings"
                isBack
                onBackPress={() => navigation.goBack()}
            />

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={logs}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconCircle}>
                                <Ionicons name="mic-off-outline" size={48} color={COLORS.textTertiary} />
                            </View>
                            <Text style={styles.emptyText}>No recordings found</Text>
                            <Text style={styles.emptySubtext}>
                                Emergency audio logs will appear here automatically.
                            </Text>
                        </View>
                    }
                />
            )}
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    listContent: {
        padding: SPACING.m,
        paddingBottom: 100,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.m,
        marginBottom: SPACING.m,
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.l,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.card,
    },
    playingCard: {
        borderColor: COLORS.primaryLight,
        backgroundColor: COLORS.card, // or a very subtle tint
    },
    playButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primary + '15', // Light primary bg
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.m,
    },
    activePlayBtn: {
        backgroundColor: COLORS.primary,
        ...SHADOWS.glow,
    },
    infoContainer: {
        flex: 1,
    },
    dateText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    durationText: {
        fontSize: 12,
        color: COLORS.textTertiary,
        fontFamily: 'System', // fall back
        fontWeight: '600',
    },
    recordingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    pulseDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.primary,
    },
    playingText: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: '600',
    },
    deleteButton: {
        padding: SPACING.s,
        marginLeft: SPACING.s,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: SPACING.xxl * 1.5,
        paddingHorizontal: SPACING.xl,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.m,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    emptyText: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: SPACING.xs,
    },
    emptySubtext: {
        color: COLORS.textTertiary,
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    actionButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.card,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
});
