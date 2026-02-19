import 'react-native-gesture-handler';
import React, { useEffect, useRef, useState } from 'react';
import 'react-native-url-polyfill/auto';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  StatusBar,
  Platform,
  Alert,
  Linking,
} from 'react-native';

import { NavigatorScreenParams } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Menu } from 'lucide-react-native';

// Screens import
import CustomTabBar from './src/components/CustomTabBar';
import ProfileStack from './src/navigation/ProfileStack';
import {
  MapScreen,
  SafetyScreen,
  FakeCallScreen,
  NearbyPlacesScreen,
  ContactsScreen,
  MyTeamScreen,
  GuardianScreen,
  LoginScreen,
  SignInScreen,
  SignupScreen,
  OnboardingScreen,
  ChatScreen,
  NotificationsScreen,
} from './src/screens';
import { SideMenu } from './src/components/SideMenu';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import * as Location from 'expo-location';
import { SOSProvider, useSOS } from './src/context/SOSContext';
import { useShakeSOS } from './src/features/sos/useShakeSOS';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import { initDB } from './src/services/sqlite';
import { runStartupCleanup } from './src/utils/databaseCleanup';
import SOSConfirmationModal from './src/components/SOSConfirmationModal';
import NoContactsModal from './src/components/NoContactsModal';
import SOSStatusOverlay from './src/components/SOSStatusOverlay';
import { ProfileStackParamList } from './src/navigation/types';
import { COLORS } from './src/theme/guardianTheme';
import { MenuContext } from './src/context/MenuContext';

export type RootTabParamList = {
  Home: undefined;
  Navigate: undefined;
  Safety: undefined;
  Chat: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  SignIn: undefined;
  Signup: undefined;
  Onboarding: undefined;
  Main: NavigatorScreenParams<RootTabParamList>;
  NearbyPlaces: { type: 'hospital' | 'police' };
  FakeCall: { callerName?: string };
  MyTeam: undefined;
  Contacts: undefined;
  Guardian: undefined;
  Notifications: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

const { width, height } = Dimensions.get('window');

// Navigators
const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

// Home Screen Component
import HomeScreen from './src/screens/HomeScreen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

/**
 * Tab Navigator component
 */
function MainTabNavigator({ navigation }: { navigation: any }) {
  const { colors } = useTheme();

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }
  }, []);

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
      />
      <Tab.Screen
        name="Navigate"
        component={MapScreen}
      />
      <Tab.Screen
        name="Safety"
        component={SafetyScreen}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
      />
    </Tab.Navigator>
  );
}

// ...

// ...

function InnerApp() {
  const { user, loading, didJustSignup } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' }}>
        <Text>Loading...</Text>
      </View>
    )
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        // Unauthenticated Stack
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      ) : didJustSignup ? (
        // Onboarding Stack (Exclusive for new signups)
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : (
        // Authenticated Main Stack
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen name="NearbyPlaces" component={NearbyPlacesScreen} />
          <Stack.Screen name="FakeCall" component={FakeCallScreen} />
          <Stack.Screen name="Contacts" component={ContactsScreen} />
          <Stack.Screen name="MyTeam" component={MyTeamScreen} />
          <Stack.Screen name="Guardian" component={GuardianScreen} />
          <Stack.Screen name="Profile" component={ProfileStack} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

function AppContent() {
  const sosContext = useSOS();
  const isConfirmingSOS = sosContext?.isConfirmingSOS ?? false;
  const confirmSOS = sosContext?.confirmSOS ?? (() => { });
  const cancelSOSConfirmation = sosContext?.cancelSOSConfirmation ?? (() => { });
  const noContactsModalVisible = sosContext?.noContactsModalVisible ?? false;
  const openWhatsApp = sosContext?.openWhatsApp ?? (() => { });
  const closeNoContactsModal = sosContext?.closeNoContactsModal ?? (() => { });

  usePushNotifications(); // Register for push tokens

  const handleConfirm = () => { confirmSOS(); };

  // SideMenu State
  const [isMenuVisible, setMenuVisible] = useState(false);
  const toggleMenu = () => setMenuVisible(!isMenuVisible);
  const closeMenu = () => setMenuVisible(false);

  // Initialize Database on App Startup
  useEffect(() => {
    const init = async () => {
      try {
        await initDB();
        await runStartupCleanup();
        console.log("🚀 App Startup: DB Initialized & Cleanup Done");
      } catch (e) {
        console.error("❌ App Startup Error:", e);
      }
    };
    init();
  }, []);

  return (
    <MenuContext.Provider value={{ isMenuVisible, toggleMenu, closeMenu }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <NavigationContainer>
            <InnerApp />
            <SideMenu isVisible={isMenuVisible} onClose={closeMenu} />
          </NavigationContainer>
        </SafeAreaProvider>
      </GestureHandlerRootView>

      <SOSConfirmationModal
        visible={isConfirmingSOS}
        onConfirm={handleConfirm}
        onCancel={cancelSOSConfirmation}
      />
      <NoContactsModal
        visible={noContactsModalVisible}
        onClose={closeNoContactsModal}
        onConfirm={openWhatsApp}
      />
      <SOSStatusOverlay />

      {/* Floating Menu Button (Visible on Home) - Can also be in HomeScreen header */}
      {/* We'll inject this button into HomeScreen via the new MenuContext */}

    </MenuContext.Provider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SOSProvider>
          <ShakeSOSManager />
          <AppContent />
        </SOSProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

// ... styles can be trimmed ...
const makeStyles = (colors: any) => StyleSheet.create({
  // Keep existing styles if needed or rely on component-specific styles
});

// Helper for ShakeSOS
function ShakeSOSManager() {
  const sosContext = useSOS();
  const enabled = sosContext?.shakeEnabled ?? false;
  const isConfirmingSOS = sosContext?.isConfirmingSOS ?? false;

  const handleShake = React.useCallback(() => {
    if (enabled && !isConfirmingSOS && typeof sosContext.startSOSConfirmation === 'function') {
      console.log('Shake detected! Starting SOS confirmation...');
      sosContext.startSOSConfirmation();
    }
  }, [enabled, isConfirmingSOS, sosContext]);

  useShakeSOS(enabled, handleShake);
  return null;
}
