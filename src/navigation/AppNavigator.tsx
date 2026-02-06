/**
 * App Navigator - Root Navigation Structure
 *
 * Implements the corrected nested stack architecture from EXPERT_REVIEWS.md:
 * Root Stack → Main Tabs → Feed Stack (with PostDetail pushed)
 *
 * Key fixes:
 * - Nested stack navigators (NOT flat tabs)
 * - Feed Stack allows pushing PostDetail without breaking tab bar
 * - iOS-native navigation transitions
 * - Type-safe navigation with TypeScript
 */

import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import type {
  RootStackParamList,
  MainTabParamList,
  FeedStackParamList,
  ProfileStackParamList,
} from '../types/navigation';

import AuthNavigator from './AuthNavigator';

// Placeholder screens - replace with actual implementations
const FeedScreen = () => null;
const PostDetailScreen = () => null;
const CreatePostScreen = () => null;
const ProfileScreen = () => null;
const SettingsScreen = () => null;
const EditProfileScreen = () => null;

// Create navigators
const RootStack = createNativeStackNavigator<RootStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const FeedStack = createNativeStackNavigator<FeedStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

/**
 * Feed Stack Navigator
 * Nested inside Feed Tab - allows pushing PostDetail
 */
function FeedNavigator() {
  return (
    <FeedStack.Navigator
      screenOptions={{
        headerShown: true,
        // iOS-native transitions
        animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
        // iOS-native header style
        headerLargeTitle: false,
        headerBackTitleVisible: false,
      }}
    >
      <FeedStack.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          title: 'Feed',
          headerLargeTitle: true,
        }}
      />
      <FeedStack.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{
          title: 'Post',
          headerLargeTitle: false,
        }}
      />
    </FeedStack.Navigator>
  );
}

/**
 * Profile Stack Navigator
 * Nested inside Profile Tab
 */
function ProfileNavigator() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerShown: true,
        animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
        headerBackTitleVisible: false,
      }}
    >
      <ProfileStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          headerLargeTitle: true,
        }}
      />
      <ProfileStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
        }}
      />
      <ProfileStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{
          title: 'Edit Profile',
        }}
      />
    </ProfileStack.Navigator>
  );
}

/**
 * Main Tab Navigator
 * Contains nested stack navigators for Feed and Profile
 */
function MainNavigator() {
  return (
    <MainTab.Navigator
      screenOptions={{
        headerShown: false, // Headers handled by nested stacks
        tabBarActiveTintColor: '#007AFF', // iOS blue
        tabBarInactiveTintColor: '#8E8E93', // iOS gray
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E5EA',
          borderTopWidth: 0.5,
        },
      }}
    >
      <MainTab.Screen
        name="FeedTab"
        component={FeedNavigator}
        options={{
          tabBarLabel: 'Feed',
          tabBarIcon: ({ color, size }) => {
            // Replace with actual icon component (e.g., from @expo/vector-icons)
            return null;
          },
        }}
      />
      <MainTab.Screen
        name="CreatePost"
        component={CreatePostScreen}
        options={{
          tabBarLabel: 'Create',
          tabBarIcon: ({ color, size }) => {
            // Replace with actual icon component
            return null;
          },
          // Optional: Present as modal on iOS
          // This would require changing to a modal stack presentation
        }}
      />
      <MainTab.Screen
        name="ProfileTab"
        component={ProfileNavigator}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => {
            // Replace with actual icon component
            return null;
          },
        }}
      />
    </MainTab.Navigator>
  );
}

/**
 * Root Stack Navigator
 * Top-level navigator managing Auth and Main flows
 */
function RootNavigator() {
  // TODO: Add auth state management to determine initial route
  // const { isAuthenticated } = useAuthStore();

  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* TODO: Conditional rendering based on auth state */}
      {/* {!isAuthenticated ? ( */}
      <RootStack.Screen name="Auth" component={AuthNavigator} />
      {/* ) : ( */}
      <RootStack.Screen name="Main" component={MainNavigator} />
      {/* )} */}
    </RootStack.Navigator>
  );
}

/**
 * App Navigator
 * Root navigation container with iOS-optimized configuration
 */
export default function AppNavigator() {
  return (
    <NavigationContainer
      theme={{
        dark: false,
        colors: {
          primary: '#007AFF', // iOS blue
          background: '#FFFFFF',
          card: '#FFFFFF',
          text: '#000000',
          border: '#E5E5EA',
          notification: '#FF3B30', // iOS red
        },
      }}
    >
      <RootNavigator />
    </NavigationContainer>
  );
}
