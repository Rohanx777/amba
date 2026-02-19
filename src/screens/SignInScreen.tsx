import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { ChevronRight, ArrowLeft } from 'lucide-react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme/guardianTheme';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

// Custom Icons for Social Login (Reusing from SignupScreen for consistency)
const GoogleIcon = () => (
    <View style={styles.iconBox}>
        <Text style={{ fontSize: 18 }}>G</Text>
    </View>
);
const FacebookIcon = () => (
    <View style={styles.iconBox}>
        <Text style={{ fontSize: 18, color: '#1877F2', fontWeight: 'bold' }}>f</Text>
    </View>
);

export const SignInScreen = () => {
    const navigation = useNavigation();
    const { login, loginWithGoogle, loginWithFacebook, loading } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }
        try {
            await login(email, password);
            // Navigation handled automatically by App.tsx state change
            // navigation.replace('Main');
        } catch (e: any) {
            Alert.alert("Login Failed", e.message);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={COLORS.text} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Logo / Icon */}
                <Animated.View entering={FadeInUp.delay(100)} style={styles.logoContainer}>
                    <View style={styles.logoBox}>
                        <LinearGradient
                            colors={[COLORS.text, '#333']}
                            style={StyleSheet.absoluteFillObject}
                        />
                        <Text style={styles.logoText}>L</Text>
                    </View>
                </Animated.View>

                {/* Title */}
                <Animated.View entering={FadeInUp.delay(200)} style={styles.titleSection}>
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Sign in to continue to Amba.</Text>
                </Animated.View>

                {/* Social Login */}
                <Animated.View entering={FadeInUp.delay(300)} style={styles.socialSection}>
                    <View style={styles.socialRow}>
                        <TouchableOpacity style={styles.socialBtn} onPress={loginWithGoogle}>
                            <GoogleIcon />
                            <Text style={styles.socialBtnText}>Google</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.socialBtn} onPress={loginWithFacebook}>
                            <FacebookIcon />
                            <Text style={styles.socialBtnText}>Facebook</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.dividerBox}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>OR VIA EMAIL</Text>
                        <View style={styles.dividerLine} />
                    </View>
                </Animated.View>

                {/* Form */}
                <Animated.View entering={FadeInUp.delay(400)} style={styles.formSection}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>EMAIL</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="name@example.com"
                            placeholderTextColor={COLORS.textTertiary}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>PASSWORD</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor={COLORS.textTertiary}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                        <TouchableOpacity style={{ alignSelf: 'flex-end', marginTop: 8 }}>
                            <Text style={styles.forgotPassword}>Forgot Password?</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* FAB / Submit Button */}
                <Animated.View entering={FadeInUp.delay(500)} style={styles.actionSection}>
                    <TouchableOpacity
                        style={styles.submitBtn}
                        onPress={handleLogin}
                        activeOpacity={0.9}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <Text style={styles.submitBtnText}>Sign In</Text>
                                <ChevronRight size={20} color="#FFF" />
                            </>
                        )}
                    </TouchableOpacity>
                </Animated.View>

                {/* Signup Link */}
                <TouchableOpacity onPress={() => navigation.navigate('Signup')} style={styles.loginLinkBox}>
                    <Text style={styles.loginLinkText}>Don't have an account? Sign Up</Text>
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 24,
        marginBottom: 20,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    logoBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.soft,
    },
    logoText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
    },
    titleSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    socialSection: {
        width: '100%',
        marginBottom: 32,
    },
    socialRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    socialBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: RADIUS.m,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: '#FFF',
    },
    iconBox: {
        marginRight: 8,
    },
    socialBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    dividerBox: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.border,
    },
    dividerText: {
        paddingHorizontal: 16,
        fontSize: 10,
        fontWeight: 'bold',
        color: COLORS.textTertiary,
        letterSpacing: 1,
    },
    formSection: {
        width: '100%',
        gap: 24,
        marginBottom: 40,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 10,
        fontWeight: 'bold',
        color: COLORS.text,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    input: {
        borderBottomWidth: 2,
        borderBottomColor: COLORS.border,
        paddingVertical: 12,
        fontSize: 18,
        fontWeight: '500',
        color: COLORS.text,
    },
    forgotPassword: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '600',
    },
    actionSection: {
        width: '100%',
        marginBottom: 24,
    },
    submitBtn: {
        width: '100%',
        backgroundColor: '#000',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: RADIUS.full,
        ...SHADOWS.card,
    },
    submitBtnText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
        marginRight: 8,
    },
    loginLinkBox: {
        alignItems: 'center',
    },
    loginLinkText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
});
