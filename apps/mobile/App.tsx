import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Pressable, ScrollView, Switch, ActivityIndicator, LogBox, Modal } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from './lib/supabase';
import LoginScreen from './components/LoginScreen';
import UserProfileScreen from './components/UserProfileScreen';
import RiderDashboard from './components/RiderDashboard';
import PointsEarnedNotification from './components/PointsEarnedNotification';
import SplashScreen from './components/SplashScreen';
import QuickLinksFooter from './components/QuickLinksFooter';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { getCountries, type Country } from './utils/countries';
// Stripe/Tipping disabled - imports removed to avoid build issues
// To re-enable: uncomment imports and add @stripe/stripe-react-native to package.json
// import { StripeProvider } from '@stripe/stripe-react-native';
// import { TipPrompt, getStripePublishableKey } from './modules/tipping';

// Suppress harmless Stripe NativeEventEmitter warnings
LogBox.ignoreLogs([
  'new NativeEventEmitter()',
  'addListener',
  'removeListeners',
]);

type PendingReview = {
  business_id: string;
  qr_code_id?: string | null;
  stars: number;
  tags?: string[];
  tag_ratings?: Record<string, number>; // e.g., { "Cleanliness": 4, "Driving safety": 5 }
  comment?: string;
  photo_urls?: string[];
  device_hash: string;
  created_at: string;
};

const TAGS = ['Friendly', 'Fast', 'Great value', 'Clean', 'Professional', 'Helpful'];

// UUID validation regex (matches standard UUID format)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isValidUUID = (str: string | null | undefined): boolean => {
  return !!str && UUID_REGEX.test(str);
};

type BusinessStats = {
  avgStars: number;
  numRatings: number;
  tagAverages: Record<string, number>;
  recentComments: Array<{ comment: string; stars: number; created_at: string }>;
};

// Moved getStyles before AppContent to fix hoisting issue
const getStyles = (theme: any) => StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: theme.background,
  },
  ratingPageContainer: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: theme.background,
  },
  container: {
    backgroundColor: theme.background,
    padding: 20,
    paddingTop: 140,
    paddingBottom: 100, // Extra padding to account for QuickLinksFooter (~72px) + spacing
  },
  statsContainer: {
    backgroundColor: theme.background,
    padding: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  homeContainer: {
    flex: 1,
    backgroundColor: theme.background,
  },
  homeScrollContainer: {
    flex: 1,
  },
  homeScrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 100,
    minHeight: '100%',
  },
  homeContent: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: theme.primary,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    fontSize: 40,
  },
  header: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 12,
  },
  scanButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    marginBottom: 20,
  },
  scanButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  checkmark: {
    fontSize: 48,
    color: theme.success,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.background,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  ratingHeader: {
    marginBottom: 0,
  },
  ratingTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.text,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  ratingSubtitle: {
    fontSize: 15,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  section: {
    marginBottom: 28,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 16,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  starButton: {
    padding: 10,
  },
  star: {
    fontSize: 52,
    color: '#e2e8f0',
    marginRight: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  starSelected: {
    color: '#fbbf24',
    textShadowColor: 'rgba(251, 191, 36, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tagLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  tagStarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagStarButton: {
    padding: 4,
  },
  tagStar: {
    fontSize: 30,
    color: '#e2e8f0',
    marginRight: 3,
  },
  tagStarSelected: {
    color: '#fbbf24',
    textShadowColor: 'rgba(251, 191, 36, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  input: {
    backgroundColor: theme.card,
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    color: theme.text,
    minHeight: 110,
    textAlignVertical: 'top',
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  charCount: {
    fontSize: 12,
    color: theme.textTertiary,
    marginTop: 8,
    textAlign: 'right',
  },
  submitButtonSpacer: {
    height: 20,
  },
  submitButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 32,
    paddingVertical: 22,
    borderRadius: 16,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
  },
  submitButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  submitButtonTextDisabled: {
    color: theme.textSecondary,
  },
  button: {
    backgroundColor: theme.primary,
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraBg: {
    backgroundColor: '#111827',
  },
  padding: {
    padding: 24,
  },
  whiteText: {
    color: '#ffffff',
    fontSize: 18,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionSubtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
    color: '#d1d5db',
  },
  cameraHeader: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
  },
  backButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 12,
    alignSelf: 'flex-start',
  },
  cameraFooter: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scanHint: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 16,
    padding: 24,
  },
  scanTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  scanSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#e5e7eb',
  },
  inputSection: {
    width: '100%',
    maxWidth: 320,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  regInput: {
    backgroundColor: theme.card,
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.text,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
    width: '100%',
    maxWidth: 320,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  regInputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 12,
    color: theme.error,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorContainer: {
    backgroundColor: theme.errorBg,
    borderWidth: 1.5,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    marginBottom: 32,
    width: '100%',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  duplicateRatingContainer: {
    backgroundColor: theme.successBg,
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
    width: '100%',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  duplicateRatingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  duplicateRatingIconText: {
    fontSize: 24,
    color: theme.success,
    fontWeight: '700',
  },
  duplicateRatingContent: {
    flex: 1,
  },
  duplicateRatingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#065f46',
    marginBottom: 6,
  },
  duplicateRatingMessage: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 20,
  },
  duplicateRatingDismiss: {
    marginLeft: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexShrink: 0,
  },
  duplicateRatingDismissText: {
    color: theme.success,
    fontSize: 14,
    fontWeight: '600',
  },
  dismissErrorButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'center',
  },
  dismissErrorText: {
    color: theme.error,
    fontSize: 14,
    fontWeight: '600',
  },
  submitRegButtonSpacer: {
    height: 20,
  },
  submitRegButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    marginTop: 40,
  },
  submitRegButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  submitRegButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  submitRegButtonTextDisabled: {
    color: theme.textSecondary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: theme.textTertiary,
    fontWeight: '500',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  statsHeader: {
    marginBottom: 24,
    marginTop: 40,
  },
  statsHeaderContent: {
    alignItems: 'center',
    marginBottom: 12,
  },
  statsIconContainer: {
    width: 96,
    height: 96,
    backgroundColor: theme.primary,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  statsIcon: {
    fontSize: 48,
  },
  statsAppName: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 12,
  },
  backButtonStats: {
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
  statsTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  statsSubtitle: {
    fontSize: 18,
    color: theme.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.textSecondary,
  },
  statsCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  statsCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 16,
  },
  statsCardSubtext: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  statsStarsContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  statsStarsValue: {
    fontSize: 48,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 8,
  },
  statsStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsStar: {
    fontSize: 32,
    color: '#d1d5db',
    marginRight: 4,
  },
  statsStarSelected: {
    color: '#fbbf24',
  },
  tagStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  tagStatLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.text,
    flex: 1,
  },
  tagStatStars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    minWidth: 30,
  },
  tagStatStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagStatStar: {
    fontSize: 20,
    color: '#d1d5db',
    marginRight: 2,
  },
  tagStatStarSelected: {
    color: '#fbbf24',
  },
  commentItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  commentStars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentStar: {
    fontSize: 16,
    color: '#d1d5db',
    marginRight: 2,
  },
  commentStarSelected: {
    color: '#fbbf24',
  },
  commentDate: {
    fontSize: 12,
    color: theme.textTertiary,
  },
  commentText: {
    fontSize: 14,
    color: theme.text,
    lineHeight: 20,
  },
  noDataText: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center',
    padding: 20,
  },
  noTagRatingText: {
    fontSize: 14,
    color: theme.textTertiary,
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    width: '100%',
    maxWidth: 320,
  },
  dashboardButtonInline: {
    flex: 1,
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dashboardButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  authButtonInline: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: theme.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 2,
  },
  authButtonInlineText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  authButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: theme.border,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 2,
  },
  authButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  themeToggleButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 8,
    textAlign: 'left',
  },
  countryButton: {
    backgroundColor: theme.card,
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
    maxWidth: 320,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  countryButtonText: {
    fontSize: 16,
    color: theme.text,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  countryModalContent: {
    backgroundColor: theme.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  countryModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  countryModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
  },
  countryModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countryModalCloseText: {
    fontSize: 18,
    color: theme.textSecondary,
    fontWeight: '600',
  },
  countryModalList: {
    maxHeight: 400,
  },
  countryOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  countryOptionSelected: {
    backgroundColor: theme.card,
  },
  countryOptionText: {
    fontSize: 16,
    color: theme.text,
    fontWeight: '500',
  },
});

function AppContent() {
  const { theme, isDark, toggleTheme } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  
  // Generate styles based on current theme
  const styles = useMemo(() => getStyles(theme), [theme]);
  const [scanning, setScanning] = useState(false);
  const [viewMode, setViewMode] = useState<'rate' | 'stats'>('rate');
  const [currentScreen, setCurrentScreen] = useState<'home' | 'rate' | 'stats' | 'login' | 'profile' | 'dashboard'>('home');
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [qrCodeId, setQrCodeId] = useState<string | null>(null);
  const [businessCode, setBusinessCode] = useState(''); // QR code short code
  const [businessCodeError, setBusinessCodeError] = useState('');
  const [scanError, setScanError] = useState('');
  const [countryCode, setCountryCode] = useState('ZW'); // Default to Zimbabwe (for non-logged-in users)
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [userHasCountry, setUserHasCountry] = useState(false); // Track if logged-in user has saved country
  const [stars, setStars] = useState(0);
  const [tagRatings, setTagRatings] = useState<Record<string, number>>({});
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]); // Photo URIs for upload
  const [thanks, setThanks] = useState(false);
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [businessName, setBusinessName] = useState<string>('');
  const [businessLogo, setBusinessLogo] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showTipPrompt, setShowTipPrompt] = useState(false);
  const [lastRatingId, setLastRatingId] = useState<string | null>(null);
  const [tipDeviceHash, setTipDeviceHash] = useState<string | null>(null);
  const [showPointsNotification, setShowPointsNotification] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [currentDeviceHash, setCurrentDeviceHash] = useState('');

  const queueKey = 'pending_reviews_v1';

  const syncQueuedReviews = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(queueKey);
      if (!stored) return;
      
      const payload: PendingReview[] = JSON.parse(stored);
      if (!payload.length) return;
      
      // Filter out any reviews with invalid UUIDs
      const validReviews = payload.filter(r => {
        const isValid = isValidUUID(r.business_id);
        return isValid;
      });
      
      if (!validReviews.length) {
        // All reviews were invalid, clear the queue
        await AsyncStorage.removeItem(queueKey);
        return;
      }
      
      // Clean up qr_code_id in valid reviews
      const cleanedReviews = validReviews.map(r => ({
        ...r,
        qr_code_id: r.qr_code_id && isValidUUID(r.qr_code_id) ? r.qr_code_id : null
      }));
      
      const { error } = await supabase.from('review').insert(cleanedReviews);
      if (!error) {
        await AsyncStorage.removeItem(queueKey);
      }
    } catch (error) {
      // If we can't read/write to storage or parse JSON, just continue silently
    }
  }, []);

  useEffect(() => {
    // try to send any queued reviews at startup
    syncQueuedReviews();
    // Get device hash once at startup
    deviceHash.get().then(setCurrentDeviceHash);
    
    // Fetch countries from database and user profile country
    const loadCountries = async () => {
      setLoadingCountries(true);
      try {
        const fetchedCountries = await getCountries();
        setCountries(fetchedCountries);
        
        // Fetch user's profile country preference
        let profileCountryCode: string | null = null;
        try {
          const deviceHashValue = await deviceHash.get();
          
          // Check if user is logged in
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          
          if (currentUser) {
            // For logged-in users, fetch by user_id
            const { data: profileData } = await supabase
              .from('profile')
              .select('country_code')
              .eq('user_id', currentUser.id)
              .maybeSingle();
            
            if (profileData?.country_code) {
              profileCountryCode = profileData.country_code;
              setUserHasCountry(true); // User has a saved country
            } else {
              setUserHasCountry(false); // User doesn't have a saved country
            }
          } else {
            setUserHasCountry(false); // Not logged in
            // For anonymous users, fetch by device_hash
            const { data: profileData } = await supabase
              .from('profile')
              .select('country_code')
              .eq('device_hash', deviceHashValue)
              .maybeSingle();
            
            if (profileData?.country_code) {
              profileCountryCode = profileData.country_code;
            }
          }
        } catch (profileError) {
          console.error('Error fetching profile country:', profileError);
          // Continue with default country if profile fetch fails
          setUserHasCountry(false);
        }
        
        // Set country code based on priority:
        // 1. User's saved profile country (if available and valid)
        // 2. Current countryCode (if it exists in fetched countries)
        // 3. Default based on login status:
        //    - If logged in: Kenya ('KE')
        //    - If not logged in: Zimbabwe ('ZW')
        // 4. First available country
        if (fetchedCountries.length > 0) {
          if (profileCountryCode && fetchedCountries.find(c => c.code === profileCountryCode)) {
            // User has a saved country and it's valid
            setCountryCode(profileCountryCode);
          } else if (countryCode && fetchedCountries.find(c => c.code === countryCode)) {
            // Keep current country if it's still valid
            // (don't change it)
          } else {
            // Check if user is logged in to determine default
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            
            if (currentUser) {
              // Logged in: default to Kenya
              const keCountry = fetchedCountries.find(c => c.code === 'KE');
              if (keCountry) {
                setCountryCode('KE');
              } else {
                setCountryCode(fetchedCountries[0].code);
              }
            } else {
              // Not logged in: default to Zimbabwe
              const zwCountry = fetchedCountries.find(c => c.code === 'ZW');
              if (zwCountry) {
                setCountryCode('ZW');
              } else {
                setCountryCode(fetchedCountries[0].code);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading countries:', error);
        // Fallback to empty array - the getCountries function will handle fallback internally
        setCountries([]);
      } finally {
        setLoadingCountries(false);
      }
    };
    loadCountries();
  }, [syncQueuedReviews]);

  // Check for existing session on app start
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoadingAuth(false);
      }
    };

    checkSession();
  }, []);

  // Listen to auth state changes and update country preference when user changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const newUser = session?.user || null;
      setUser(newUser);
      
      // Ignore INITIAL_SESSION event - it fires on app start before login
      if (event === 'INITIAL_SESSION') {
        return;
      }
      
      // When user logs in/out, reload their country preference
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        try {
          // Wait for countries to be loaded if they're not yet available
          let countriesToUse = countries;
          if (countriesToUse.length === 0) {
            // Try to load countries if not already loaded
            try {
              countriesToUse = await getCountries();
              setCountries(countriesToUse);
            } catch (countriesError) {
              console.error('Error loading countries on auth change:', countriesError);
              // Continue with empty array, will retry when countries are loaded
            }
          }
          
          const deviceHashValue = await deviceHash.get();
          let profileCountryCode: string | null = null;
          
          if (newUser) {
            // For logged-in users, fetch by user_id
            const { data: profileData } = await supabase
              .from('profile')
              .select('country_code')
              .eq('user_id', newUser.id)
              .maybeSingle();
            
            if (profileData?.country_code) {
              profileCountryCode = profileData.country_code;
              setUserHasCountry(true); // User has a saved country
            } else {
              setUserHasCountry(false); // User doesn't have a saved country
            }
          } else {
            setUserHasCountry(false); // Not logged in
            // For logged-out/anonymous users, fetch by device_hash
            const { data: profileData } = await supabase
              .from('profile')
              .select('country_code')
              .eq('device_hash', deviceHashValue)
              .maybeSingle();
            
            if (profileData?.country_code) {
              profileCountryCode = profileData.country_code;
            }
          }
          
          // Update country code if we have a valid profile country
          if (profileCountryCode && countriesToUse.length > 0 && countriesToUse.find(c => c.code === profileCountryCode)) {
            setCountryCode(profileCountryCode);
          } else if (!newUser && countriesToUse.length > 0) {
            // If user logged out and no profile country, default to Zimbabwe
            const zwCountry = countriesToUse.find(c => c.code === 'ZW');
            if (zwCountry) {
              setCountryCode('ZW');
            }
          } else if (newUser && countriesToUse.length > 0 && !profileCountryCode) {
            // If user logged in but no profile country, default to Kenya
            const keCountry = countriesToUse.find(c => c.code === 'KE');
            if (keCountry) {
              setCountryCode('KE');
            }
          }
        } catch (profileError) {
          console.error('Error fetching profile country on auth change:', profileError);
        }
      }
      
      if (!newUser) {
        // Redirect to home if user logs out (from any screen)
        setCurrentScreen('home');
        // Clear all app state on logout
        setBusinessId(null);
        setQrCodeId(null);
        setStats(null);
        setBusinessName('');
        setBusinessLogo(null);
        setBusinessCode('');
        setBusinessCodeError('');
        setScanError('');
        setStars(0);
        setTagRatings({});
        setSelectedTags([]);
        setComment('');
        setPhotos([]);
        setThanks(false);
        setSubmitError('');
        setShowPointsNotification(false);
        setPointsEarned(0);
      } else {
        // If user logs in (SIGNED_IN event) and we're on login screen, redirect to home
        if (event === 'SIGNED_IN' && currentScreen === 'login') {
          console.log('Redirecting to home after SIGNED_IN');
          // Clear any stale state on login
          setBusinessId(null);
          setQrCodeId(null);
          setStats(null);
          setBusinessName('');
          setBusinessLogo(null);
          setBusinessCode('');
          setBusinessCodeError('');
          setScanError('');
          setStars(0);
          setTagRatings({});
          setSelectedTags([]);
          setComment('');
          setPhotos([]);
          setThanks(false);
          setSubmitError('');
          setShowPointsNotification(false);
          setPointsEarned(0);
          setCurrentScreen('home');
        }
        // Also redirect if user exists and we're on login screen (fallback for any auth event except INITIAL_SESSION)
        else if (currentScreen === 'login' && newUser && event !== 'INITIAL_SESSION') {
          console.log('Redirecting to home (fallback)');
          // Clear any stale state on login
          setBusinessId(null);
          setQrCodeId(null);
          setStats(null);
          setBusinessName('');
          setBusinessLogo(null);
          setBusinessCode('');
          setBusinessCodeError('');
          setScanError('');
          setStars(0);
          setTagRatings({});
          setSelectedTags([]);
          setComment('');
          setPhotos([]);
          setThanks(false);
          setSubmitError('');
          setShowPointsNotification(false);
          setPointsEarned(0);
          setCurrentScreen('home');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [currentScreen, countries]);

  // Reload country preference when user changes (login/logout) or returning to home screen
  useEffect(() => {
    if (countries.length > 0) {
      const reloadCountryPreference = async () => {
        try {
          const deviceHashValue = await deviceHash.get();
          let profileCountryCode: string | null = null;
          
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          
          if (currentUser) {
            // For logged-in users, fetch by user_id
            const { data: profileData } = await supabase
              .from('profile')
              .select('country_code')
              .eq('user_id', currentUser.id)
              .maybeSingle();
            
            if (profileData?.country_code) {
              profileCountryCode = profileData.country_code;
              setUserHasCountry(true); // User has a saved country
            } else {
              setUserHasCountry(false); // User doesn't have a saved country
            }
          } else {
            setUserHasCountry(false); // Not logged in
            // For anonymous users, fetch by device_hash
            const { data: profileData } = await supabase
              .from('profile')
              .select('country_code')
              .eq('device_hash', deviceHashValue)
              .maybeSingle();
            
            if (profileData?.country_code) {
              profileCountryCode = profileData.country_code;
            }
          }
          
          // Update country code if we have a valid profile country
          if (profileCountryCode && countries.find(c => c.code === profileCountryCode)) {
            setCountryCode(profileCountryCode);
          } else if (!currentUser && countries.length > 0) {
            // If not logged in and no profile country, default to Zimbabwe
            const zwCountry = countries.find(c => c.code === 'ZW');
            if (zwCountry) {
              setCountryCode('ZW');
            }
          } else if (currentUser && countries.length > 0 && !profileCountryCode) {
            // If logged in but no profile country, default to Kenya
            const keCountry = countries.find(c => c.code === 'KE');
            if (keCountry) {
              setCountryCode('KE');
            }
          }
        } catch (profileError) {
          console.error('Error reloading country preference:', profileError);
        }
      };
      
      reloadCountryPreference();
    }
  }, [currentScreen, countries, user]); // Added user as dependency to reload on login/logout

  // Auto-dismiss scan errors after 10 seconds
  useEffect(() => {
    if (scanError) {
      const timer = setTimeout(() => {
        setScanError('');
      }, 10000); // 10 seconds

      return () => clearTimeout(timer);
    }
  }, [scanError]);

  const deviceHash = useMemo(() => {
    // Very simple per-install id persisted in storage
    const key = 'device_hash_v1';
    let cached: string | null = null;
    return {
      get: async () => {
        if (cached) return cached;
        try {
          const v = await AsyncStorage.getItem(key);
          if (v) { cached = v; return v; }
          const gen = Math.random().toString(36).slice(2) + Date.now().toString(36);
          await AsyncStorage.setItem(key, gen);
          cached = gen;
          return gen;
        } catch (error) {
          // If storage fails, generate a temporary hash
          return Math.random().toString(36).slice(2) + Date.now().toString(36);
        }
      }
    };
  }, []);

  const fetchBusinessStats = useCallback(async (bId: string) => {
    setLoadingStats(true);
    setStats(null);
    setScanError(''); // Clear any previous errors
    try {
      // Fetch business info
      const { data: businessData, error: businessError } = await supabase
        .from('business')
        .select('name, logo_url')
        .eq('id', bId)
        .maybeSingle();
      
      if (businessError) {
        console.error('Error fetching business info for stats:', businessError);
        throw new Error(`Unable to fetch business information: ${businessError.message || 'Database error'}`);
      }
      
      if (businessData) {
        setBusinessName(businessData.name);
        setBusinessLogo(businessData.logo_url);
      }

      // Fetch overall stats from view
      const { data: viewData, error: viewError } = await supabase
        .from('business_stats')
        .select('avg_rating, total_reviews')
        .eq('business_id', bId)
        .maybeSingle();

      // View data error is non-critical, continue without it
      if (viewError) {
        console.error('Error fetching business stats view (non-critical):', viewError);
      }

      // Fetch all reviews for this business
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('review')
        .select('stars, tags, tag_ratings, comment, created_at')
        .eq('business_id', bId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (reviewsError) {
        console.error('Error fetching reviews for stats:', reviewsError);
        throw new Error(`Unable to fetch reviews: ${reviewsError.message || 'Database error'}`);
      }

      // Calculate overall stats
      const allReviews = reviewsData || [];
      const avgStars = viewData?.avg_rating 
        ? parseFloat(viewData.avg_rating.toString()) 
        : allReviews.length > 0
          ? allReviews.reduce((sum, r) => sum + r.stars, 0) / allReviews.length
          : 0;
      const numRatings = viewData?.total_reviews || allReviews.length;

      // Calculate tag averages from tags array and tag_ratings
      const tagAverages: Record<string, number> = {};
      const tagCounts: Record<string, number> = {};
      
      allReviews.forEach(review => {
        // Use tags array if available
        if (review.tags && Array.isArray(review.tags)) {
          review.tags.forEach(tag => {
            tagAverages[tag] = (tagAverages[tag] || 0) + review.stars;
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        }
        // Also check tag_ratings for detailed ratings
        if (review.tag_ratings && typeof review.tag_ratings === 'object') {
          Object.entries(review.tag_ratings).forEach(([tag, stars]) => {
            if (typeof stars === 'number' && stars > 0) {
              tagAverages[tag] = (tagAverages[tag] || 0) + stars;
              tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            }
          });
        }
      });

      Object.keys(tagAverages).forEach(tag => {
        tagAverages[tag] = tagAverages[tag] / tagCounts[tag];
      });

      // Get recent comments
      const recentComments = allReviews
        .filter(r => r.comment && r.comment.trim())
        .map(r => ({
          comment: r.comment!,
          stars: r.stars,
          created_at: r.created_at
        }))
        .slice(0, 10);

      setStats({
        avgStars,
        numRatings,
        tagAverages,
        recentComments
      });
    } catch (error) {
      console.error('Error in fetchBusinessStats:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unable to load business statistics. Please check your connection and try again.';
      
      // Check if it's a permission/RLS error
      if (errorMessage.includes('permission') || errorMessage.includes('policy') || errorMessage.includes('RLS')) {
        setScanError('Permission denied. Unable to view stats for this business.');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        setScanError('Network error. Please check your connection and try again.');
      } else {
        setScanError(errorMessage);
      }
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const onScan = async (result: BarcodeScanningResult) => {
    const data = result.data;
    // Accept formats: 
    // - URL: https://yourapp.com/review/abc123 or http://yourapp.com/review/abc123
    // - Short code: abc123
    let scannedCode: string | null = null;
    
    try {
      // Check if it's a URL
      if (data.startsWith('http://') || data.startsWith('https://')) {
        const url = new URL(data);
        const pathParts = url.pathname.split('/').filter(Boolean);
        if (pathParts[pathParts.length - 2] === 'review' && pathParts[pathParts.length - 1]) {
          scannedCode = pathParts[pathParts.length - 1];
        }
      } 
      // Assume it's a short code
      else {
        scannedCode = data;
      }
    } catch {
      // If URL parsing fails, assume it's a short code
      scannedCode = data;
    }
    
    // Close camera immediately when QR code is detected
    setScanning(false);
    setScanError(''); // Clear any previous errors
    
    // Handle QR code format
    if (scannedCode) {
      console.log('🔍 QR code scanned:', scannedCode);
      console.log('📱 Current state before API call - businessId:', businessId, 'viewMode:', viewMode);
      try {
        // Fetch business by QR code
        const baseUrl = process.env.EXPO_PUBLIC_APP_URL || 'http://localhost:3000';
        const apiUrl = `${baseUrl}/api/business/by-code?code=${scannedCode}`;
        
        console.log('Fetching business from:', apiUrl);
        console.log('Current state before fetch - businessId:', businessId, 'viewMode:', viewMode);
        
        console.log('Making fetch request...');
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }).catch((fetchError) => {
          console.error('Fetch error caught:', fetchError);
          throw fetchError;
        });
        
        console.log('Response received! Status:', response.status, response.statusText);
        console.log('Response headers:', JSON.stringify([...response.headers.entries()]));
        
        if (!response.ok) {
          console.error('Response not OK. Status:', response.status);
          let errorData;
          try {
            const text = await response.text();
            console.error('Error response body:', text);
            errorData = JSON.parse(text);
          } catch (e) {
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
          }
          console.error('API error data:', errorData);
          throw new Error(errorData.error || 'Business not found');
        }
        
        console.log('Parsing response JSON...');
        let result;
        try {
          const responseText = await response.text();
          console.log('Response text:', responseText.substring(0, 500));
          result = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Failed to parse JSON:', parseError);
          setScanError('Invalid response from server.');
          setBusinessId(null);
          setQrCodeId(null);
          setBusinessName('');
          setBusinessLogo(null);
          return;
        }
        
        console.log('✅ Business data received:', JSON.stringify(result, null, 2));
        
        const business = result?.business;
        const qrCode = result?.qr_code;
        
        if (!business) {
          console.error('No business in response:', result);
          setScanError('Business data not found in response.');
          setBusinessId(null);
          setQrCodeId(null);
          setBusinessName('');
          setBusinessLogo(null);
          return;
        }
        
        if (business && business.is_active) {
          console.log('✅ Business found! Setting state...');
          console.log('Business ID:', business.id);
          console.log('Business Name:', business.name);
          console.log('QR Code ID:', qrCode?.id);
          
          // Set all state synchronously to trigger re-render
          const newBusinessId = business.id;
          const newQrCodeId = qrCode?.id || null;
          const newBusinessName = business.name || 'Business';
          const newBusinessLogo = business.logo_url || null;
          
          console.log('About to set state with:', {
            businessId: newBusinessId,
            qrCodeId: newQrCodeId,
            businessName: newBusinessName
          });
          
          // Capture current viewMode before state updates
          const currentViewMode = viewMode;
          console.log('Setting state now... Current viewMode:', currentViewMode);
          
          setBusinessId(newBusinessId);
          setQrCodeId(newQrCodeId);
          setBusinessName(newBusinessName);
          setBusinessLogo(newBusinessLogo);
          setScanError('');
          // Don't override viewMode - keep the user's choice (rate or stats)
          setBusinessCodeError('');
          
          console.log('✅ State setters called! businessId:', newBusinessId, 'viewMode:', currentViewMode);
          
          // If in stats mode, fetch stats after state is set
          if (currentViewMode === 'stats') {
            console.log('📊 Stats mode detected - fetching business stats...');
            // Use setTimeout to ensure businessId is set before fetching
            setTimeout(async () => {
              console.log('Fetching stats for business:', newBusinessId);
              await fetchBusinessStats(newBusinessId);
            }, 200);
          }
          
          // Force a re-render check
          requestAnimationFrame(() => {
            console.log('After animation frame - state should be updated');
          });
          
          console.log('✅ State updated! Rating page should appear now.');
        } else {
          console.error('Business not active or missing');
          setScanError('Business not found or inactive.');
          setBusinessId(null);
          setQrCodeId(null);
          setBusinessName('');
          setBusinessLogo(null);
        }
      } catch (err) {
        console.error('Error in onScan:', err);
        const errorMessage = err instanceof Error 
          ? (err.message.includes('network') || err.message.includes('fetch') || err.message.includes('Failed to fetch')
            ? 'Network error. Please check your connection and try again.'
            : err.message)
          : 'Unable to look up business. Please try again.';
        setScanError(errorMessage);
        setBusinessId(null);
        setQrCodeId(null);
        setBusinessName('');
        setBusinessLogo(null);
      }
    } else {
      setScanError('Invalid QR code. Please scan a valid business QR code.');
      setBusinessId(null);
      setQrCodeId(null);
      setBusinessName('');
      setBusinessLogo(null);
    }
  };

  const handleBusinessCodeSubmit = async () => {
    const trimmed = businessCode.trim();
    if (!trimmed) {
      setBusinessCodeError('Please enter a business QR code');
      return;
    }
    setBusinessCodeError('');
    setScanError('');
    try {
      // Fetch business by QR code
      const baseUrl = process.env.EXPO_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/business/by-code?code=${trimmed}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setBusinessCodeError(errorData.error || 'Business not found. Please check the QR code.');
        return;
      }
      
      const result = await response.json();
      const business = result.business;
      const qrCode = result.qr_code;
      
      if (business && business.is_active) {
        setBusinessId(business.id);
        setQrCodeId(qrCode?.id || null);
        setBusinessName(business.name);
        setBusinessLogo(business.logo_url);
        setBusinessCode('');
        setBusinessCodeError('');
        if (viewMode === 'stats') {
          await fetchBusinessStats(business.id);
        }
      } else {
        setBusinessCodeError('Business not found or inactive.');
        setBusinessId(null);
        setQrCodeId(null);
        setBusinessName('');
        setBusinessLogo(null);
      }
    } catch (err) {
      console.error('Error in handleBusinessCodeSubmit:', err);
      const errorMessage = err instanceof Error 
        ? (err.message.includes('network') || err.message.includes('fetch')
          ? 'Network error. Please check your connection and try again.'
          : `Error: ${err.message}`)
        : 'Unable to process. Please try again.';
      setBusinessCodeError(errorMessage);
    }
  };

  const enqueue = async (r: PendingReview) => {
    try {
      const stored = await AsyncStorage.getItem(queueKey);
      const arr = stored ? JSON.parse(stored) : [];
      arr.push(r);
      await AsyncStorage.setItem(queueKey, JSON.stringify(arr));
    } catch (error) {
      // If we can't queue, we'll just lose this review - better than crashing
    }
  };

  const submit = async () => {
    if (!businessId || stars < 1) return;
    
    setSubmitError('');
    setSubmitLoading(true);
    
    // Validate UUIDs before submitting
    if (!isValidUUID(businessId)) {
      setSubmitError('Invalid business information. Please try scanning again.');
      setSubmitLoading(false);
      return;
    }
    
    // Only include qr_code_id if it's a valid UUID
    const validQrCodeId = qrCodeId && isValidUUID(qrCodeId) ? qrCodeId : null;
    
    let deviceHashValue: string;
    try {
      // Use user's auth ID if logged in, otherwise use device hash
      if (user?.id) {
        deviceHashValue = user.id;
      } else {
        deviceHashValue = await deviceHash.get();
      }
    } catch (error) {
      setSubmitError('Unable to process review. Please try again.');
      setSubmitLoading(false);
      return;
    }
    
    // Upload photos if any
    let photoUrls: string[] = [];
    if (photos.length > 0) {
      try {
        for (const photoUri of photos) {
          // Convert URI to blob/file for upload
          const response = await fetch(photoUri);
          const blob = await response.blob();
          const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('review-photos')
            .upload(fileName, blob);
          
          if (!uploadError && uploadData) {
            const { data: urlData } = supabase.storage
              .from('review-photos')
              .getPublicUrl(uploadData.path);
            photoUrls.push(urlData.publicUrl);
          }
        }
      } catch (photoError) {
        console.error('Error uploading photos:', photoError);
        // Continue without photos if upload fails
      }
    }
    
    // Convert tag_ratings to tags array
    const tagsArray = selectedTags.length > 0 
      ? selectedTags 
      : Object.entries(tagRatings)
          .filter(([_, rating]) => rating > 0)
          .map(([tag, _]) => tag);
    
    const r: PendingReview = {
      business_id: businessId,
      qr_code_id: validQrCodeId,
      stars,
      tags: tagsArray.length > 0 ? tagsArray : undefined,
      tag_ratings: Object.keys(tagRatings).length > 0 ? tagRatings : undefined,
      comment: comment.trim() || undefined,
      photo_urls: photoUrls.length > 0 ? photoUrls : undefined,
      device_hash: deviceHashValue,
      created_at: new Date().toISOString()
    };
    
    let success = false;
    try {
      // Build insert payload
      const insertPayload: any = {
        business_id: r.business_id,
        stars: r.stars,
        tags: r.tags,
        comment: r.comment,
        photo_urls: r.photo_urls,
        device_hash: r.device_hash,
        created_at: r.created_at
      };
      
      // Only include qr_code_id if it's valid
      if (validQrCodeId) {
        insertPayload.qr_code_id = validQrCodeId;
      }
      
      // Include tag_ratings if we have any
      if (r.tag_ratings && Object.keys(r.tag_ratings).length > 0) {
        insertPayload.tag_ratings = r.tag_ratings;
      }
      
      let { data: reviewData, error } = await supabase.from('review').insert(insertPayload).select('id').single();
      
      if (error) {
        // Handle duplicate review constraint (user already reviewed this business in this hour)
        if (error.code === '23505' && error.message?.includes('uniq_review_device_business_hour')) {
          setSubmitError('You\'ve already reviewed this business. You can submit another review in an hour.');
          setSubmitLoading(false);
          // Reset the form
          setStars(0);
          setTagRatings({});
          setSelectedTags([]);
          setComment('');
          setPhotos([]);
          return;
        }
        
        // Handle daily review limit exceeded
        if (error.message?.includes('daily_review_limit_exceeded')) {
          // Extract the count from the error message if available
          const match = error.message.match(/already submitted (\d+) reviews today/);
          const count = match ? match[1] : '4';
          setSubmitError(`Maximum of 4 reviews per day reached. You have already submitted ${count} reviews today. Please try again tomorrow.`);
          setSubmitLoading(false);
          // Reset the form
          setStars(0);
          setTagRatings({});
          setSelectedTags([]);
          setComment('');
          setPhotos([]);
          return;
        }
        
        // Check if it's a network error or database error
        const isNetworkError = error.message?.includes('network') || 
                               error.message?.includes('fetch') || 
                               error.code === 'PGRST301' ||
                               error.message?.includes('Failed to fetch');
        
        if (isNetworkError) {
          await enqueue(r);
          setSubmitError('No internet connection. Your review has been saved and will be submitted automatically when you have a connection.');
        } else {
          // Database or other error - show the actual error
          console.error('Database error:', error);
          setSubmitError(`Error: ${error.message || 'Unable to submit review'}`);
        }
        setSubmitLoading(false);
        return;
      }
      
      // Success!
      success = true;
      
      // Award points directly using the same device_hash that was used for the review
      if (reviewData?.id) {
        try {
          // Use the same deviceHashValue that was used for the review
          const hash = deviceHashValue;
          
          // Get points rule
          const { data: settings, error: settingsError } = await supabase
            .from('points_settings')
            .select('points_per_rating')
            .maybeSingle();
          
          if (settingsError) {
            console.error('Error fetching points settings:', settingsError);
          }
          
          const pointsToAward = settings?.points_per_rating || 10;
          
          // Get current points
          const { data: currentPoints, error: currentPointsError } = await supabase
            .from('user_points')
            .select('available_points, lifetime_points')
            .eq('device_hash', hash)
            .maybeSingle();
          
          if (currentPointsError && currentPointsError.code !== 'PGRST116') {
            console.error('Error fetching current points:', currentPointsError);
          }
          
          const newAvailable = (currentPoints?.available_points || 0) + pointsToAward;
          const newLifetime = (currentPoints?.lifetime_points || 0) + pointsToAward;
          
          // Upsert user_points
          const { error: upsertError } = await supabase
            .from('user_points')
            .upsert({
              device_hash: hash,
              available_points: newAvailable,
              lifetime_points: newLifetime,
              updated_at: new Date().toISOString()
            }, { onConflict: 'device_hash' });
          
          if (upsertError) {
            console.error('Error upserting user_points:', upsertError);
            throw upsertError;
          }
          
          // Record transaction (update to use review_id)
          const { error: transactionError } = await supabase
            .from('points_transaction')
            .insert({
              device_hash: hash,
              points_amount: pointsToAward,
              transaction_type: 'earn_rating',
              review_id: reviewData.id,
              description: 'Review submitted'
            });
          
          if (transactionError) {
            console.error('Error recording points transaction:', transactionError);
          }
          
          // Store points and schedule notification
          if (!upsertError) {
            setPointsEarned(pointsToAward);
            setTimeout(() => {
              setShowPointsNotification(true);
            }, 2000);
          }
        } catch (err) {
          console.error('Error awarding points:', err);
          // Don't block the thank you screen if points fail
        }
      }
    } catch (err) {
      console.error('Submit error:', err);
      const isNetworkError = err instanceof Error && 
                             (err.message.includes('network') || 
                              err.message.includes('fetch') ||
                              err.message.includes('Failed to fetch'));
      
      if (isNetworkError) {
        await enqueue(r);
        setSubmitError('No internet connection. Your review has been saved and will be submitted automatically when you have a connection.');
      } else {
        // Show actual error for debugging
        const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
        setSubmitError(`Error: ${errorMsg}`);
      }
      setSubmitLoading(false);
      return;
    } finally {
      setSubmitLoading(false);
    }
    
    // Only show tip prompt if submission was successful
    if (success) {
      setSubmitError('');
      setStars(0); 
      setTagRatings({}); 
      setSelectedTags([]);
      setComment('');
      setPhotos([]);
      setBusinessId(null);
      setQrCodeId(null);
      setThanks(true);
      setTimeout(() => setThanks(false), 1500);
    }
  };

  const handleTipComplete = () => {
    setShowTipPrompt(false);
    setLastRatingId(null);
    setTipDeviceHash(null);
    // Clear form fields after tip is complete
    setStars(0); 
    setTagRatings({}); 
    setSelectedTags([]);
    setComment('');
    setPhotos([]);
    setBusinessId(null);
    setQrCodeId(null);
    setThanks(true);
    setTimeout(() => setThanks(false), 1500);
  };

  const handleTipSkip = () => {
    setShowTipPrompt(false);
    setLastRatingId(null);
    setTipDeviceHash(null);
    // Clear form fields after tip is skipped
    setStars(0); 
    setTagRatings({}); 
    setSelectedTags([]);
    setComment('');
    setPhotos([]);
    setBusinessId(null);
    setQrCodeId(null);
    setThanks(true);
    setTimeout(() => setThanks(false), 1500);
  };

  const handleMenuNavigate = (screen: 'login' | 'dashboard' | 'profile' | 'home') => {
    setCurrentScreen(screen);
    // When navigating to home, clear business state to exit stats/rating views
    if (screen === 'home') {
      setBusinessId(null);
      setQrCodeId(null);
      setStats(null);
      setBusinessName('');
      setBusinessLogo(null);
      setBusinessCode('');
      setBusinessCodeError('');
      setScanError('');
      setStars(0);
      setTagRatings({});
      setSelectedTags([]);
      setComment('');
      setPhotos([]);
      setViewMode('rate'); // Reset to rate mode
    }
  };

  const handleMenuLogout = async () => {
    try {
      // Clear all app state first
      setBusinessId(null);
      setQrCodeId(null);
      setStats(null);
      setBusinessName('');
      setBusinessLogo(null);
      setBusinessCode('');
      setBusinessCodeError('');
      setScanError('');
      setStars(0);
      setTagRatings({});
      setSelectedTags([]);
      setComment('');
      setPhotos([]);
      setThanks(false);
      setSubmitError('');
      setShowPointsNotification(false);
      setPointsEarned(0);
      setUserHasCountry(false);
      
      // Set screen to home immediately to redirect right away
      setCurrentScreen('home');
      setUser(null);
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      await AsyncStorage.removeItem('supabase.auth.token');
    } catch (err) {
      console.error('Error logging out:', err);
      // Even if logout fails, ensure we're redirected to home and state is cleared
      setCurrentScreen('home');
      setUser(null);
      setBusinessId(null);
      setQrCodeId(null);
      setStats(null);
    }
  };

  // Theme toggle button component
  const ThemeToggleButton = () => (
    <TouchableOpacity 
      style={styles.themeToggleButton}
      onPress={toggleTheme}
    >
      <FontAwesome 
        name={isDark ? 'sun-o' : 'moon-o'} 
        size={20} 
        color={theme.iconColor} 
      />
    </TouchableOpacity>
  );


  // Helper component for star rating rows
  const StarRow = ({ value, onChange }: { value: number; onChange: (n: number) => void }) => {
    return (
      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity key={n} onPress={() => onChange(n)} style={styles.starButton}>
            <Text style={[styles.star, value >= n && styles.starSelected]}>★</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (thanks) {
    return (
      <View style={styles.center}>
        <View style={styles.successIcon}>
          <Text style={styles.checkmark}>✓</Text>
        </View>
        <Text style={styles.title}>Thank you!</Text>
        <Text style={styles.subtitle}>Your rating has been submitted.</Text>
      </View>
    );
  }

  if (scanning) {
    if (!permission) {
      return (
        <View style={[styles.center, styles.cameraBg]}>
          <Text style={styles.whiteText}>Requesting camera permission…</Text>
        </View>
      );
    }
    if (!permission.granted) {
      return (
        <View style={[styles.center, styles.cameraBg, styles.padding]}>
          <Text style={[styles.whiteText, styles.permissionTitle]}>Camera Access Required</Text>
          <Text style={[styles.whiteText, styles.permissionSubtitle]}>We need camera access to scan QR codes</Text>
          <Pressable
            onPress={requestPermission}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Grant Permission</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={onScan}
        />
        <View style={styles.cameraHeader}>
          <Pressable
            onPress={() => setScanning(false)}
            style={styles.backButton}
          >
            <Text style={styles.whiteText}>←</Text>
          </Pressable>
        </View>
        <View style={styles.cameraFooter}>
          <View style={styles.scanHint}>
            <Text style={[styles.whiteText, styles.scanTitle]}>Scan QR Code</Text>
            <Text style={[styles.whiteText, styles.scanSubtitle]}>Point your camera at the QR code inside the kombi</Text>
          </View>
        </View>
      </View>
    );
  }

  // Show login screen
  if (currentScreen === 'login') {
    return (
      <LoginScreen
        onLoginSuccess={() => {
          // The onAuthStateChange listener will handle the redirect to dashboard
          // We don't need to do anything here since we're now using the same Supabase client instance
          console.log('Login successful - waiting for auth state change event');
        }}
        onBack={() => {
          setCurrentScreen('home');
        }}
      />
    );
  }

  // Show dashboard screen
  if (currentScreen === 'dashboard') {
    return (
      <View style={{ flex: 1 }}>
        <ThemeToggleButton />
        <RiderDashboard
          user={user}
          onLogout={() => {
            setUser(null);
            setCurrentScreen('home');
          }}
          onNavigateProfile={() => {
            setCurrentScreen('profile');
          }}
          getDeviceHash={deviceHash.get}
        />
        <QuickLinksFooter 
          user={user}
          onNavigate={handleMenuNavigate}
          onLogout={handleMenuLogout}
        />
      </View>
    );
  }

  // Show profile screen
  if (currentScreen === 'profile') {
    return (
      <View style={{ flex: 1 }}>
        <ThemeToggleButton />
        <UserProfileScreen
          onLogout={() => {
            setUser(null);
            setCurrentScreen('home');
          }}
          onBack={() => {
            setCurrentScreen('home');
          }}
          getDeviceHash={deviceHash.get}
        />
        <QuickLinksFooter 
          user={user}
          onNavigate={handleMenuNavigate}
          onLogout={handleMenuLogout}
        />
      </View>
    );
  }

  // Show splash screen first
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // Show loading while checking auth
  if (loadingAuth) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!businessId) {
    return (
      <View style={styles.homeContainer}>
        <ThemeToggleButton />
        <ScrollView 
          style={styles.homeScrollContainer}
          contentContainerStyle={styles.homeScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.homeContent}>
            <View style={styles.iconContainer}>
              <FontAwesome name="qrcode" size={80} color="#2563eb" />
            </View>
            <Text style={styles.header}>QrRate</Text>
            {scanError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{scanError}</Text>
                <Pressable
                  onPress={() => setScanError('')}
                  style={styles.dismissErrorButton}
                >
                  <Text style={styles.dismissErrorText}>Dismiss</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          <View style={styles.toggleContainer}>
            <Switch
              value={viewMode === 'stats'}
              onValueChange={(value) => setViewMode(value ? 'stats' : 'rate')}
              trackColor={{ false: '#d1d5db', true: '#2563eb' }}
              thumbColor="#ffffff"
              ios_backgroundColor="#d1d5db"
            />
            <Text style={styles.toggleLabel}>{viewMode === 'rate' ? 'Rate Mode' : 'Stats Mode'}</Text>
          </View>
          
          <Pressable
            onPress={() => {
              setScanError(''); // Clear error when starting new scan
              setBusinessCodeError(''); // Clear business code errors too
              setScanning(true);
            }}
            style={styles.scanButton}
          >
            <Text style={styles.scanButtonText}>Scan QR Code</Text>
          </Pressable>

        </ScrollView>

        {/* Quick Links Footer */}
        <QuickLinksFooter 
          user={user}
          onNavigate={handleMenuNavigate}
          onLogout={handleMenuLogout}
        />

        {/* Country Picker Modal */}
        <Modal
          visible={showCountryPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCountryPicker(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowCountryPicker(false)}
          >
            <Pressable style={styles.countryModalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.countryModalHeader}>
                <Text style={styles.countryModalTitle}>Select Country</Text>
                <TouchableOpacity
                  onPress={() => setShowCountryPicker(false)}
                  style={styles.countryModalClose}
                >
                  <Text style={styles.countryModalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.countryModalList}>
                {countries.map((country) => (
                  <TouchableOpacity
                    key={country.code}
                    style={[
                      styles.countryOption,
                      countryCode === country.code && styles.countryOptionSelected
                    ]}
                    onPress={() => {
                      setCountryCode(country.code);
                      setShowCountryPicker(false);
                      setRegNumberError('');
                    }}
                  >
                    <Text style={styles.countryOptionText}>
                      {country.flag} {country.name}
                    </Text>
                    {countryCode === country.code && (
                      <FontAwesome name="check" size={16} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    );
  }

  // Debug: Log current state
  if (__DEV__) {
    console.log('Render check - businessId:', businessId, 'viewMode:', viewMode, 'businessName:', businessName);
  }

  // Show stats view if in stats mode
  if (viewMode === 'stats' && businessId) {
    return (
      <View style={styles.ratingPageContainer}>
        <ThemeToggleButton />
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.statsContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.statsHeader}>
            <Pressable
              onPress={() => {
                setBusinessId(null);
                setQrCodeId(null);
                setStats(null);
                setBusinessName('');
                setBusinessLogo(null);
              }}
              style={styles.backButtonStats}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </Pressable>
            <Text style={styles.statsTitle}>Business Stats</Text>
            {businessName ? (
              <Text style={styles.statsSubtitle}>{businessName}</Text>
            ) : null}
          </View>

        {loadingStats ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Loading stats...</Text>
          </View>
        ) : stats ? (
          <View>
            <View style={styles.statsCard}>
              <Text style={styles.statsCardTitle}>Overall Rating</Text>
              <View style={styles.statsStarsContainer}>
                <Text style={styles.statsStarsValue}>{stats.avgStars.toFixed(1)}</Text>
                <View style={styles.statsStarsRow}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Text
                      key={n}
                      style={[
                        styles.statsStar,
                        stats.avgStars >= n && styles.statsStarSelected
                      ]}
                    >
                      ★
                    </Text>
                  ))}
                </View>
              </View>
              <Text style={styles.statsCardSubtext}>
                Based on {stats.numRatings} {stats.numRatings === 1 ? 'rating' : 'ratings'}
              </Text>
            </View>

            <View style={styles.statsCard}>
              <Text style={styles.statsCardTitle}>Average by Category</Text>
              {TAGS.map((tag) => {
                const avg = stats.tagAverages[tag] || 0;
                const hasRating = avg > 0;
                return (
                  <View key={tag} style={styles.tagStatRow}>
                    <Text style={styles.tagStatLabel}>{tag}</Text>
                    <View style={styles.tagStatStars}>
                      {hasRating ? (
                        <>
                          <Text style={[styles.tagStatValue, { marginRight: 8 }]}>{avg.toFixed(1)}</Text>
                          <View style={styles.tagStatStarsRow}>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Text
                                key={n}
                                style={[
                                  styles.tagStatStar,
                                  avg >= n && styles.tagStatStarSelected
                                ]}
                              >
                                ★
                              </Text>
                            ))}
                          </View>
                        </>
                      ) : (
                        <Text style={styles.noTagRatingText}>No ratings yet</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {stats.recentComments.length > 0 && (
              <View style={styles.statsCard}>
                <Text style={styles.statsCardTitle}>Recent Comments</Text>
                {stats.recentComments.map((item, idx) => (
                  <View key={idx} style={styles.commentItem}>
                    <View style={styles.commentHeader}>
                      <View style={styles.commentStars}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Text
                            key={n}
                            style={[
                              styles.commentStar,
                              item.stars >= n && styles.commentStarSelected
                            ]}
                          >
                            ★
                          </Text>
                        ))}
                      </View>
                      <Text style={styles.commentDate}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={styles.commentText}>{item.comment}</Text>
                  </View>
                ))}
              </View>
            )}

            {stats.numRatings === 0 && (
              <View style={styles.statsCard}>
                <Text style={styles.noDataText}>No reviews yet for this business.</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.center}>
            {scanError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{scanError}</Text>
              </View>
            ) : (
              <Text style={styles.errorText}>Unable to load stats. Please try again.</Text>
            )}
            <Pressable
              onPress={() => {
                setBusinessId(null);
                setQrCodeId(null);
                setStats(null);
                setBusinessName('');
                setBusinessLogo(null);
                setScanError('');
              }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Go Back</Text>
            </Pressable>
          </View>
        )}
        </ScrollView>
        
        {/* Quick Links Footer */}
        <QuickLinksFooter 
          user={user}
          onNavigate={handleMenuNavigate}
          onLogout={handleMenuLogout}
        />
      </View>
    );
  }

  return (
    <View style={styles.ratingPageContainer}>
      <ThemeToggleButton />
      <View style={styles.headerContainer}>
        <View style={styles.ratingHeader}>
          <Text style={styles.ratingTitle}>{businessName || 'QrRate'}</Text>
          <Text style={styles.ratingSubtitle}>Share your experience</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <StarRow value={stars} onChange={setStars} />
        </View>

        <View style={styles.section}>
          {TAGS.map((tag) => (
            <View key={tag} style={styles.tagRatingRow}>
              <Text style={styles.tagLabel}>{tag}</Text>
              <View style={styles.tagStarRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => setTagRatings((prev) => ({ ...prev, [tag]: n }))}
                    style={styles.tagStarButton}
                  >
                    <Text style={[styles.tagStar, (tagRatings[tag] || 0) >= n && styles.tagStarSelected]}>
                      ★
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <TextInput
            placeholder="Add a comment (optional)"
            value={comment}
            maxLength={180}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            style={styles.input}
            placeholderTextColor="#9ca3af"
          />
          <Text style={styles.charCount}>{comment.length}/180</Text>
        </View>

      {submitError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{submitError}</Text>
          <Pressable
            onPress={() => setSubmitError('')}
            style={styles.dismissErrorButton}
          >
            <Text style={styles.dismissErrorText}>Dismiss</Text>
          </Pressable>
        </View>
      ) : null}

        <View style={styles.section}>
          <Pressable
            onPress={submit}
            disabled={stars < 1 || submitLoading}
            style={[styles.submitButton, (stars < 1 || submitLoading) && styles.submitButtonDisabled]}
          >
            {submitLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={[styles.submitButtonText, stars < 1 && styles.submitButtonTextDisabled]}>
                Submit Review
              </Text>
            )}
          </Pressable>
        </View>

        <View style={styles.submitButtonSpacer} />
      </ScrollView>

      {/* Quick Links Footer */}
      <QuickLinksFooter 
        user={user}
        onNavigate={handleMenuNavigate}
        onLogout={handleMenuLogout}
      />

      {/* Tipping disabled for now */}

      {/* Points Earned Notification */}
      <PointsEarnedNotification
        visible={showPointsNotification}
        pointsEarned={pointsEarned}
        onDismiss={() => setShowPointsNotification(false)}
      />
    </View>
  );
}

export default function App() {
  // Tipping disabled - Stripe not needed
  // If re-enabling tipping, uncomment below:
  // const stripePublishableKey = getStripePublishableKey?.();
  // if (StripeProvider && stripePublishableKey) {
  //   return (
  //     <StripeProvider publishableKey={stripePublishableKey}>
  //       <ThemeProvider>
  //         <AppContent />
  //       </ThemeProvider>
  //     </StripeProvider>
  //   );
  // }
  
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
