import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Pressable, ScrollView, Switch, ActivityIndicator, LogBox } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
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

// Configure Supabase via app.json extra or env – replace placeholders when deploying
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;
const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '');

type PendingRating = {
  vehicle_id: string;
  route_id?: string | null;
  stars: number;
  tag_ratings: Record<string, number>; // e.g., { "Cleanliness": 4, "Driving safety": 5 }
  comment?: string;
  device_hash: string;
  created_at: string;
};

const TAGS = ['Cleanliness', 'Driving safety', 'Friendliness', 'Punctuality'];

// UUID validation regex (matches standard UUID format)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isValidUUID = (str: string | null | undefined): boolean => {
  return !!str && UUID_REGEX.test(str);
};

type VehicleStats = {
  avgStars: number;
  numRatings: number;
  tagAverages: Record<string, number>;
  recentComments: Array<{ comment: string; stars: number; created_at: string }>;
};

function AppContent() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [viewMode, setViewMode] = useState<'rate' | 'stats'>('rate');
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [routeId, setRouteId] = useState<string | null>(null);
  const [regNumber, setRegNumber] = useState('');
  const [regNumberError, setRegNumberError] = useState('');
  const [scanError, setScanError] = useState('');
  const [stars, setStars] = useState(0);
  const [tagRatings, setTagRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [thanks, setThanks] = useState(false);
  const [stats, setStats] = useState<VehicleStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [vehicleRegNumber, setVehicleRegNumber] = useState<string>('');
  const [submitError, setSubmitError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [duplicateRatingError, setDuplicateRatingError] = useState(false);
  const [showTipPrompt, setShowTipPrompt] = useState(false);
  const [lastRatingId, setLastRatingId] = useState<string | null>(null);
  const [tipDeviceHash, setTipDeviceHash] = useState<string | null>(null);

  const queueKey = 'pending_ratings_v1';

  const syncQueuedRatings = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(queueKey);
      if (!stored) return;
      
      const payload: PendingRating[] = JSON.parse(stored);
      if (!payload.length) return;
      
      // Filter out any ratings with invalid UUIDs
      const validRatings = payload.filter(r => {
        const isValid = isValidUUID(r.vehicle_id);
        return isValid;
      });
      
      if (!validRatings.length) {
        // All ratings were invalid, clear the queue
        await AsyncStorage.removeItem(queueKey);
        return;
      }
      
      // Clean up route_id in valid ratings
      const cleanedRatings = validRatings.map(r => ({
        ...r,
        route_id: r.route_id && isValidUUID(r.route_id) ? r.route_id : null
      }));
      
      const { error } = await supabase.from('rating').insert(cleanedRatings);
      if (!error) {
        await AsyncStorage.removeItem(queueKey);
      }
    } catch (error) {
      // If we can't read/write to storage or parse JSON, just continue silently
    }
  }, []);

  useEffect(() => {
    // try to send any queued ratings at startup
    syncQueuedRatings();
  }, [syncQueuedRatings]);

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

  const fetchVehicleStats = useCallback(async (vId: string) => {
    setLoadingStats(true);
    setStats(null);
    setScanError(''); // Clear any previous errors
    try {
      // Fetch vehicle reg number
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicle')
        .select('reg_number')
        .eq('id', vId)
        .maybeSingle();
      
      if (vehicleError) {
        throw new Error('Unable to fetch vehicle information');
      }
      
      if (vehicleData) {
        setVehicleRegNumber(vehicleData.reg_number);
      }

      // Fetch overall stats from view
      const { data: viewData, error: viewError } = await supabase
        .from('vehicle_avg_last_7d')
        .select('avg_stars, num_ratings')
        .eq('vehicle_id', vId)
        .maybeSingle();

      // View data error is non-critical, continue without it

      // Fetch all ratings for this vehicle
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('rating')
        .select('stars, tag_ratings, comment, created_at')
        .eq('vehicle_id', vId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (ratingsError) {
        throw new Error('Unable to fetch ratings');
      }

      // Calculate overall stats
      const allRatings = ratingsData || [];
      const avgStars = viewData?.avg_stars 
        ? parseFloat(viewData.avg_stars.toString()) 
        : allRatings.length > 0
          ? allRatings.reduce((sum, r) => sum + r.stars, 0) / allRatings.length
          : 0;
      const numRatings = viewData?.num_ratings || allRatings.length;

      // Calculate tag averages
      const tagAverages: Record<string, number> = {};
      const tagCounts: Record<string, number> = {};
      
      allRatings.forEach(rating => {
        if (rating.tag_ratings && typeof rating.tag_ratings === 'object') {
          Object.entries(rating.tag_ratings).forEach(([tag, stars]) => {
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
      const recentComments = allRatings
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
      setScanError('Unable to load vehicle statistics. Please check your connection and try again.');
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const onScan = async (result: BarcodeScanningResult) => {
    const data = result.data;
    // Accept formats: kombirate://v/<vehicleId> or raw vehicle id
    let scannedVehicleId: string | null = null;
    try {
      if (data.startsWith('kombirate://')) {
        const url = new URL(data);
        const segs = url.pathname.split('/').filter(Boolean);
        if (segs[0] === 'v' && segs[1]) {
          scannedVehicleId = segs[1];
        }
      } else {
        scannedVehicleId = data;
      }
    } catch {
      scannedVehicleId = data;
    }
    
    // Validate that scannedVehicleId is a valid UUID before proceeding
    if (!scannedVehicleId || !isValidUUID(scannedVehicleId)) {
      setScanError('Invalid QR code. Please scan a valid vehicle QR code.');
      setScanning(false);
      return;
    }
    
    if (scannedVehicleId) {
      // Fetch vehicle to get route_id and reg_number
      try {
        const { data: vehicleData } = await supabase
          .from('vehicle')
          .select('id, route_id, reg_number')
          .eq('id', scannedVehicleId)
          .eq('is_active', true)
          .maybeSingle();
        
        if (vehicleData) {
          setVehicleId(vehicleData.id);
          setRouteId(vehicleData.route_id);
          setVehicleRegNumber(vehicleData.reg_number);
          setScanError(''); // Clear any previous errors
          if (viewMode === 'stats') {
            await fetchVehicleStats(vehicleData.id);
          }
        } else {
          // Vehicle not found - show error message
          setScanError('Vehicle not found. This QR code may be invalid or the vehicle may have been removed.');
          setVehicleId(null);
          setRouteId(null);
          setVehicleRegNumber('');
        }
      } catch (err) {
        const errorMessage = err instanceof Error && err.message.includes('network')
          ? 'Network error. Please check your connection and try again.'
          : 'Unable to look up vehicle. Please try again.';
        setScanError(errorMessage);
        setVehicleId(null);
        setRouteId(null);
        setVehicleRegNumber('');
      }
    }
    setScanning(false);
  };

  const handleRegNumberSubmit = async () => {
    const trimmed = regNumber.trim().toUpperCase();
    if (!trimmed) {
      setRegNumberError('Please enter a registration number');
      return;
    }
    setRegNumberError('');
    try {
      // First, try to find existing vehicle
      let { data, error } = await supabase
        .from('vehicle')
        .select('id, route_id, reg_number')
        .eq('reg_number', trimmed)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" which is fine, other errors are real problems
        const errorMessage = error.message?.includes('network') || error.message?.includes('fetch')
          ? 'Network error. Please check your connection and try again.'
          : 'Unable to search. Please try again.';
        setRegNumberError(errorMessage);
        return;
      }
      
      // If vehicle doesn't exist, create it
      if (!data) {
        const { data: newVehicle, error: createError } = await supabase
          .from('vehicle')
          .insert({ reg_number: trimmed, is_active: true })
          .select('id, route_id, reg_number')
          .single();
        
        if (createError) {
          // Check if it's a unique constraint violation (vehicle was created between check and insert)
          if (createError.code === '23505') {
            // Try fetching again
            const { data: retryData } = await supabase
              .from('vehicle')
              .select('id, route_id, reg_number')
              .eq('reg_number', trimmed)
              .eq('is_active', true)
              .maybeSingle();
            if (retryData) {
              data = retryData;
            } else {
              setRegNumberError('Unable to register vehicle. Please try again.');
              return;
            }
          } else {
            setRegNumberError('Unable to register vehicle. Please try again.');
            return;
          }
        } else if (newVehicle) {
          data = newVehicle;
        } else {
          setRegNumberError('Unable to register vehicle. Please try again.');
          return;
        }
      }
      
      // Validate that we got a valid UUID from the database
      if (!data || !isValidUUID(data.id)) {
        setRegNumberError('Invalid vehicle data received. Please try again.');
        return;
      }
      
      setVehicleId(data.id);
      setRouteId(data.route_id && isValidUUID(data.route_id) ? data.route_id : null);
      setVehicleRegNumber(data.reg_number);
      setRegNumber('');
      setRegNumberError(''); // Clear any errors on success
      if (viewMode === 'stats') {
        await fetchVehicleStats(data.id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error && (err.message.includes('network') || err.message.includes('fetch'))
        ? 'Network error. Please check your connection and try again.'
        : 'Unable to process. Please try again.';
      setRegNumberError(errorMessage);
    }
  };

  const enqueue = async (r: PendingRating) => {
    try {
      const stored = await AsyncStorage.getItem(queueKey);
      const arr = stored ? JSON.parse(stored) : [];
      arr.push(r);
      await AsyncStorage.setItem(queueKey, JSON.stringify(arr));
    } catch (error) {
      // If we can't queue, we'll just lose this rating - better than crashing
    }
  };

  const submit = async () => {
    if (!vehicleId || stars < 1) return;
    
    setSubmitError('');
    setSubmitLoading(true);
    
    // Validate UUIDs before submitting
    if (!isValidUUID(vehicleId)) {
      setSubmitError('Invalid vehicle information. Please try scanning again.');
      setSubmitLoading(false);
      return;
    }
    
    // Only include route_id if it's a valid UUID
    const validRouteId = routeId && isValidUUID(routeId) ? routeId : null;
    
    let deviceHashValue: string;
    try {
      deviceHashValue = await deviceHash.get();
    } catch (error) {
      setSubmitError('Unable to process rating. Please try again.');
      setSubmitLoading(false);
      return;
    }
    
    const r: PendingRating = {
      vehicle_id: vehicleId,
      route_id: validRouteId,
      stars,
      tag_ratings: tagRatings,
      comment: comment.trim() || undefined,
      device_hash: deviceHashValue,
      created_at: new Date().toISOString()
    };
    let success = false;
    try {
      // Convert tag_ratings to tags array for backward compatibility
      const tagsArray = Object.entries(tagRatings)
        .filter(([_, rating]) => rating > 0)
        .map(([tag, _]) => tag);
      
      // Build insert payload - only include tag_ratings if we have ratings
      const insertPayload: any = {
        vehicle_id: r.vehicle_id,
        stars: r.stars,
        tags: tagsArray, // Tags that were rated (for backward compatibility)
        comment: r.comment,
        device_hash: r.device_hash,
        created_at: r.created_at
      };
      
      // Only include route_id if it's valid
      if (validRouteId) {
        insertPayload.route_id = validRouteId;
      }
      
      // Try to include tag_ratings if we have any
      // If column doesn't exist, we'll retry without it
      if (Object.keys(tagRatings).length > 0) {
        insertPayload.tag_ratings = tagRatings;
      }
      
      let { data: ratingData, error } = await supabase.from('rating').insert(insertPayload).select('id').single();
      
      // If error is about missing tag_ratings column, retry without it
      // The column needs to be added to the database for tag ratings to work
      if (error && (error.code === 'PGRST204' || error.code === '42703') && 
          (error.message?.includes('tag_ratings') || error.message?.includes('column'))) {
        // Remove tag_ratings and retry without it (ratings will still save, just without individual tag ratings)
        const retryPayload = { ...insertPayload };
        delete retryPayload.tag_ratings;
        const retryResult = await supabase.from('rating').insert(retryPayload).select('id').single();
        error = retryResult.error;
        ratingData = retryResult.data;
      }
      
      if (error) {
        
        // Handle duplicate rating constraint (user already rated this vehicle in this hour)
        if (error.code === '23505' && error.message?.includes('uniq_rating_device_vehicle_hour')) {
          setDuplicateRatingError(true);
          setSubmitError('');
          setSubmitLoading(false);
          // Reset the form
          setStars(0);
          setTagRatings({});
          setComment('');
          return;
        }
        
        await enqueue(r);
        const errorMessage = error.message?.includes('network') || error.message?.includes('fetch') || error.code === 'PGRST301'
          ? 'No internet connection. Your rating has been saved and will be submitted automatically when you have a connection.'
          : 'Unable to submit rating. Your rating has been saved and will be submitted when you have a connection.';
        setSubmitError(errorMessage);
        setSubmitLoading(false);
        return;
      }
      
      // Success!
      success = true;
    } catch (err) {
      await enqueue(r);
      const errorMessage = err instanceof Error && (err.message.includes('network') || err.message.includes('fetch'))
        ? 'No internet connection. Your rating has been saved and will be submitted automatically when you have a connection.'
        : 'Unable to submit rating. Your rating has been saved and will be submitted when you have a connection.';
      setSubmitError(errorMessage);
      setSubmitLoading(false);
      return;
    } finally {
      setSubmitLoading(false);
    }
    
    // Only show tip prompt if submission was successful
    if (success) {
      setSubmitError('');
      setDuplicateRatingError(false);
      // Tipping disabled for now - go straight to thanks screen
      setStars(0); 
      setTagRatings({}); 
      setComment('');
      setVehicleId(null);
      setRouteId(null);
      setThanks(true);
      setTimeout(() => setThanks(false), 1500);
      
      // Tipping code (disabled):
      // setLastRatingId(ratingData?.id || null);
      // try {
      //   const hash = await deviceHash.get();
      //   setTipDeviceHash(hash);
      //   setShowTipPrompt(true);
      // } catch (error) {
      //   setStars(0); 
      //   setTagRatings({}); 
      //   setComment('');
      //   setVehicleId(null);
      //   setRouteId(null);
      //   setThanks(true);
      //   setTimeout(() => setThanks(false), 1500);
      // }
    }
  };

  const handleTipComplete = () => {
    setShowTipPrompt(false);
    setLastRatingId(null);
    setTipDeviceHash(null);
    // Clear form fields after tip is complete
    setStars(0); 
    setTagRatings({}); 
    setComment('');
    setVehicleId(null);
    setRouteId(null);
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
    setComment('');
    setVehicleId(null);
    setRouteId(null);
    setThanks(true);
    setTimeout(() => setThanks(false), 1500);
  };

  if (thanks) {
    return (
      <View style={styles.center}>
        <View style={styles.successIcon}>
          <Text style={styles.checkmark}>✓</Text>
        </View>
        <Text style={styles.title}>Thank you!</Text>
        <Text style={styles.subtitle}>Your rating has been submitted.</Text>
        <Pressable
          onPress={() => { setScanning(true); setThanks(false); }}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Rate another Kombi</Text>
        </Pressable>
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

  if (!vehicleId) {
    return (
      <View style={styles.homeContainer}>
        <ScrollView 
          style={styles.homeScrollContainer}
          contentContainerStyle={styles.homeScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.homeContent}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>🚐</Text>
            </View>
            <Text style={styles.header}>RateMyRide</Text>
            <Text style={styles.subtitle}>
              Scan the QR code or enter the registration number to {viewMode === 'rate' ? 'rate' : 'view stats for'} this ride
            </Text>
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
            <Text style={styles.toggleLabel}>Rate vehicle</Text>
            <View style={{ marginHorizontal: 12 }}>
              <Switch
                value={viewMode === 'stats'}
                onValueChange={(value) => setViewMode(value ? 'stats' : 'rate')}
                trackColor={{ false: '#d1d5db', true: '#2563eb' }}
                thumbColor="#ffffff"
                ios_backgroundColor="#d1d5db"
              />
            </View>
            <Text style={styles.toggleLabel}>View stats</Text>
          </View>
          
          <Pressable
            onPress={() => {
              setScanError(''); // Clear error when starting new scan
              setRegNumberError(''); // Clear reg number errors too
              setScanning(true);
            }}
            style={styles.scanButton}
          >
            <Text style={styles.scanButtonText}>📷 Scan QR Code</Text>
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.inputSection}>
            <TextInput
              placeholder="e.g., ABC1234"
              value={regNumber}
              onChangeText={(text) => {
                setRegNumber(text.toUpperCase());
                setRegNumberError('');
              }}
              style={[styles.regInput, regNumberError && styles.regInputError]}
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Text style={styles.inputLabel}>Enter registration number</Text>
            {regNumberError ? (
              <Text style={styles.errorText}>{regNumberError}</Text>
            ) : null}
          </View>
          <View style={styles.submitRegButtonSpacer} />
        </ScrollView>

        <View style={styles.homeFooterContainer}>
          <Pressable
            onPress={handleRegNumberSubmit}
            style={[styles.submitRegButton, !regNumber.trim() && styles.submitRegButtonDisabled]}
            disabled={!regNumber.trim()}
          >
            <Text style={[styles.submitRegButtonText, !regNumber.trim() && styles.submitRegButtonTextDisabled]}>
              🔍 Search
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Show stats view if in stats mode
  if (viewMode === 'stats' && vehicleId) {
    return (
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.statsContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsHeader}>
          <Pressable
            onPress={() => {
              setVehicleId(null);
              setRouteId(null);
              setStats(null);
              setVehicleRegNumber('');
            }}
            style={styles.backButtonStats}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
          <Text style={styles.statsTitle}>Vehicle Stats</Text>
          {vehicleRegNumber ? (
            <Text style={styles.statsSubtitle}>{vehicleRegNumber}</Text>
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
                <Text style={styles.noDataText}>No ratings yet for this vehicle.</Text>
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
                setVehicleId(null);
                setRouteId(null);
                setStats(null);
                setVehicleRegNumber('');
                setScanError('');
              }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Go Back</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    );
  }

  return (
    <View style={styles.ratingPageContainer}>
      <View style={styles.headerContainer}>
        <View style={styles.ratingHeader}>
          <Text style={styles.ratingTitle}>RateMyRide</Text>
          <Text style={styles.ratingSubtitle}>Share your experience</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {duplicateRatingError ? (
          <DuplicateRatingMessage onDismiss={() => {
            setDuplicateRatingError(false);
            setVehicleId(null);
            setRouteId(null);
            setVehicleRegNumber('');
            setStars(0);
            setTagRatings({});
            setComment('');
          }} />
        ) : null}

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

        <View style={styles.submitButtonSpacer} />
      </ScrollView>

      <View style={styles.footerContainer}>
        <Pressable
          onPress={submit}
          disabled={stars < 1 || submitLoading}
          style={[styles.submitButton, (stars < 1 || submitLoading) && styles.submitButtonDisabled]}
        >
          {submitLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={[styles.submitButtonText, stars < 1 && styles.submitButtonTextDisabled]}>
              Submit Rating
            </Text>
          )}
        </Pressable>
      </View>

      {/* Tipping disabled for now */}
      {false && showTipPrompt && vehicleId && tipDeviceHash && (
        <TipPrompt
          vehicleId={vehicleId}
          ratingId={lastRatingId}
          routeId={routeId}
          vehicleRegNumber={vehicleRegNumber}
          deviceHash={tipDeviceHash}
          onComplete={handleTipComplete}
          onSkip={handleTipSkip}
        />
      )}
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
  //       <AppContent />
  //     </StripeProvider>
  //   );
  // }
  
  return <AppContent />;
}

function StarRow({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => onChange(n)} style={styles.starButton}>
          <Text style={[styles.star, value >= n && styles.starSelected]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function DuplicateRatingMessage({ onDismiss }: { onDismiss: () => void }) {
  return (
    <View style={styles.duplicateRatingContainer}>
      <View style={styles.duplicateRatingIcon}>
        <Text style={styles.duplicateRatingIconText}>✓</Text>
      </View>
      <View style={styles.duplicateRatingContent}>
        <Text style={styles.duplicateRatingTitle}>Thank you for your feedback!</Text>
        <Text style={styles.duplicateRatingMessage}>
          You've already rated this vehicle. You can submit another rating in an hour.
        </Text>
      </View>
      <Pressable
        onPress={onDismiss}
        style={styles.duplicateRatingDismiss}
      >
        <Text style={styles.duplicateRatingDismissText}>Got it</Text>
      </Pressable>
    </View>
  );
}


const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  ratingPageContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    backgroundColor: '#f8fafc',
    padding: 20,
    paddingTop: 140,
    paddingBottom: 100,
  },
  statsContainer: {
    backgroundColor: '#f8fafc',
    padding: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  homeContainer: {
    flex: 1,
    backgroundColor: '#f0f4f8',
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
    marginBottom: 48,
  },
  iconContainer: {
    width: 96,
    height: 96,
    backgroundColor: '#2563eb',
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
  icon: {
    fontSize: 48,
  },
  header: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 12,
  },
  scanButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 20,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    marginBottom: 24,
  },
  scanButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
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
    color: '#10b981',
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f8fafc',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
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
    color: '#0f172a',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  ratingSubtitle: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  section: {
    marginBottom: 28,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
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
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    color: '#0f172a',
    minHeight: 110,
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  charCount: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'right',
  },
  submitButtonSpacer: {
    height: 20,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical: 22,
    borderRadius: 16,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
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
    color: '#6b7280',
  },
  button: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
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
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  regInput: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 18,
    fontSize: 18,
    color: '#0f172a',
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  regInputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    marginBottom: 8,
    maxWidth: 320,
    width: '100%',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  duplicateRatingContainer: {
    backgroundColor: '#f0fdf4',
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
    color: '#10b981',
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
    color: '#10b981',
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
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  submitRegButtonSpacer: {
    height: 20,
  },
  homeFooterContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f0f4f8',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
    alignItems: 'center',
  },
  submitRegButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 20,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  submitRegButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  submitRegButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  submitRegButtonTextDisabled: {
    color: '#6b7280',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#d1d5db',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
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
    backgroundColor: '#2563eb',
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
    color: '#111827',
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
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  statsSubtitle: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  statsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  statsCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  statsCardSubtext: {
    fontSize: 14,
    color: '#6b7280',
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
    color: '#111827',
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
    borderBottomColor: '#e5e7eb',
  },
  tagStatLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  tagStatStars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
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
    borderBottomColor: '#e5e7eb',
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
    color: '#9ca3af',
  },
  commentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  noDataText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    padding: 20,
  },
  noTagRatingText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
});




