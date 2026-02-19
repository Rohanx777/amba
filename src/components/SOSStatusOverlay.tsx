import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Vibration, Platform } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
    FadeInDown,
    SlideOutDown
} from 'react-native-reanimated';
import { useSOS } from '../context/SOSContext';
import { useTheme } from '../context/ThemeContext';
import { Shield, AlertTriangle, Truck, MapPin, CheckCircle } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

// Status Map for UI
const STATUS_CONFIG: Record<string, { label: string, color: string, icon: any }> = {
    'DISPATCHED': { label: 'POLICE DISPATCHED', color: '#F59E0B', icon: Shield },
    'EN_ROUTE': { label: 'OFFICER EN ROUTE', color: '#3B82F6', icon: Truck },
    'ON_SCENE': { label: 'POLICE ON SCENE', color: '#8B5CF6', icon: MapPin },
    'RESOLVED': { label: 'INCIDENT RESOLVED', color: '#10B981', icon: CheckCircle },
    'ACTIVE': { label: 'SEARCHING FOR OFFICERS', color: '#EF4444', icon: AlertTriangle },
};

export default function SOSStatusOverlay() {
    const { isSOSActive, stopSOS, policeStatus } = useSOS();
    const { colors } = useTheme();

    // Animation for pulse
    const pulseOpacity = useSharedValue(0.3);

    useEffect(() => {
        if (isSOSActive) {
            pulseOpacity.value = withRepeat(
                withTiming(0.8, { duration: 1000 }),
                -1,
                true
            );
        }
    }, [isSOSActive]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: pulseOpacity.value,
    }));

    if (!isSOSActive) return null;

    const currentStatus = policeStatus && STATUS_CONFIG[policeStatus]
        ? STATUS_CONFIG[policeStatus]
        : STATUS_CONFIG['ACTIVE'];

    const Icon = currentStatus.icon;

    return (
        <Animated.View
            entering={FadeInDown.springify()}
            exiting={SlideOutDown}
            style={styles.container}
        >
            {/* Background Pulse */}
            <Animated.View style={[styles.pulseBackground, { backgroundColor: currentStatus.color }, animatedStyle]} />

            <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
                <View style={styles.headerRow}>
                    <View style={[styles.iconContainer, { backgroundColor: `${currentStatus.color}33` }]}>
                        <Icon size={24} color={currentStatus.color} />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={[styles.statusLabel, { color: currentStatus.color }]}>
                            {currentStatus.label}
                        </Text>
                        <Text style={styles.subText}>
                            Live tracking active. Help is on the way.
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.stopButton}
                    onPress={() => {
                        console.log("🔘 SOSStatusOverlay: 'I AM SAFE' BUTTON PRESSED");
                        Vibration.vibrate(50);
                        stopSOS();
                    }}
                >
                    <Text style={styles.stopText}>I AM SAFE (STOP)</Text>
                </TouchableOpacity>
            </BlurView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 30, // Above bottom tabs if visible, or just bottom
        left: 20,
        right: 20,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 20,
        zIndex: 9999, // Ensure it's on top
    },
    pulseBackground: {
        ...StyleSheet.absoluteFillObject,
    },
    blurContainer: {
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    statusLabel: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 4,
    },
    subText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
    },
    stopButton: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    stopText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 1,
    },
});
