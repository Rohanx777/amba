import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { ChevronRight, ArrowLeft } from 'lucide-react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme/guardianTheme';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

// Custom Icons for Social Login
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

export const SignupScreen = () => {
    const navigation = useNavigation();
    const { signup, loginWithGoogle, loginWithFacebook, loading } = useAuth();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSignup = async () => {
        if (!email || !password || !fullName) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }
        try {
            await signup(email, password, fullName);
            Alert.alert(
                "Account Created! 🚀",
                "You have been successfully rolled onto the app.\n\nPlease log in with your credentials to proceed.",
                [
                    // @ts-ignore
                    { text: "OK", onPress: () => navigation.navigate('SignIn') } // Explicitly navigate to SignIn
                ]
            );
        } catch (e: any) {
            Alert.alert("Signup Failed", e.message);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.backBtn}>
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
                        <Text style={styles.logoText}>S</Text>
                    </View>
                </Animated.View>

                {/* Title */}
                <Animated.View entering={FadeInUp.delay(200)} style={styles.titleSection}>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Join the AMBA protocol community.</Text>
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
                        <Text style={styles.label}>FULL NAME</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Jane Doe"
                            placeholderTextColor={COLORS.textTertiary}
                            value={fullName}
                            onChangeText={setFullName}
                        />
                    </View>

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
                    </View>
                </Animated.View>

                {/* FAB / Submit Button */}
                <Animated.View entering={FadeInUp.delay(500)} style={styles.actionSection}>
                    <TouchableOpacity
                        style={styles.submitBtn}
                        onPress={handleSignup}
                        activeOpacity={0.9}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <Text style={styles.submitBtnText}>Create & Continue</Text>
                                <ChevronRight size={20} color="#FFF" />
                            </>
                        )}
                    </TouchableOpacity>
                </Animated.View>

                {/* Login Link */}
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.loginLinkBox}>
                    <Text style={styles.loginLinkText}>Already have an account? Log in</Text>
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
