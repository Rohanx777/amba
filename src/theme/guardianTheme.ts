// 🎨 Guardian Angel Design System
// Colors derived from the Web Frontend (Tailwind config)

export const COLORS = {
    // Base
    background: '#F8FAFC', // slate-50
    card: '#FFFFFF',
    text: '#0F172A', // slate-900
    textSecondary: '#64748B', // slate-500
    textTertiary: '#94A3B8', // slate-400

    // Brand
    primary: '#2563EB', // blue-600
    primaryLight: '#3B82F6', // blue-500
    primaryPale: '#EFF6FF', // blue-50

    // Accents (Aurora Gradients)
    accentOrange: '#FED7AA', // orange-200
    accentAmber: '#FEF3C7', // amber-100
    accentRose: '#FFE4E6', // rose-100

    // Status
    success: '#22C55E', // green-500
    successBg: '#F0FDF4', // green-50
    warning: '#EAB308', // yellow-500
    warningBg: '#FEFCE8', // yellow-50
    danger: '#EF4444', // red-500
    dangerBg: '#FEF2F2', // red-50

    // UI
    border: '#E2E8F0', // slate-200
    inputBg: '#F1F5F9', // slate-100

    // Gradients
    aurora: [
        'rgba(254, 215, 170, 0.4)', // Orange
        'rgba(255, 228, 230, 0.4)', // Rose
        'rgba(254, 243, 199, 0.4)', // Amber
    ]
};

export const SPACING = {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
};

export const RADIUS = {
    s: 8,
    m: 12,
    l: 24,
    xl: 32,
    full: 9999,
};

export const SHADOWS = {
    soft: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    card: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
        elevation: 5,
    },
    glow: {
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    }
};
