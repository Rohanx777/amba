import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Vibration, Pressable, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Shield, X, Radio, MapPin, Mic } from 'lucide-react-native';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../theme/guardianTheme';
import { useSOS } from '../context/SOSContext'; // We'll hook into existing logic later

const { width, height } = Dimensions.get('window');

// Placeholder for full logic integration
export const FloatingSOS: React.FC = () => {
    const { sendSOSAlert, stopSOS, isSOSActive } = useSOS();
    const [isActive, setIsActive] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const [isSent, setIsSent] = useState(false);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isActive && countdown > 0 && !isSent) {
            timer = setInterval(() => {
                setCountdown((prev) => prev - 1);
            }, 1000);
        } else if (isActive && countdown === 0 && !isSent) {
            handleConfirmSOS();
        }
        return () => clearInterval(timer);
    }, [isActive, countdown, isSent]);

    const handlePress = () => {
        setIsActive(true);
        setCountdown(5);
        setIsSent(false);
    };

    const handleCancel = () => {
        setIsActive(false);
        setCountdown(5);
        setIsSent(false);
    };

    const handleConfirmSOS = () => {
        setIsSent(true);
        Vibration.vibrate([500, 200, 500]);
        sendSOSAlert();
    };

    const handleSafe = () => {
        stopSOS();
        handleCancel();
    };

    return (
        <>
            {/* FLOATING TRIGGER */}
            <View style={styles.floatingContainer}>
                {/* Visual Ripple Ring (Static for now, can animate with Reanimated) */}
                <View style={styles.rippleRing} />

                <TouchableOpacity
                    style={styles.sosButton}
                    onPress={handlePress}
                    activeOpacity={0.9}
                >
                    <LinearGradient
                        colors={[COLORS.danger, '#B91C1C']}
                        style={styles.sosGradient}
                    >
                        <Text style={styles.sosText}>SOS</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* FULL SCREEN EMERGENCY MODAL */}
            <Modal
                visible={isActive}
                animationType="slide"
                transparent={true}
                onRequestClose={handleCancel}
            >
                <View style={styles.modalContainer}>
                    <LinearGradient
                        colors={['#EF4444', '#DC2626', '#991B1B', '#F97316']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.fullScreenGradient}
                    >
                        <View style={styles.modalContent}>

                            {/* Header Status */}
                            <View style={styles.statusPill}>
                                <Shield size={12} color="white" fill="white" />
                                <Text style={styles.statusText}>EMERGENCY MODE</Text>
                            </View>

                            {/* Center Content */}
                            <View style={styles.centerContent}>
                                {isSent ? (
                                    <View style={{ alignItems: 'center' }}>
                                        <View style={styles.pulseCircle}>
                                            <Radio size={40} color={COLORS.danger} />
                                        </View>
                                        <Text style={styles.alertTitle}>SOS SENT</Text>
                                        <View style={styles.infoBadge}>
                                            <Text style={styles.infoText}>Help is on the way.</Text>
                                        </View>

                                        <View style={styles.statsRow}>
                                            <View style={styles.statCard}>
                                                <MapPin size={20} color="black" />
                                                <Text style={styles.statLabel}>LOCATION</Text>
                                                <Text style={styles.statValue}>LIVE</Text>
                                            </View>
                                            <View style={styles.statCard}>
                                                <Mic size={20} color="black" />
                                                <Text style={styles.statLabel}>AUDIO</Text>
                                                <Text style={styles.statValue}>REC</Text>
                                            </View>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={styles.preAlertText}>SENDING ALERT IN</Text>
                                        <Text style={styles.countdownText}>{countdown}</Text>
                                        <View style={styles.notifyBadge}>
                                            <Text style={styles.notifyText}>Notifying Contacts & Police</Text>
                                        </View>
                                    </View>
                                )}
                            </View>

                            {/* Bottom Action */}
                            <View style={styles.bottomAction}>
                                {isSent ? (
                                    <TouchableOpacity style={styles.safeButton} onPress={handleSafe}>
                                        <Shield size={20} color="black" fill="black" style={{ marginRight: 8 }} />
                                        <Text style={styles.safeButtonText}>I AM SAFE</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                                        <X size={24} color={COLORS.danger} style={{ marginRight: 8 }} />
                                        <Text style={styles.cancelButtonText}>CANCEL ALERT</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                        </View>
                    </LinearGradient>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    floatingContainer: {
        position: 'absolute',
        bottom: 100, // Adjusted to be above CustomTabBar
        alignSelf: 'center',
        zIndex: 9999, // Ensure it's on top of everything
        elevation: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rippleRing: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.danger,
        opacity: 0.2,
        transform: [{ scale: 1.2 }], // Simple static ripple for now
    },
    sosButton: {
        width: 72,
        height: 72,
        borderRadius: RADIUS.full,
        ...SHADOWS.glow,
        borderWidth: 4,
        borderColor: COLORS.card,
    },
    sosGradient: {
        flex: 1,
        borderRadius: RADIUS.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sosText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 1,
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
    },
    fullScreenGradient: {
        flex: 1,
        padding: SPACING.l,
    },
    modalContent: {
        flex: 1,
        paddingTop: Platform.OS === 'android' ? 40 : 20,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 40,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.s,
        borderRadius: RADIUS.full,
        gap: SPACING.xs,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    statusText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
    },
    centerContent: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    preAlertText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 3,
        marginBottom: SPACING.l,
        opacity: 0.9,
    },
    countdownText: {
        fontSize: 160,
        fontWeight: '900',
        color: 'white',
        lineHeight: 160, // Tighten height
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 10 },
        textShadowRadius: 20,
    },
    notifyBadge: {
        marginTop: SPACING.l,
        backgroundColor: 'rgba(0,0,0,0.2)',
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.s,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    notifyText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 14,
    },
    alertTitle: {
        fontSize: 48,
        fontWeight: '900',
        color: 'white',
        textAlign: 'center',
        marginBottom: SPACING.s,
    },
    pulseCircle: {
        width: 80,
        height: 80,
        backgroundColor: 'white',
        borderRadius: RADIUS.full,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.l,
        ...SHADOWS.card,
    },
    infoBadge: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.s,
        borderRadius: RADIUS.m,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        marginBottom: SPACING.xl,
    },
    infoText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 12,
    },
    statsRow: {
        flexDirection: 'row',
        gap: SPACING.m,
    },
    statCard: {
        backgroundColor: 'white',
        borderRadius: RADIUS.m,
        padding: SPACING.m,
        alignItems: 'center',
        width: 100,
        ...SHADOWS.card,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '900',
        color: 'black',
    },
    bottomAction: {
        width: '100%',
    },
    cancelButton: {
        width: '100%',
        backgroundColor: 'white',
        height: 60,
        borderRadius: RADIUS.full,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.card,
    },
    cancelButtonText: {
        color: COLORS.danger,
        fontSize: 18,
        fontWeight: '900',
    },
    safeButton: {
        width: '100%',
        backgroundColor: 'white',
        height: 60,
        borderRadius: RADIUS.full,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.card,
    },
    safeButtonText: {
        color: 'black',
        fontSize: 18,
        fontWeight: '900',
    },
});
