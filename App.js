import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View, Text, Platform } from 'react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import Colors from './src/theme/colors';

// Auth Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import SignupScreen from './src/screens/auth/SignupScreen';
import ResetPasswordScreen from './src/screens/auth/ResetPasswordScreen';

// Main Screens
import DashboardScreen from './src/screens/DashboardScreen';
import GymProfileScreen from './src/screens/GymProfileScreen';
import PlansScreen from './src/screens/PlansScreen';
import MembersListScreen from './src/screens/MembersListScreen';
import AddMemberScreen from './src/screens/AddMemberScreen';
import MemberProfileScreen from './src/screens/MemberProfileScreen';
import EditMemberScreen from './src/screens/EditMemberScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import QRScannerScreen from './src/screens/QRScannerScreen';
import TransformationScreen from './src/screens/TransformationScreen';
import ReferralLeaderboardScreen from './src/screens/ReferralLeaderboardScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import RevenueAnalysisScreen from './src/screens/RevenueAnalysisScreen';
import GymProfileSetupScreen from './src/screens/GymProfileSetupScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ─── Error Boundary ──────────────────────────────────
// Catches any JS crash in the component tree and shows a fallback instead of a blank white screen
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.log('[ErrorBoundary] Caught error:', error);
    console.log('[ErrorBoundary] Component stack:', info?.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, padding: 24 }}>
          <Ionicons name="warning" size={48} color={Colors.expired} />
          <Text style={{ color: Colors.text, fontSize: 20, fontWeight: '700', marginTop: 16 }}>Something went wrong</Text>
          <Text style={{ color: Colors.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <Text
            style={{ color: Colors.primary, fontSize: 14, marginTop: 20, fontWeight: '600' }}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            Tap to try again
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// ─── Home tab stack ──────────────────────────────────
const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DashboardHome" component={DashboardScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="Transformations" component={TransformationScreen} />
    <Stack.Screen name="ReferralLeaderboard" component={ReferralLeaderboardScreen} />
    <Stack.Screen name="RevenueAnalysis" component={RevenueAnalysisScreen} />
  </Stack.Navigator>
);

// ─── Members tab stack ───────────────────────────────
const MembersStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MembersList" component={MembersListScreen} />
    <Stack.Screen name="AddMember" component={AddMemberScreen} />
    <Stack.Screen name="MemberProfile" component={MemberProfileScreen} />
    <Stack.Screen name="EditMember" component={EditMemberScreen} />
    <Stack.Screen name="Payment" component={PaymentScreen} />
  </Stack.Navigator>
);

// ─── Bottom Tab Navigator ────────────────────────────
const MainTabs = () => {
  console.log('[MainTabs] Rendering bottom tab navigator...');
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.tabBar,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Dashboard': iconName = focused ? 'grid' : 'grid-outline'; break;
            case 'Members': iconName = focused ? 'people' : 'people-outline'; break;
            case 'Scanner': iconName = focused ? 'qr-code' : 'qr-code-outline'; break;
            case 'Plans': iconName = focused ? 'ribbon' : 'ribbon-outline'; break;
            case 'Profile': iconName = focused ? 'business' : 'business-outline'; break;
            default: iconName = 'ellipse';
          }
          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={HomeStack} />
      <Tab.Screen name="Members" component={MembersStack} />
      <Tab.Screen
        name="Scanner"
        component={QRScannerScreen}
        options={{
          tabBarLabel: 'Scan',
          tabBarIcon: ({ focused }) => (
            <View style={{
              width: 48, height: 48, borderRadius: 24,
              backgroundColor: Colors.primary,
              justifyContent: 'center', alignItems: 'center',
              marginBottom: 4,
            }}>
              <Ionicons name="qr-code" size={24} color={Colors.background} />
            </View>
          ),
        }}
      />
      <Tab.Screen name="Plans" component={PlansScreen} />
      <Tab.Screen name="Profile" component={GymProfileScreen} />
    </Tab.Navigator>
  );
};

// ─── Auth Stack ──────────────────────────────────────
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Signup" component={SignupScreen} />
    <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
  </Stack.Navigator>
);

// ─── Root Navigator (with profile setup guard) ──────
const RootNavigator = () => {
  const { isAuthenticated, isLoading, isProfileComplete } = useAuth();

  console.log('[RootNavigator] isLoading:', isLoading, '| isAuthenticated:', isAuthenticated, '| profileComplete:', isProfileComplete);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Navigation guard: if authenticated but profile not complete → show setup screen
  if (isAuthenticated && !isProfileComplete) {
    return (
      <ErrorBoundary>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="GymProfileSetup" component={GymProfileSetupScreen} />
        </Stack.Navigator>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      {isAuthenticated ? <MainTabs /> : <AuthStack />}
    </ErrorBoundary>
  );
};

// ─── Navigation theme ────────────────────────────────
const navTheme = {
  dark: true,
  colors: {
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.text,
    border: Colors.border,
    notification: Colors.accent,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '800' },
  },
};

// Web linking config — prevents "undefined" URL path on web
const linking = Platform.OS === 'web' ? {
  config: {
    screens: {
      Login: 'login',
      Signup: 'signup',
      ResetPassword: 'reset-password',
      Dashboard: {
        screens: {
          DashboardHome: '',
          Notifications: 'notifications',
          Transformations: 'transformations',
          ReferralLeaderboard: 'referral-leaderboard',
        },
      },
      Members: {
        screens: {
          MembersList: 'members',
          AddMember: 'add-member',
          MemberProfile: 'member/:memberId',
          EditMember: 'member/:memberId/edit',
          Payment: 'payment',
        },
      },
      Scanner: 'scanner',
      Plans: 'plans',
      Profile: 'profile',
    },
  },
} : undefined;

export default function App() {
  console.log('[App] Rendering...');
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer theme={navTheme} linking={linking}>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
