import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Menu, Bell } from 'lucide-react-native';
import { COLORS, SPACING, SHADOWS, RADIUS } from '../theme/guardianTheme';
import { LinearGradient } from 'expo-linear-gradient';

interface GuardianHeaderProps {
    title?: string;
    subtitle?: string;
    onMenuPress?: () => void;
    onNotificationPress?: () => void;
    hasNotifications?: boolean;
    isBack?: boolean; // Added for back button support
    onBackPress?: () => void;
}

export const GuardianHeader: React.FC<GuardianHeaderProps> = ({
    title,
    subtitle,
    onMenuPress,
    onNotificationPress,
    hasNotifications = false,
    isBack = false,
    onBackPress
}) => {
    return (
        <View style={styles.container}>
            {/* Brand/Title Section */}
            <View style={styles.brandContainer}>
                {isBack ? (
                    <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
                        <Menu size={24} color={COLORS.text} style={{ transform: [{ rotate: '180deg' }] }} />
                        {/* Note using Menu temporarily as back icon surrogate until Lucide import fixed or verified */}
                    </TouchableOpacity>
                ) : (
                    <LinearGradient
                        colors={[COLORS.primary, COLORS.primaryLight]}
                        style={styles.logoContainer}
                    >
                        <Text style={styles.logoText}>A</Text>
                    </LinearGradient>
                )}

                <View>
                    <Text style={styles.brandTitle}>{title || "AMBA"}</Text>
                    <Text style={styles.brandSubtitle}>{subtitle || "PROTOCOL"}</Text>
                </View>
            </View>

            {/* Actions Section */}
            <View style={styles.actionsContainer}>
                <TouchableOpacity
                    onPress={onNotificationPress}
                    style={[styles.iconButton, styles.notificationButton]}
                >
                    <Bell size={20} color={COLORS.textSecondary} />
                    {hasNotifications && <View style={styles.badge} />}
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={onMenuPress}
                    style={[styles.iconButton, styles.menuButton]}
                >
                    <Menu size={20} color={COLORS.card} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.l,
        paddingVertical: SPACING.m,
        paddingTop: Platform.OS === 'android' ? SPACING.xl : SPACING.m, // Adjust for status bar
    },
    brandContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.s,
    },
    logoContainer: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.full,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.soft,
    },
    logoText: {
        color: COLORS.card,
        fontSize: 20,
        fontWeight: '800',
    },
    brandTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        lineHeight: 22,
    },
    brandSubtitle: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.textTertiary,
        letterSpacing: 1.5,
    },
    actionsContainer: {
        flexDirection: 'row',
        gap: SPACING.s,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.full,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.soft,
    },
    notificationButton: {
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    menuButton: {
        backgroundColor: COLORS.text,
        ...SHADOWS.glow, // Add a subtle glow to the primary action
    },
    badge: {
        position: 'absolute',
        top: 8,
        right: 10,
        width: 8,
        height: 8,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.danger,
        borderWidth: 1.5,
        borderColor: COLORS.card,
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    }
});
