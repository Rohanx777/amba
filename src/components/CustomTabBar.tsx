import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Home, Map, Shield, User, MessageCircle } from 'lucide-react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS, RADIUS, SPACING } from '../theme/guardianTheme';
import { useSOS } from '../context/SOSContext';

const { width } = Dimensions.get('window');

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
    const { startSOSConfirmation } = useSOS();

    return (
        <View style={styles.wrapper}>
            <View style={styles.container}>
                {/* Background Pill */}
                <View style={[styles.pillContainer, SHADOWS.card]}>
                    {/* Top Border Gradient Line */}
                    <LinearGradient
                        colors={['transparent', COLORS.primary, 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.topBorderLine}
                    />

                    <View style={styles.tabRow}>
                        {state.routes.map((route, index) => {
                            const { options } = descriptors[route.key];
                            const isFocused = state.index === index;

                            const onPress = () => {
                                const event = navigation.emit({
                                    type: 'tabPress',
                                    target: route.key,
                                    canPreventDefault: true,
                                });

                                if (!isFocused && !event.defaultPrevented) {
                                    navigation.navigate(route.name);
                                }
                            };

                            // Icon Mapping
                            let IconComponent = Home;
                            if (route.name === 'Home') IconComponent = Home;
                            else if (route.name === 'Navigate') IconComponent = Map;
                            else if (route.name === 'Safety') IconComponent = Shield;
                            else if (route.name === 'Chat') IconComponent = MessageCircle;

                            // Insert SOS Button in the middle (between index 1 and 2)
                            if (index === 2) {
                                return (
                                    <React.Fragment key="sos-spacer">
                                        {/* Spacer for SOS Button */}
                                        <View style={styles.sosSpacer} />
                                        <TabButton
                                            key={route.key}
                                            index={index}
                                            isFocused={isFocused}
                                            onPress={onPress}
                                            IconComponent={IconComponent}
                                            label={route.name}
                                            options={options}
                                        />
                                    </React.Fragment>
                                );
                            }

                            return (
                                <TabButton
                                    key={route.key}
                                    index={index}
                                    isFocused={isFocused}
                                    onPress={onPress}
                                    IconComponent={IconComponent}
                                    label={route.name}
                                    options={options}
                                />
                            );
                        })}
                    </View>
                </View>

                {/* Floating SOS Button */}
                <TouchableOpacity
                    style={[styles.sosButton, SHADOWS.glow]}
                    onPress={startSOSConfirmation}
                    activeOpacity={0.9}
                >
                    <LinearGradient
                        colors={['#EF4444', '#DC2626']}
                        style={styles.sosGradient}
                    >
                        <Text style={styles.sosText}>SOS</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const TabButton = ({ index, isFocused, onPress, IconComponent, label, options }: any) => {
    return (
        <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            style={styles.tabButton}
            activeOpacity={0.8}
        >
            <TabItem
                icon={IconComponent}
                label={label}
                focused={isFocused}
            />
        </TouchableOpacity>
    );
}

const TabItem = ({ icon: Icon, label, focused }: { icon: any, label: string, focused: boolean }) => {
    // Animation for icon movement
    const animatedIconStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: withSpring(focused ? -2 : 0) }],
        };
    });

    return (
        <View style={styles.itemContainer}>
            <Animated.View style={[
                styles.iconWrapper,
                animatedIconStyle,
                focused && styles.activeIconWrapper
            ]}>
                <Icon
                    size={24}
                    color={focused ? COLORS.primary : COLORS.textSecondary}
                    strokeWidth={focused ? 2.5 : 2}
                />
            </Animated.View>

            <Text style={[styles.label, focused && styles.activeLabel]}>{label}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingBottom: SPACING.l, // Lift up from bottom
        pointerEvents: 'box-none', // Allow touches through wrapper if needed
    },
    container: {
        width: width - (SPACING.m * 2), // Full width minus margins
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    pillContainer: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: RADIUS.full,
        height: 70, // Fixed height for pill
        justifyContent: 'center',
    },
    topBorderLine: {
        position: 'absolute',
        top: 0,
        left: '20%',
        right: '20%',
        height: 2,
        opacity: 0.5,
    },
    tabRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.s,
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    sosSpacer: {
        width: 70, // Space for the SOS button
    },
    sosButton: {
        position: 'absolute',
        bottom: 20, // Protrude upwards
        width: 72,
        height: 72,
        borderRadius: 36,
        padding: 4, // Border effect
        backgroundColor: '#FFF', // White ring
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
    },
    sosGradient: {
        flex: 1,
        width: '100%',
        height: '100%',
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sosText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 1,
    },
    itemContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    iconWrapper: {
        marginBottom: 4,
    },
    activeIconWrapper: {
        // Removed background for cleaner look, strictly following design
    },
    label: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.textTertiary,
    },
    activeLabel: {
        color: COLORS.primary,
        fontWeight: '800',
    }
});

export default CustomTabBar;
