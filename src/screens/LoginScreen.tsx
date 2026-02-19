import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Dimensions,
    Platform,

} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeIn, FadeOut } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme/guardianTheme';
import { useAuth } from '../context/AuthContext';


const { width, height } = Dimensions.get('window');

export const LoginScreen = () => {
    const navigation = useNavigation();
    const { login, loading } = useAuth();


    return (
        <View style={styles.container}>
            {/* Background Image */}
            <Image
                source={{ uri: "https://i.pinimg.com/736x/58/be/27/58be27d17ee226929d056e740dd3723f.jpg" }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
            />

            {/* Gradient Overlays */}
            <LinearGradient
                colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.1)', 'rgba(255,255,255,0.9)', '#FFFFFF']}
                style={[StyleSheet.absoluteFillObject, { top: '30%' }]}
            />
            <LinearGradient
                colors={['#FFFFFF', 'rgba(255,255,255,0)']}
                style={[StyleSheet.absoluteFillObject, { height: '20%' }]}
            />


            {/* Content Container */}
            <View style={styles.content}>

                {/* Brand Section - Moved Up */}
                <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.brandSection}>
                    <Text style={styles.brandTitle}>Amba</Text>
                    <Text style={styles.brandSubtitle}>the guardian protocol</Text>
                </Animated.View>

                {/* Bottom Section */}
                <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.bottomSection}>
                    <View style={{ width: '100%', alignItems: 'center', gap: 15 }}>
                        {/* Get Started Button */}
                        <TouchableOpacity
                            // @ts-ignore
                            onPress={() => navigation.navigate('Signup')}
                            style={styles.primaryBtn}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={['#ff9a60', '#FF4F00']}
                                style={styles.gradientBtn}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                            >
                                {/* Shine Effect Overlay - Fixed Glitch by using absolute positioning inside correctly */}
                                <View style={styles.shine} />
                                <Text style={styles.primaryBtnText}>Get Started</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Log In Button */}
                        <TouchableOpacity
                            // @ts-ignore
                            onPress={() => navigation.navigate('SignIn')}
                            style={styles.secondaryBtn}
                        >
                            <BlurView intensity={20} tint="light" style={styles.blurBtn}>
                                <Text style={styles.secondaryBtnText}>Log In</Text>
                            </BlurView>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>

        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        paddingVertical: 60,
        paddingHorizontal: 24,
    },
    brandSection: {
        alignItems: 'center',
        marginTop: 60, // Moved to the very top
    },
    brandTitle: {
        fontSize: 92,
        fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'serif',
        color: COLORS.text,
        lineHeight: 100,
        textAlign: 'center',
        fontWeight: Platform.OS === 'android' ? 'bold' : 'normal',
    },
    brandSubtitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textSecondary,
        letterSpacing: 2,
        textTransform: 'lowercase',
        marginTop: -10,
    },
    bottomSection: {
        width: '100%',
        alignItems: 'center',
        paddingBottom: 40,
    },

    // Buttons
    primaryBtn: {
        width: '100%',
        height: 64,
        borderRadius: 40,
        ...SHADOWS.glow,
        shadowColor: '#FF4F00',
        elevation: 8,
        overflow: 'hidden',
    },
    gradientBtn: {
        flex: 1,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    shine: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '45%',
        backgroundColor: 'rgba(255,255,255,0.25)',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
    },
    primaryBtnText: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },

    secondaryBtn: {
        width: '100%',
        height: 60,
        borderRadius: 40,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.soft,
        backgroundColor: 'rgba(255,255,255,0.7)',
    },
    blurBtn: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    secondaryBtnText: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: '600',
    },


});
