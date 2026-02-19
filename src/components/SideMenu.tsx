import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    interpolate,
    Extrapolation,
    runOnJS
} from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { X, User, Settings, Users, Phone, HelpCircle, LogOut, FileText, Shield, Bell } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme/guardianTheme';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.8;

interface SideMenuProps {
    isVisible: boolean;
    onClose: () => void;
}

export const SideMenu: React.FC<SideMenuProps> = ({ isVisible, onClose }) => {
    const navigation = useNavigation();
    const { user, logout } = useAuth();
    const translateX = useSharedValue(-DRAWER_WIDTH);
    const backdropOpacity = useSharedValue(0);

    useEffect(() => {
        if (isVisible) {
            // Smoother spring for opening
            translateX.value = withSpring(0, {
                damping: 15,
                stiffness: 70,
                mass: 0.8,
                overshootClamping: false
            });
            backdropOpacity.value = withTiming(1, { duration: 300 });
        } else {
            // Snappy exit
            translateX.value = withTiming(-DRAWER_WIDTH, { duration: 250 });
            backdropOpacity.value = withTiming(0, { duration: 250 });
        }
    }, [isVisible]);

    const handleNavigation = (screen: string) => {
        onClose();
        // Small delay to allow drawer to close before navigating
        setTimeout(() => {
            // @ts-ignore
            navigation.navigate(screen);
        }, 300);
    };

    const handleLogout = async () => {
        onClose();
        setTimeout(async () => {
            await logout();
            // @ts-ignore
            navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
            } as any);
        }, 300);
    };

    const drawerStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }],
        };
    });

    const backdropStyle = useAnimatedStyle(() => {
        return {
            opacity: backdropOpacity.value,
        };
    });

    if (!isVisible && translateX.value === -DRAWER_WIDTH) {
        return null;
    }

    return (
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999, pointerEvents: isVisible ? 'auto' : 'none' }]}>
            {/* Backdrop */}
            <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    onPress={onClose}
                    activeOpacity={1}
                >
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' }} />
                </TouchableOpacity>
            </Animated.View>

            {/* Drawer */}
            <Animated.View style={[styles.drawer, drawerStyle]}>
                {/* Decorative Background Blob */}
                <View style={styles.blob} />

                <View style={styles.content}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.menuTitle}>Menu</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* User Profile Card */}
                    <View style={styles.profileCard}>
                        <LinearGradient
                            colors={[COLORS.primaryPale, 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                            </Text>
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={styles.userName}>{user?.fullName || 'User'}</Text>
                            <Text style={styles.userPhone}>{user?.email || ''}</Text>
                        </View>
                    </View>

                    {/* Navigation Items */}
                    <ScrollView
                        style={styles.navScroll}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 20 }}
                    >
                        <MenuItem icon={User} label="My Profile" onPress={() => handleNavigation('Profile')} active={false} />
                        <MenuItem icon={Bell} label="Notifications" onPress={() => handleNavigation('Notifications')} active={false} />
                        <MenuItem icon={Users} label="Trusted Contacts" onPress={() => handleNavigation('Contacts')} active={false} />
                        {/* <MenuItem icon={Phone} label="Emergency Numbers" onPress={() => handleNavigation('Tools')} active={false} /> */}
                        {/* <MenuItem icon={FileText} label="Evidence Locker" onPress={() => handleNavigation('Evidence')} active={false} /> */}
                        {/* <MenuItem icon={Shield} label="Safety Tools" onPress={() => handleNavigation('Tools')} active={false} /> */}
                        <MenuItem icon={Shield} label="Fake Call" onPress={() => handleNavigation('FakeCall')} active={false} />

                        <View style={styles.divider} />

                        {/* <MenuItem icon={Settings} label="Settings" onPress={() => handleNavigation('Settings')} active={false} /> */}
                        {/* <MenuItem icon={HelpCircle} label="Help & Support" onPress={() => handleNavigation('Help')} active={false} /> */}
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                            <LogOut size={20} color={COLORS.danger} style={{ marginRight: 10 }} />
                            <Text style={styles.logoutText}>Log Out</Text>
                        </TouchableOpacity>
                        <Text style={styles.versionText}>AMBA Protocol v2.0</Text>
                    </View>
                </View>
            </Animated.View>
        </View>
    );
};

interface MenuItemProps {
    icon: any;
    label: string;
    onPress: () => void;
    active: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon: Icon, label, onPress, active }) => (
    <TouchableOpacity
        onPress={onPress}
        style={[styles.menuItem, active && styles.menuItemActive]}
    >
        <Icon
            size={20}
            color={active ? '#FFF' : COLORS.textSecondary}
            style={{ marginRight: 12 }}
        />
        <Text style={[styles.menuItemText, active && styles.menuItemTextActive]}>{label}</Text>
        {active && <View style={styles.activeIndicator} />}
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    drawer: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: DRAWER_WIDTH,
        backgroundColor: COLORS.card,
        borderTopRightRadius: 40,
        borderBottomRightRadius: 40,
        overflow: 'hidden',
        ...SHADOWS.card, // Ensure this shadow exists in your theme
    },
    blob: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: COLORS.primaryPale,
        opacity: 0.6,
    },
    content: {
        flex: 1,
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 40, // Safe Area padding
    },
    menuTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.text,
    },
    closeBtn: {
        padding: 8,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.background,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.l,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 32,
        overflow: 'hidden',
        ...SHADOWS.soft,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.primary, // Gradient approximation
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    avatarText: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    profileInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    userPhone: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    navScroll: {
        flex: 1,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: RADIUS.m,
        marginBottom: 4,
    },
    menuItemActive: {
        backgroundColor: COLORS.text,
        ...SHADOWS.soft,
    },
    menuItemText: {
        fontSize: 16,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    menuItemTextActive: {
        color: '#FFF',
        fontWeight: '600',
    },
    activeIndicator: {
        position: 'absolute',
        right: 0,
        width: 4,
        height: 24,
        backgroundColor: COLORS.primary,
        borderTopLeftRadius: 2,
        borderBottomLeftRadius: 2,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 16,
        marginHorizontal: 8,
    },
    footer: {
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.dangerBg,
        padding: 14,
        borderRadius: RADIUS.m,
    },
    logoutText: {
        color: COLORS.danger,
        fontWeight: '600',
        fontSize: 16,
    },
    versionText: {
        textAlign: 'center',
        fontSize: 10,
        color: COLORS.textTertiary,
        marginTop: 16,
        letterSpacing: 1,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
});
