import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Zap, MapPin, BellRing, Lock, Heart, ChevronRight, Activity } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ScreenLayout } from '../components/ScreenLayout';
import { GuardianHeader } from '../components/GuardianHeader';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme/guardianTheme';
import MOCK_VOLUNTEERS from '../data/MockVolunteers';
import { MenuContext } from '../context/MenuContext';
import { useSOS } from '../context/SOSContext';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const HomeScreen = () => {
    const navigation = useNavigation<any>();
    const { toggleMenu } = useContext(MenuContext);
    const { sendSOSAlert } = useSOS();
    const { user } = useAuth();

    // Mock Data
    const nearbyVolunteers = MOCK_VOLUNTEERS.length + 9; // Mock total
    const userName = user?.fullName || "Guardian"; // Dynamic Name

    const QuickAction = ({ icon: Icon, color, label, subLabel, onPress, gradientColors }: any) => (
        <TouchableOpacity
            style={styles.actionCard}
            onPress={onPress}
            activeOpacity={0.9}
        >
            <LinearGradient
                colors={gradientColors}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
                <Icon size={24} color={color} />
            </View>
            <Text style={styles.actionLabel}>{label}</Text>
            <Text style={styles.actionSubLabel}>{subLabel}</Text>
        </TouchableOpacity>
    );

    return (
        <ScreenLayout noPadding>
            <GuardianHeader
                onNotificationPress={() => navigation.navigate('Notifications')}
                onMenuPress={toggleMenu}
                hasNotifications
            />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Welcome Section */}
                <View style={styles.headerSection}>
                    <View style={styles.avatarContainer}>
                        <LinearGradient
                            colors={[COLORS.background, '#E2E8F0']}
                            style={styles.avatarPlaceholder}
                        >
                            <Text style={styles.avatarText}>{userName[0]}</Text>
                        </LinearGradient>
                    </View>
                    <View>
                        <Text style={styles.welcomeText}>Welcome Back</Text>
                        <Text style={styles.userName}>{userName}</Text>
                    </View>
                </View>

                {/* Hero Card: Protection Status */}
                <View style={[styles.heroCard, SHADOWS.card]}>
                    <View style={styles.heroContent}>
                        <View style={styles.statusPill}>
                            <View style={styles.pingDot}>
                                <View style={styles.pingInner} />
                                <View style={styles.pingRing} />
                            </View>
                            <Text style={styles.statusText}>ACTIVE</Text>
                        </View>
                        <Text style={styles.heroTitle}>You are{'\n'}Protected</Text>
                        <Text style={styles.heroSubtitle}>
                            {nearbyVolunteers} Guardians in your vicinity
                        </Text>
                    </View>

                    {/* Abstract Shield Graphic */}
                    <View style={styles.shieldGraphic}>
                        <Image
                            source={{ uri: "https://img.freepik.com/free-vector/young-woman-white_25030-39527.jpg" }}
                            style={styles.heroImage}
                            resizeMode="contain"
                        />
                        <LinearGradient
                            colors={['transparent', 'rgba(255,255,255,0.8)']}
                            style={StyleSheet.absoluteFill}
                        />
                    </View>
                </View>

                {/* Quick Actions Grid */}
                <View style={styles.sectionHeader}>
                    <Zap size={16} color={COLORS.warning} fill={COLORS.warning} />
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                </View>

                <View style={styles.gridContainer}>
                    <QuickAction
                        icon={MapPin}
                        color={COLORS.primary}
                        label="Safe Route"
                        subLabel="AI Navigation"
                        gradientColors={['#EFF6FF', '#DBEAFE']}
                        onPress={() => navigation.navigate('Navigate')}
                    />
                    <QuickAction
                        icon={BellRing}
                        color={COLORS.danger}
                        label="Siren"
                        subLabel="Loud Alarm"
                        gradientColors={['#FEF2F2', '#FEE2E2']}
                        onPress={() => sendSOSAlert()} // Trigger SOS
                    />
                    <QuickAction
                        icon={Lock}
                        color={COLORS.textSecondary}
                        label="Evidence"
                        subLabel="Blockchain"
                        gradientColors={['#F8FAFC', '#F1F5F9']}
                        onPress={() => navigation.navigate('Profile', { screen: 'AudioEvidence' })} // Navigate to Evidence
                    />
                    <QuickAction
                        icon={Heart}
                        color="#DB2777"
                        label="Wellness"
                        subLabel="AI Support"
                        gradientColors={['#FDF2F8', '#FCE7F3']}
                        onPress={() => navigation.navigate('Chat')} // Navigate to Chat
                    />
                </View>

                {/* Community Insight Card */}
                <TouchableOpacity style={styles.communityCard} activeOpacity={0.95}>
                    <LinearGradient
                        colors={[COLORS.primary, '#4F46E5']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.communityContent}>
                        <View style={styles.communityHeader}>
                            <Activity size={16} color="#BFDBFE" />
                            <Text style={styles.communityTitle}>Community Insight</Text>
                        </View>
                        <Text style={styles.communityText}>
                            Sector 18 Market reporting higher safety score today.
                        </Text>
                        <View style={styles.communityAction}>
                            <Text style={styles.communityBtnText}>View Heatmap</Text>
                            <ChevronRight size={14} color="white" />
                        </View>
                    </View>
                    <MapPin
                        size={120}
                        color="white"
                        style={styles.communityIconBg}
                    />
                </TouchableOpacity>

                {/* Padding for Bottom Nav */}
                <View style={{ height: 100 }} />
            </ScrollView>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: SPACING.l,
        paddingBottom: SPACING.xl,
    },
    headerSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.l,
        marginTop: SPACING.s,
    },
    avatarContainer: {
        marginRight: SPACING.m,
        ...SHADOWS.soft,
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.full,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: COLORS.card,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textSecondary,
    },
    welcomeText: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    userName: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.text,
    },

    // Hero Card
    heroCard: {
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.xl,
        height: 180,
        flexDirection: 'row',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'white',
        marginBottom: SPACING.xl,
    },
    heroContent: {
        flex: 1,
        padding: SPACING.l,
        zIndex: 10,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.successBg,
        paddingHorizontal: SPACING.s,
        paddingVertical: 4,
        borderRadius: RADIUS.full,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: '#DCFCE7',
        marginBottom: SPACING.m,
    },
    pingDot: {
        width: 12,
        height: 12,
        marginRight: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pingInner: {
        width: 6,
        height: 6,
        backgroundColor: COLORS.success,
        borderRadius: RADIUS.full,
        zIndex: 2,
    },
    pingRing: {
        position: 'absolute',
        width: 12,
        height: 12,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.success,
        opacity: 0.3,
        transform: [{ scale: 1.5 }],
    },
    statusText: {
        color: COLORS.success,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    heroTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.text,
        lineHeight: 28,
        marginBottom: SPACING.s,
    },
    heroSubtitle: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    shieldGraphic: {
        width: 140,
        height: '100%',
        marginRight: -20,
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },

    // Quick Actions
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.m,
        gap: SPACING.xs,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.text,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.m,
        marginBottom: SPACING.xl,
    },
    actionCard: {
        width: (width - (SPACING.l * 2) - SPACING.m) / 2,
        height: 140,
        borderRadius: RADIUS.l,
        padding: SPACING.m,
        overflow: 'hidden',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.m,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.m,
    },
    actionLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 2,
    },
    actionSubLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },

    // Community Card
    communityCard: {
        borderRadius: RADIUS.l,
        padding: SPACING.l,
        overflow: 'hidden',
        minHeight: 120,
        ...SHADOWS.glow,
    },
    communityContent: {
        zIndex: 10,
    },
    communityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.s,
        marginBottom: SPACING.xs,
    },
    communityTitle: {
        color: 'white',
        fontWeight: '700',
        fontSize: 16,
    },
    communityText: {
        color: '#DBEAFE',
        fontSize: 12,
        lineHeight: 18,
        marginBottom: SPACING.m,
        maxWidth: '80%',
    },
    communityAction: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignSelf: 'flex-start',
        paddingHorizontal: SPACING.m,
        paddingVertical: 6,
        borderRadius: RADIUS.m,
        gap: 4,
    },
    communityBtnText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '700',
    },
    communityIconBg: {
        position: 'absolute',
        bottom: -20,
        right: -20,
        opacity: 0.1,
        transform: [{ rotate: '-15deg' }],
    },
});

export default HomeScreen;
