import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
    KeyboardAvoidingView, Platform, Dimensions, ActivityIndicator, Image, Keyboard
} from 'react-native';
import { ScreenLayout } from '../components/ScreenLayout';
import { GuardianHeader } from '../components/GuardianHeader';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../theme/guardianTheme';
import { Send, Mic, X, Sparkles, Pause, Camera, Image as ImageIcon } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
    FadeInUp,
    FadeInRight,
    Layout
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { getWellnessResponse, ChatMessage } from '../services/aiService';
import { BlurView } from 'expo-blur';
import { MenuContext } from '../context/MenuContext';

const { width, height } = Dimensions.get('window');

const SUGGESTIONS = [
    "I feel anxious right now 😰",
    "Safety tips for traveling alone 🧳",
    "How to handle harassment? 🛡️",
    "Calming breathing exercise 🧘‍♀️",
    "Legal rights for women ⚖️"
];

const Blob = () => {
    const scale = useSharedValue(1);

    useEffect(() => {
        scale.value = withRepeat(
            withTiming(1.1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View style={[styles.blobContainer, animatedStyle]}>
            <LinearGradient
                colors={['#FB923C', '#FDA4AF']} // Orange to Rose
                style={styles.blob}
                start={{ x: 0, y: 1 }}
                end={{ x: 1, y: 0 }}
            />
            <View style={styles.blobContent}>
                <Text style={{ fontSize: 40 }}>👋</Text>
                <Text style={styles.blobText}>Hello</Text>
            </View>
        </Animated.View>
    );
};

export const ChatScreen = () => {
    const navigation = useNavigation();
    const { toggleMenu } = React.useContext(MenuContext);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images, // Reverting to potentially deprecated but working option
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });

        if (!result.canceled) {
            setSelectedImage(result.assets[0].uri);
        }
    };

    // Voice Mode State
    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState<'Listening' | 'Processing' | 'Speaking'>('Listening');

    const handleSend = async (text: string) => {
        if (!text.trim()) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: text,
            imageUri: selectedImage || undefined,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setSelectedImage(null);
        setIsLoading(true);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

        // Convert to history format expected by service
        const history = messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

        const responseText = await getWellnessResponse(history, userMsg.text, userMsg.imageUri);

        const botMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: responseText,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, botMsg]);
        setIsLoading(false);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    };

    // Voice Mode Simulation
    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (isVoiceMode) {
            setVoiceStatus('Listening');
            timeout = setTimeout(() => {
                setVoiceStatus('Processing');
                setTimeout(() => {
                    setVoiceStatus('Speaking');
                }, 2000);
            }, 4000);
        }
        return () => clearTimeout(timeout);
    }, [isVoiceMode]);

    // Keyboard Handling for Layout
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const showListener = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
        const hideListener = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

        return () => {
            showListener.remove();
            hideListener.remove();
        };
    }, []);


    return (
        <ScreenLayout noPadding>
            <GuardianHeader
                title="Wellness Companion"
                subtitle="Amba AI"
                onMenuPress={toggleMenu}
                onNotificationPress={() => navigation.navigate('Notifications')}
                hasNotifications
            />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <ScrollView
                    ref={scrollViewRef}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {messages.length === 0 ? (
                        <View style={styles.emptyState}>
                            <TouchableOpacity onPress={() => handleSend("Hello")}>
                                <Blob />
                            </TouchableOpacity>

                            <Text style={styles.heroTitle}>How can I help you?</Text>
                            <Text style={styles.heroSubtitle}>
                                I'm here to listen, guide, and support you securely & anonymously.
                            </Text>

                            <View style={styles.suggestionsContainer}>
                                {SUGGESTIONS.map((suggestion, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.suggestionChip}
                                        onPress={() => handleSend(suggestion)}
                                    >
                                        <Text style={styles.suggestionText}>{suggestion}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    ) : (
                        messages.map((msg, index) => (
                            <Animated.View
                                key={msg.id}
                                entering={FadeInRight}
                                layout={Layout.springify()}
                                style={[
                                    styles.messageRow,
                                    msg.role === 'user' ? styles.userRow : styles.botRow
                                ]}
                            >
                                {msg.role === 'model' && (
                                    <View style={styles.botAvatar}>
                                        <Sparkles size={16} color="#F43F5E" />
                                    </View>
                                )}

                                <View style={[
                                    styles.bubble,
                                    msg.role === 'user' ? styles.userBubble : styles.botBubble
                                ]}>
                                    {msg.role === 'user' && (
                                        <LinearGradient
                                            colors={[COLORS.primary, '#EA580C']} // Amba-500 to Orange-600
                                            style={StyleSheet.absoluteFill}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        />
                                    )}
                                    <Text style={[
                                        styles.messageText,
                                        msg.role === 'user' ? styles.userText : styles.botText
                                    ]}>
                                        {msg.text}
                                    </Text>
                                    {msg.imageUri && (
                                        <Image
                                            source={{ uri: msg.imageUri }}
                                            style={{ width: 200, height: 150, borderRadius: 8, marginTop: 8 }}
                                        />
                                    )}
                                    <Text style={[
                                        styles.timeText,
                                        msg.role === 'user' ? { color: 'rgba(255,255,255,0.7)' } : { color: COLORS.textTertiary }
                                    ]}>
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            </Animated.View>
                        ))
                    )}

                    {isLoading && (
                        <View style={styles.loadingContainer}>
                            <View style={styles.botAvatar}>
                                <Sparkles size={16} color="#F43F5E" />
                            </View>
                            <View style={[styles.bubble, styles.botBubble, { flexDirection: 'row', alignItems: 'center', gap: 4, height: 40 }]}>
                                <ActivityIndicator size="small" color={COLORS.textTertiary} />
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* Input Area */}
                <View style={[
                    styles.inputContainer,
                    { paddingBottom: keyboardVisible ? 20 : 90 } // Dynamic padding
                ]}>
                    {selectedImage && (
                        <View style={styles.previewContainer}>
                            <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                            <TouchableOpacity onPress={() => setSelectedImage(null)} style={styles.removePreviewBtn}>
                                <X size={12} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    )}
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="Type a message..."
                            placeholderTextColor={COLORS.textTertiary}
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                        />

                        <View style={styles.inputActions}>
                            <TouchableOpacity onPress={() => setIsVoiceMode(true)} style={styles.iconBtn}>
                                <Mic size={20} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={pickImage} style={styles.iconBtn}>
                                <ImageIcon size={20} color={COLORS.textSecondary} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => handleSend(inputText)}
                                disabled={(!inputText.trim() && !selectedImage) || isLoading}
                                style={[styles.sendBtn, ((!inputText.trim() && !selectedImage) || isLoading) && styles.disabledSendBtn]}
                            >
                                <Send size={16} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* Voice Mode Overlay */}
            {
                isVoiceMode && (
                    <View style={styles.voiceOverlay}>
                        <TouchableOpacity
                            style={styles.closeVoiceBtn}
                            onPress={() => setIsVoiceMode(false)}
                        >
                            <X size={24} color={COLORS.text} />
                        </TouchableOpacity>

                        <View style={styles.voiceContent}>
                            <Text style={styles.voiceStatusText}>
                                {voiceStatus === 'Listening' ? 'Listening' :
                                    voiceStatus === 'Processing' ? 'Thinking' : 'Speaking'}
                            </Text>
                            <Text style={styles.voiceSubText}>I'm here, go ahead.</Text>

                            {/* Animated Voice Orb */}
                            <View style={styles.voiceOrbContainer}>
                                <View style={[styles.voiceOrbPulse, { transform: [{ scale: voiceStatus === 'Listening' ? 1.5 : 1 }] }]} />
                                <LinearGradient
                                    colors={['#FFF7ED', '#FFEDD5']}
                                    style={styles.voiceOrb}
                                >
                                    <Mic size={32} color={voiceStatus === 'Listening' ? COLORS.primary : COLORS.textTertiary} />
                                </LinearGradient>
                            </View>
                        </View>

                        <View style={styles.voiceFooter}>
                            <LinearGradient
                                colors={['transparent', '#F97316']}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                            />
                            <TouchableOpacity style={styles.pauseBtn} onPress={() => setIsVoiceMode(false)}>
                                <Pause size={20} color="#FFF" fill="#FFF" />
                                <Text style={styles.pauseText}>Pause Session</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )
            }
        </ScreenLayout >
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: SPACING.m,
        paddingBottom: SPACING.xl,
        flexGrow: 1,
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 40,
    },
    blobContainer: {
        width: 120,
        height: 120,
        marginBottom: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    blob: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 50, // Squircle-ish
        transform: [{ rotate: '45deg' }],
        opacity: 0.9,
    },
    blobContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    blobText: {
        color: '#FFF',
        fontWeight: 'bold',
        marginTop: 4,
    },
    heroTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
    },
    heroSubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 32,
        maxWidth: 250,
    },
    suggestionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 10,
    },
    suggestionChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#FFF',
        borderRadius: RADIUS.full,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.soft,
    },
    suggestionText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },

    // Messages
    messageRow: {
        flexDirection: 'row',
        marginBottom: 16,
        maxWidth: '85%',
    },
    userRow: {
        alignSelf: 'flex-end',
        justifyContent: 'flex-end',
    },
    botRow: {
        alignSelf: 'flex-start',
        justifyContent: 'flex-start',
    },
    botAvatar: {
        width: 32,
        height: 32,
        borderRadius: RADIUS.full,
        backgroundColor: '#FFE4E6', // Rose-100
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
        marginTop: 4,
    },
    bubble: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: RADIUS.l,
        position: 'relative',
        overflow: 'hidden',
    },
    userBubble: {
        backgroundColor: COLORS.primary, // Fallback
        borderTopRightRadius: 4,
    },
    botBubble: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderTopLeftRadius: 4,
    },
    messageText: {
        fontSize: 14,
        lineHeight: 20,
    },
    userText: {
        color: '#FFF',
    },
    botText: {
        color: COLORS.text,
    },
    timeText: {
        fontSize: 10,
        marginTop: 4,
        textAlign: 'right',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },

    // Input
    inputContainer: {
        padding: SPACING.m,
        backgroundColor: 'transparent',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: RADIUS.xl,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.soft,
    },
    input: {
        flex: 1,
        maxHeight: 100,
        fontSize: 14,
        color: COLORS.text,
        paddingRight: 8,
    },
    inputActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconBtn: {
        padding: 8,
    },
    sendBtn: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.text, // Slate-900
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledSendBtn: {
        opacity: 0.5,
    },

    // Voice Overlay
    voiceOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#FFF',
        zIndex: 1000,
        alignItems: 'center',
    },
    closeVoiceBtn: {
        position: 'absolute',
        top: 60,
        right: 24,
        width: 48,
        height: 48,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
    },
    voiceContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -60,
    },
    voiceStatusText: {
        fontSize: 32,
        fontWeight: '900',
        color: COLORS.text,
        marginBottom: 8,
    },
    voiceSubText: {
        fontSize: 18,
        color: COLORS.textSecondary,
        marginBottom: 50,
    },
    voiceOrbContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    voiceOrbPulse: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: '#FED7AA', // Orange-200
        opacity: 0.5,
    },
    voiceOrb: {
        width: 180,
        height: 180,
        borderRadius: 90,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FFF7ED',
        ...SHADOWS.soft,
    },
    voiceFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '40%',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 50,
    },
    pauseBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: RADIUS.full,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    pauseText: {
        color: '#FFF',
        fontWeight: 'bold',
        marginLeft: 8,
    },
    previewContainer: {
        flexDirection: 'row',
        marginBottom: 10,
        marginLeft: 10,
    },
    previewImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    removePreviewBtn: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: COLORS.text,
        borderRadius: 10,
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
