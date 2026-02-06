/**
 * Navigation Types for Gallifrey Social Feed POC
 *
 * This file contains all navigation-related types for React Navigation:
 * - Stack navigator param lists
 * - Tab navigator param lists
 * - Nested navigation types
 * - Global ReactNavigation namespace declaration
 */

import type { NavigatorScreenParams } from '@react-navigation/native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { UUID } from './models';

// ============================================================================
// Feed Stack Navigator
// ============================================================================

/**
 * Feed stack navigator param list
 * Handles feed and post detail screens
 */
export type FeedStackParamList = {
  Feed: undefined;
  PostDetail: {
    postId: UUID;
  };
};

/**
 * Feed stack screen props helper type
 */
export type FeedStackScreenProps<T extends keyof FeedStackParamList> = StackScreenProps<
  FeedStackParamList,
  T
>;

// ============================================================================
// Profile Stack Navigator
// ============================================================================

/**
 * Profile stack navigator param list
 * Handles user profile and settings
 */
export type ProfileStackParamList = {
  Profile: {
    userId?: UUID; // Optional - defaults to current user
  };
  Settings: undefined;
  EditProfile: undefined;
};

/**
 * Profile stack screen props helper type
 */
export type ProfileStackScreenProps<T extends keyof ProfileStackParamList> = StackScreenProps<
  ProfileStackParamList,
  T
>;

// ============================================================================
// Main Tab Navigator
// ============================================================================

/**
 * Main tab navigator param list
 * Handles bottom tab navigation
 */
export type MainTabParamList = {
  FeedTab: NavigatorScreenParams<FeedStackParamList>;
  CreatePost: undefined;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

/**
 * Main tab screen props helper type
 */
export type MainTabScreenProps<T extends keyof MainTabParamList> = BottomTabScreenProps<
  MainTabParamList,
  T
>;

// ============================================================================
// Auth Stack Navigator
// ============================================================================

/**
 * Auth stack navigator param list
 * Handles authentication flow
 */
export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  ResetPassword: {
    token: string;
  };
};

/**
 * Auth stack screen props helper type
 */
export type AuthStackScreenProps<T extends keyof AuthStackParamList> = StackScreenProps<
  AuthStackParamList,
  T
>;

// ============================================================================
// Root Stack Navigator
// ============================================================================

/**
 * Root stack navigator param list
 * Top-level navigator that handles auth and main app navigation
 */
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  // Modal screens (presented over tab bar)
  EditPost: {
    postId: UUID;
  };
  ReportContent: {
    contentId: UUID;
    contentType: 'post' | 'comment';
  };
  UserList: {
    title: string;
    userIds: UUID[];
    type: 'reactions' | 'followers' | 'following';
  };
};

/**
 * Root stack screen props helper type
 */
export type RootStackScreenProps<T extends keyof RootStackParamList> = StackScreenProps<
  RootStackParamList,
  T
>;

// ============================================================================
// Composite Screen Props
// ============================================================================

/**
 * Composite screen props for nested navigators
 * Allows accessing both parent and current navigator
 */
export type FeedTabScreenProps<T extends keyof FeedStackParamList> = CompositeScreenProps<
  FeedStackScreenProps<T>,
  CompositeScreenProps<MainTabScreenProps<'FeedTab'>, RootStackScreenProps<keyof RootStackParamList>>
>;

export type ProfileTabScreenProps<T extends keyof ProfileStackParamList> = CompositeScreenProps<
  ProfileStackScreenProps<T>,
  CompositeScreenProps<MainTabScreenProps<'ProfileTab'>, RootStackScreenProps<keyof RootStackParamList>>
>;

// ============================================================================
// Global ReactNavigation Namespace Declaration
// ============================================================================

/**
 * Extend ReactNavigation's global namespace to enable type-safe navigation
 * without passing generic parameters everywhere
 *
 * Usage:
 * const navigation = useNavigation(); // Automatically typed!
 * navigation.navigate('Feed'); // Type-safe!
 */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

// ============================================================================
// Navigation Helpers
// ============================================================================

/**
 * Type-safe navigation route names
 */
export const Routes = {
  // Auth routes
  AUTH: 'Auth' as const,
  LOGIN: 'Login' as const,
  SIGNUP: 'Signup' as const,
  FORGOT_PASSWORD: 'ForgotPassword' as const,
  RESET_PASSWORD: 'ResetPassword' as const,

  // Main routes
  MAIN: 'Main' as const,
  FEED_TAB: 'FeedTab' as const,
  CREATE_POST: 'CreatePost' as const,
  PROFILE_TAB: 'ProfileTab' as const,

  // Feed stack routes
  FEED: 'Feed' as const,
  POST_DETAIL: 'PostDetail' as const,

  // Profile stack routes
  PROFILE: 'Profile' as const,
  SETTINGS: 'Settings' as const,
  EDIT_PROFILE: 'EditProfile' as const,

  // Modal routes
  EDIT_POST: 'EditPost' as const,
  REPORT_CONTENT: 'ReportContent' as const,
  USER_LIST: 'UserList' as const,
} as const;

/**
 * Type for route names (for runtime checks)
 */
export type RouteName = typeof Routes[keyof typeof Routes];

/**
 * Type guard to check if a string is a valid route name
 */
export function isRouteName(value: string): value is RouteName {
  return Object.values(Routes).includes(value as RouteName);
}

// ============================================================================
// Navigation State Types
// ============================================================================

/**
 * Navigation options for screens
 */
export interface ScreenOptions {
  title?: string;
  headerShown?: boolean;
  headerBackTitle?: string;
  gestureEnabled?: boolean;
  presentation?: 'card' | 'modal' | 'transparentModal';
  animation?: 'default' | 'fade' | 'slide_from_bottom' | 'slide_from_right';
}

/**
 * Tab bar icon props
 */
export interface TabBarIconProps {
  focused: boolean;
  color: string;
  size: number;
}

/**
 * Navigation event types
 */
export type NavigationEvent =
  | 'focus'
  | 'blur'
  | 'state'
  | 'beforeRemove'
  | 'tabPress'
  | 'tabLongPress';

// ============================================================================
// Deep Linking Types
// ============================================================================

/**
 * Deep link configuration
 */
export interface DeepLinkConfig {
  screens: {
    Auth: {
      screens: {
        Login: 'login';
        Signup: 'signup';
        ForgotPassword: 'forgot-password';
        ResetPassword: 'reset-password/:token';
      };
    };
    Main: {
      screens: {
        FeedTab: {
          screens: {
            Feed: 'feed';
            PostDetail: 'post/:postId';
          };
        };
        CreatePost: 'create';
        ProfileTab: {
          screens: {
            Profile: 'profile/:userId?';
            Settings: 'settings';
            EditProfile: 'edit-profile';
          };
        };
      };
    };
    EditPost: 'edit/:postId';
    ReportContent: 'report/:contentType/:contentId';
    UserList: 'users/:type';
  };
}

/**
 * Deep link URL params
 */
export type DeepLinkParams = {
  [K in keyof RootStackParamList]: RootStackParamList[K] extends undefined
    ? undefined
    : RootStackParamList[K];
};
