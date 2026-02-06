/**
 * Auth Navigator - Authentication Flow
 *
 * Handles the authentication screens (Login and SignUp)
 * Uses native stack navigator with iOS-optimized transitions
 */

import React from 'react';
import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../types/navigation';

// Placeholder screens - replace with actual implementations
const LoginScreen = () => null;
const SignupScreen = () => null;
const ForgotPasswordScreen = () => null;
const ResetPasswordScreen = () => null;

const AuthStack = createNativeStackNavigator<AuthStackParamList>();

/**
 * Auth Stack Navigator
 * Manages login and signup screens with iOS-native presentation
 */
export default function AuthNavigator() {
  return (
    <AuthStack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: true,
        // iOS-native transitions
        animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
        // iOS-native header style
        headerBackTitleVisible: false,
        headerTintColor: '#007AFF', // iOS blue
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerShadowVisible: true,
      }}
    >
      <AuthStack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          title: 'Welcome',
          headerLargeTitle: true,
          // Hide back button on login screen
          headerLeft: () => null,
        }}
      />
      <AuthStack.Screen
        name="Signup"
        component={SignupScreen}
        options={{
          title: 'Create Account',
          headerLargeTitle: false,
          // iOS-native modal presentation for signup
          presentation: Platform.OS === 'ios' ? 'modal' : 'card',
        }}
      />
      <AuthStack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          title: 'Reset Password',
          headerLargeTitle: false,
        }}
      />
      <AuthStack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{
          title: 'Create New Password',
          headerLargeTitle: false,
        }}
      />
    </AuthStack.Navigator>
  );
}
