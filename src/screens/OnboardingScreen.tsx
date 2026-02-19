import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import Animated, { FadeInUp, FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { ArrowRight, Heart, Shield } from 'lucide-react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme/guardianTheme';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

export const OnboardingScreen = () => {
    const navigation = useNavigation();
    const [step, setStep] = useState(1);
    const totalSteps = 2; // Reduced to 2 steps

    // Form State
    const [medicalCondition, setMedicalCondition] = useState('');
    const [guardianName, setGuardianName] = useState('');
    const [guardianPhone, setGuardianPhone] = useState('');

    const { completeOnboarding } = useAuth();

    const handleNext = async () => {
        if (step < totalSteps) {
            setStep(step + 1);
        } else {
            console.log('Onboarding Data:', { medicalCondition, guardianName, guardianPhone });

            // Mark onboarding as complete in context
            // This will update App.tsx to switch to Main stack
            await completeOnboarding({
                medicalCondition,
                guardianName,
                guardianPhone
            });
        }
    };

    const renderStepContent = () => {
        if (step === 1) {
            return (
                <Animated.View
                    entering={FadeInRight.springify()}
                    exiting={FadeOutLeft}
                    style={styles.stepContainer}
                >
                    <Text style={styles.stepTitle}>Any medical{'\n'}conditions?</Text>
                    <Text style={styles.stepSubtitle}>
                        This will be displayed to paramedics in case of an emergency.
                    </Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Asthma, Diabetes (Optional)"
                        placeholderTextColor={COLORS.textTertiary}
                        value={medicalCondition}
                        onChangeText={setMedicalCondition}
                        autoFocus={true} // Auto focus on first step
                    />
                </Animated.View>
            );
        } else if (step === 2) {
            return (
                <Animated.View
                    entering={FadeInRight.springify()}
                    exiting={FadeOutLeft}
                    style={styles.stepContainer}
                >
                    <Text style={styles.stepTitle}>Who is your{'\n'}Guardian?</Text>
                    <Text style={styles.stepSubtitle}>
                        Their contact details will be used for SOS alerts.
                    </Text>
                    <View style={styles.inputGroup}>
                        <TextInput
                            style={styles.input}
                            placeholder="Name (e.g. Mom)"
                            placeholderTextColor={COLORS.textTertiary}
                            value={guardianName}
                            onChangeText={setGuardianName}
                            autoFocus={true}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Phone Number"
                            placeholderTextColor={COLORS.textTertiary}
                            value={guardianPhone}
                            onChangeText={setGuardianPhone}
                            keyboardType="phone-pad"
                        />
                    </View>
                </Animated.View>
            );
        }
        return null;
    };

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

                    {/* Top Section: Icon & Progress */}
                    <View style={styles.topSection}>
                        <View style={styles.iconBox}>
                            {step === 1 && <Heart size={28} color="#FFF" fill="#FFF" />}
                            {step === 2 && <Shield size={28} color="#FFF" fill="#FFF" />}
                        </View>

                        <View style={styles.progressContainer}>
                            {[1, 2].map((i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.progressDot,
                                        step === i ? styles.activeDot : styles.inactiveDot
                                    ]}
                                />
                            ))}
                        </View>
                    </View>

                    {/* Content Section */}
                    <View style={styles.contentSection}>
                        {renderStepContent()}
                    </View>

                </ScrollView>

                {/* Bottom Navigation FAB */}
                <View style={styles.bottomNav}>
                    <TouchableOpacity
                        onPress={handleNext}
                        style={styles.nextBtn}
                        activeOpacity={0.9}
                    >
                        <Text style={styles.nextBtnText}>
                            {step === totalSteps ? 'Finish' : 'Next'}
                        </Text>
                        <ArrowRight size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    scrollContent: {
        flexGrow: 1,
        paddingTop: 60,
        paddingHorizontal: 24,
        paddingBottom: 100, // Space for FAB
    },
    topSection: {
        alignItems: 'center',
        marginBottom: 48,
    },
    iconBox: {
        width: 56,
        height: 56,
        backgroundColor: '#000',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
        ...SHADOWS.soft,
    },
    progressContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    progressDot: {
        height: 6,
        borderRadius: 3,
    },
    activeDot: {
        width: 32,
        backgroundColor: '#FF4F00', // Orange accent
    },
    inactiveDot: {
        width: 6,
        backgroundColor: COLORS.border,
    },
    contentSection: {
        flex: 1,
        alignItems: 'center',
        width: '100%',
    },
    stepContainer: {
        width: '100%',
        alignItems: 'center',
    },
    stepTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 12,
        lineHeight: 40,
    },
    stepSubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 48,
        paddingHorizontal: 16,
        lineHeight: 22,
    },
    inputGroup: {
        width: '100%',
        gap: 24,
    },
    input: {
        width: '100%',
        borderBottomWidth: 2,
        borderBottomColor: '#FF4F00', // Orange accent
        paddingVertical: 12,
        fontSize: 18,
        fontWeight: '500',
        color: COLORS.text,
        textAlign: 'center',
    },
    bottomNav: {
        position: 'absolute',
        bottom: 40,
        right: 24,
    },
    nextBtn: {
        backgroundColor: '#000',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
        ...SHADOWS.card,
    },
    nextBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 8,
    },
});
