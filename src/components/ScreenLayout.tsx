import React from 'react';
import { View, StyleSheet, StatusBar, SafeAreaView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { COLORS } from '../theme/guardianTheme';

const { width, height } = Dimensions.get('window');

interface ScreenLayoutProps {
    children: React.ReactNode;
    noPadding?: boolean;
}

export const ScreenLayout: React.FC<ScreenLayoutProps> = ({ children, noPadding }) => {
    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* 🌌 Aurora Background Layer */}
            <View style={styles.auroraContainer}>
                {/* Top Left Blob */}
                <View style={[styles.blob, styles.blobOrange, { top: -100, left: -100 }]} />
                {/* Bottom Right Blob */}
                <View style={[styles.blob, styles.blobAmber, { bottom: -100, right: -100 }]} />
                {/* Center Blob */}
                <View style={[styles.blob, styles.blobRose, { top: height * 0.4, left: width * 0.2 }]} />

                {/* Glass Overlay */}
                <BlurView intensity={60} style={StyleSheet.absoluteFill} tint="light" />
            </View>

            {/* 📄 Content Layer */}
            <SafeAreaView style={styles.safeArea}>
                <View style={[styles.content, noPadding && { padding: 0 }]}>
                    {children}
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    auroraContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: -1,
        overflow: 'hidden', // Clip blobs
    },
    blob: {
        position: 'absolute',
        width: width * 0.8,
        height: width * 0.8,
        borderRadius: 999,
        opacity: 0.5,
    },
    blobOrange: {
        backgroundColor: COLORS.accentOrange,
    },
    blobAmber: {
        backgroundColor: COLORS.accentAmber,
    },
    blobRose: {
        backgroundColor: COLORS.accentRose,
    },
    safeArea: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 20, // Default padding matching Design System SPACING.m approx
    }
});
