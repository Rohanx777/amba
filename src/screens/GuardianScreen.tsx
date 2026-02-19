import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Linking
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from '../services/supabaseClient';
import { Battery, Zap, Navigation, MapPin, Signal } from 'lucide-react-native';
import { RealtimeChannel } from '@supabase/supabase-js';
import { ScreenLayout } from '../components/ScreenLayout';
import { GuardianHeader } from '../components/GuardianHeader';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme/guardianTheme';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// Tactical Silver Map Style - Compatible with Light Theme
const SILVER_MAP_STYLE = [
    { "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] },
    { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f5f5f5" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
    { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#dadada" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#c9c9c9" }] }
];

const GuardianScreen = ({ navigation }: any) => {
    const [targetUid, setTargetUid] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [childData, setChildData] = useState<any>(null);
    const [myLocation, setMyLocation] = useState<Location.LocationObjectCoords | null>(null);
    const mapRef = useRef<MapView>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);

    // 1. Get Parent Location on Mount
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required to track distance.');
                return;
            }
            let location = await Location.getCurrentPositionAsync({});
            setMyLocation(location.coords);
        })();

        // Cleanup channel on unmount
        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, []);

    // 2. Connect & Subscribe to Telemetry via Supabase Realtime
    const handleConnect = async () => {
        if (!targetUid.trim()) {
            Alert.alert("Input Error", "Please enter a valid User ID.");
            return;
        }

        try {
            // First, fetch the current alert data
            const { data: initialData, error: fetchError } = await supabase
                .from('active_alerts')
                .select('*')
                .eq('user_id', targetUid.trim())
                .eq('status', 'ACTIVE')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (fetchError || !initialData) {
                Alert.alert("Target Not Found", "No active alert found for this User ID.");
                return;
            }

            // Set initial data
            setChildData({
                ...initialData,
                coordinates: {
                    latitude: initialData.latitude,
                    longitude: initialData.longitude,
                    heading: initialData.heading,
                    speed: initialData.speed,
                },
            });
            setIsConnected(true);

            // Subscribe to realtime updates
            const channel = supabase
                .channel(`guardian-${targetUid.trim()}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'active_alerts',
                        filter: `user_id=eq.${targetUid.trim()}`,
                    },
                    (payload) => {
                        const newData = payload.new as any;
                        setChildData({
                            ...newData,
                            coordinates: {
                                latitude: newData.latitude,
                                longitude: newData.longitude,
                                heading: newData.heading,
                                speed: newData.speed,
                            },
                        });
                    }
                )
                .subscribe();

            channelRef.current = channel;
        } catch (error: any) {
            Alert.alert("Connection Error", error.message);
        }
    };

    // 3. Format Telemetry
    const getBatteryColor = (level: number) => {
        if (level < 0) return COLORS.textTertiary;
        if (level <= 0.2) return COLORS.danger;
        return COLORS.success;
    };

    const formatTime = (timestamp: any) => {
        if (!timestamp) return 'Offline';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // 4. Handle External Navigation
    const handleNavigation = () => {
        if (!childData?.coordinates) return;

        const { latitude, longitude } = childData.coordinates;
        const scheme = Platform.select({ ios: 'maps://?daddr=', android: 'google.navigation:q=' });
        const url = `${scheme}${latitude},${longitude}`;

        Linking.openURL(url);
    };

    // --- RENDER: CONNECTION SCREEN ---
    if (!isConnected) {
        return (
            <ScreenLayout>
                <GuardianHeader title="Guardian Center" subtitle="Tactical Overwatch" isBack onBackPress={() => navigation.goBack()} />

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.loginContent}>
                    <View style={styles.iconContainer}>
                        <Signal size={64} color={COLORS.primary} />
                    </View>

                    <Text style={styles.title}>GUARDIAN<Text style={styles.titleBold}>LINK</Text></Text>
                    <Text style={styles.subtitle}>Enter Target ID to Establish Uplink</Text>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Target User ID"
                            placeholderTextColor={COLORS.textTertiary}
                            value={targetUid}
                            onChangeText={setTargetUid}
                            autoCapitalize="none"
                        />
                    </View>

                    <TouchableOpacity style={styles.connectButton} onPress={handleConnect}>
                        <LinearGradient
                            colors={[COLORS.primary, COLORS.primaryLight]}
                            style={styles.connectGradient}
                        >
                            <Text style={styles.connectButtonText}>CONNECT TO TARGET</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </ScreenLayout>
        );
    }

    // --- RENDER: TACTICAL MAP ---
    const childCoords = childData?.coordinates;
    const batteryLevel = childData?.battery ?? -1;
    const speed = childData?.speed ? (childData.speed * 3.6).toFixed(1) : '0.0';

    return (
        <View style={styles.mapContainer}>
            {/* Header Overlay */}
            <View style={styles.headerOverlay}>
                <GuardianHeader title="Live Tracking" subtitle="Active Monitoring" isBack onBackPress={() => setIsConnected(false)} />
            </View>

            <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                customMapStyle={SILVER_MAP_STYLE}
                initialRegion={{
                    latitude: childCoords?.latitude || 20.5937,
                    longitude: childCoords?.longitude || 78.9629,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
                showsUserLocation={true}
            >
                {/* Child Marker */}
                {childCoords && (
                    <Marker
                        coordinate={{ latitude: childCoords.latitude, longitude: childCoords.longitude }}
                        title="Target"
                        description={`Speed: ${speed} km/h`}
                    >
                        <View style={styles.markerContainer}>
                            <View style={[styles.pulseRing, { borderColor: COLORS.danger }]} />
                            <View style={[styles.markerDot, { backgroundColor: COLORS.danger }]} />
                        </View>
                    </Marker>
                )}

                {/* Route Line */}
                {myLocation && childCoords && (
                    <Polyline
                        coordinates={[
                            { latitude: myLocation.latitude, longitude: myLocation.longitude },
                            { latitude: childCoords.latitude, longitude: childCoords.longitude }
                        ]}
                        strokeColor={COLORS.primary}
                        strokeWidth={4}
                        lineDashPattern={[10, 5]}
                    />
                )}
            </MapView>

            {/* Floating Tactical HUD */}
            <View style={styles.hudContainer}>
                <View style={styles.hudCard}>
                    {/* Header */}
                    <View style={styles.hudHeader}>
                        <View style={styles.statusBadge}>
                            <View style={[styles.liveDot, { backgroundColor: COLORS.success }]} />
                            <Text style={[styles.statusText, { color: COLORS.success }]}>LIVE TRACKING</Text>
                        </View>
                        <Text style={styles.lastUpdated}>{formatTime(childData?.last_updated)}</Text>
                    </View>

                    {/* Telemetry Grid */}
                    <View style={styles.statsGrid}>
                        {/* Battery */}
                        <View style={styles.statItem}>
                            <View style={styles.statLabelRow}>
                                <Battery size={16} color={getBatteryColor(batteryLevel)} />
                                <Text style={styles.statLabel}>BATTERY</Text>
                            </View>
                            <Text style={[styles.statValue, { color: getBatteryColor(batteryLevel) }]}>
                                {batteryLevel >= 0 ? `${Math.round(batteryLevel * 100)}%` : '--'}
                            </Text>
                        </View>

                        <View style={styles.divider} />

                        {/* Speed */}
                        <View style={styles.statItem}>
                            <View style={styles.statLabelRow}>
                                <Zap size={16} color={COLORS.primary} />
                                <Text style={styles.statLabel}>SPEED</Text>
                            </View>
                            <Text style={styles.statValue}>
                                {speed} <Text style={styles.unit}>km/h</Text>
                            </Text>
                        </View>
                    </View>

                    <View style={styles.locationRow}>
                        <MapPin size={16} color={COLORS.textTertiary} />
                        <Text style={styles.coordText}>
                            {childCoords?.latitude.toFixed(5)}, {childCoords?.longitude.toFixed(5)}
                        </Text>
                    </View>

                    {/* Navigation Button */}
                    <TouchableOpacity style={styles.navButton} onPress={handleNavigation}>
                        <LinearGradient
                            colors={[COLORS.primary, COLORS.primaryLight]}
                            style={styles.navGradient}
                        >
                            <Navigation size={20} color="#fff" fill="#fff" />
                            <Text style={styles.navButtonText}>NAVIGATE TO TARGET</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    loginContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.l },
    iconContainer: {
        marginBottom: SPACING.l,
        backgroundColor: COLORS.background,
        padding: SPACING.l,
        borderRadius: RADIUS.full,
        ...SHADOWS.soft
    },
    title: { fontSize: 28, color: COLORS.text, fontWeight: '300', letterSpacing: 2 },
    titleBold: { fontWeight: '900', color: COLORS.primary },
    subtitle: { color: COLORS.textSecondary, marginTop: 8, textTransform: 'uppercase', letterSpacing: 1, fontSize: 12 },

    inputContainer: { width: '100%', marginTop: SPACING.xl },
    input: {
        backgroundColor: COLORS.card,
        color: COLORS.text,
        padding: SPACING.m,
        borderRadius: RADIUS.m,
        borderWidth: 1,
        borderColor: COLORS.border,
        textAlign: 'center',
        fontSize: 18,
        letterSpacing: 1,
        ...SHADOWS.soft,
    },

    connectButton: {
        marginTop: SPACING.l,
        width: '100%',
        ...SHADOWS.glow,
    },
    connectGradient: {
        paddingVertical: SPACING.m,
        paddingHorizontal: SPACING.xl,
        borderRadius: RADIUS.m,
        alignItems: 'center',
    },
    connectButtonText: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 1 },

    mapContainer: { flex: 1 },
    map: { width: '100%', height: '100%' },
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },

    markerContainer: { alignItems: 'center', justifyContent: 'center' },
    markerDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#fff' },
    pulseRing: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        opacity: 0.5,
    },

    hudContainer: {
        position: 'absolute',
        bottom: SPACING.xl,
        left: SPACING.m,
        right: SPACING.m,
        alignItems: 'center',
    },
    hudCard: {
        width: '100%',
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.l,
        padding: SPACING.m,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.card,
    },
    hudHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.m },
    statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.s },
    liveDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    statusText: { fontWeight: 'bold', fontSize: 10, letterSpacing: 0.5 },
    lastUpdated: { color: COLORS.textTertiary, fontSize: 12 },

    statsGrid: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
    statItem: { alignItems: 'center' },
    statLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 4 },
    statLabel: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    statValue: { color: COLORS.text, fontSize: 24, fontWeight: '800' },
    unit: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
    divider: { width: 1, height: 40, backgroundColor: COLORS.border },

    locationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: SPACING.m, gap: 6 },
    coordText: { color: COLORS.textTertiary, fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

    navButton: {
        marginTop: SPACING.m,
        ...SHADOWS.soft,
    },
    navGradient: {
        paddingVertical: SPACING.m,
        borderRadius: RADIUS.m,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    navButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
});

export default GuardianScreen;
