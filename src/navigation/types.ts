import { NavigatorScreenParams } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

// --- Param Lists ---

export type ProfileStackParamList = {
  ProfileHome: undefined;
  Login: undefined;
  Signup: undefined;
  EditProfile: undefined;
  EmergencyContacts: undefined;
  SavedAddresses: undefined;
  AudioEvidence: undefined;
};

export type RootTabParamList = {
  Home: undefined;
  Navigate: undefined;
  Safety: undefined;
  Chat: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  SignIn: undefined; // Added SignIn route
  Signup: undefined;
  Main: NavigatorScreenParams<RootTabParamList>;
  NearbyPlaces: { type: 'hospital' | 'police' };
  FakeCall: { callerName?: string };
  Contacts: undefined;
  Guardian: undefined;
  Notifications: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};