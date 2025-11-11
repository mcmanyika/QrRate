import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Pressable, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

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

type VehicleStats = {
  avgStars: number;
  numRatings: number;
  tagAverages: Record<string, number>;
  recentComments: Array<{ comment: string; stars: number; created_at: string }>;
};

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [viewMode, setViewMode] = useState<'rate' | 'stats'>('rate');
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [routeId, setRouteId] = useState<string | null>(null);
  const [regNumber, setRegNumber] = useState('');
  const [regNumberError, setRegNumberError] = useState('');
  const [stars, setStars] = useState(0);
  const [tagRatings, setTagRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [thanks, setThanks] = useState(false);
  const [stats, setStats] = useState<VehicleStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [vehicleRegNumber, setVehicleRegNumber] = useState<string>('');

  const queueKey = 'pending_ratings_v1';

  const syncQueuedRatings = useCallback(async () => {
    const payload: PendingRating[] = JSON.parse((await AsyncStorage.getItem(queueKey)) || '[]');
    if (!payload.length) return;
    try {
      const { error } = await supabase.from('rating').insert(payload);
      if (!error) {
        await AsyncStorage.removeItem(queueKey);
      }
    } catch {
      // swallow; will retry later
    }
  }, []);

  useEffect(() => {
    // try to send any queued ratings at startup
    syncQueuedRatings();
  }, [syncQueuedRatings]);

  const deviceHash = useMemo(() => {
    // Very simple per-install id persisted in storage
    const key = 'device_hash_v1';
    let cached: string | null = null;
    return {
      get: async () => {
        if (cached) return cached;
        const v = await AsyncStorage.getItem(key);
        if (v) { cached = v; return v; }
        const gen = Math.random().toString(36).slice(2) + Date.now().toString(36);
        await AsyncStorage.setItem(key, gen);
        cached = gen;
        return gen;
      }
    };
  }, []);

  const fetchVehicleStats = useCallback(async (vId: string) => {
    setLoadingStats(true);
    setStats(null);
    try {
      // Fetch vehicle reg number
      const { data: vehicleData } = await supabase
        .from('vehicle')
        .select('reg_number')
        .eq('id', vId)
        .maybeSingle();
      
      if (vehicleData) {
        setVehicleRegNumber(vehicleData.reg_number);
      }

      // Fetch overall stats from view
      const { data: viewData } = await supabase
        .from('vehicle_avg_last_7d')
        .select('avg_stars, num_ratings')
        .eq('vehicle_id', vId)
        .maybeSingle();

      // Fetch all ratings for this vehicle
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('rating')
        .select('stars, tag_ratings, comment, created_at')
        .eq('vehicle_id', vId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (ratingsError) {
        console.error('Error fetching ratings:', ratingsError);
        setLoadingStats(false);
        return;
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
      console.error('Error fetching vehicle stats:', error);
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
          if (viewMode === 'stats') {
            await fetchVehicleStats(vehicleData.id);
          }
        } else {
          setVehicleId(scannedVehicleId);
          setRouteId(null);
          setVehicleRegNumber('');
        }
      } catch {
        setVehicleId(scannedVehicleId);
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
        setRegNumberError('Unable to search. Please try again.');
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
      
      setVehicleId(data.id);
      setRouteId(data.route_id);
      setVehicleRegNumber(data.reg_number);
      setRegNumber('');
      if (viewMode === 'stats') {
        await fetchVehicleStats(data.id);
      }
    } catch (err) {
      setRegNumberError('Unable to process. Please try again.');
    }
  };

  const enqueue = async (r: PendingRating) => {
    const arr = JSON.parse((await AsyncStorage.getItem(queueKey)) || '[]');
    arr.push(r);
    await AsyncStorage.setItem(queueKey, JSON.stringify(arr));
  };

  const submit = async () => {
    if (!vehicleId || stars < 1) return;
    const r: PendingRating = {
      vehicle_id: vehicleId,
      route_id: routeId,
      stars,
      tag_ratings: tagRatings,
      comment: comment.trim() || undefined,
      device_hash: await deviceHash.get(),
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
        route_id: r.route_id,
        stars: r.stars,
        tags: tagsArray, // Tags that were rated (for backward compatibility)
        comment: r.comment,
        device_hash: r.device_hash,
        created_at: r.created_at
      };
      
      // Try to include tag_ratings if we have any
      // If column doesn't exist, we'll retry without it
      if (Object.keys(tagRatings).length > 0) {
        insertPayload.tag_ratings = tagRatings;
      }
      
      let { error } = await supabase.from('rating').insert(insertPayload);
      
      // If error is about missing tag_ratings column, log warning but don't retry
      // The column needs to be added to the database for tag ratings to work
      if (error && (error.code === 'PGRST204' || error.code === '42703') && 
          (error.message?.includes('tag_ratings') || error.message?.includes('column'))) {
        console.warn('tag_ratings column not found. Please add it to the database. Falling back to tags array only.');
        // Remove tag_ratings and retry without it (ratings will still save, just without individual tag ratings)
        const retryPayload = { ...insertPayload };
        delete retryPayload.tag_ratings;
        const retryResult = await supabase.from('rating').insert(retryPayload);
        error = retryResult.error;
      }
      
      if (error) {
        console.error('Rating submission error:', error);
        await enqueue(r);
        // Don't show thanks screen on error - just queue it for later
        return;
      }
      
      // Success!
      success = true;
    } catch (err) {
      console.error('Rating submission exception:', err);
      await enqueue(r);
      // Don't show thanks screen on error - just queue it for later
      return;
    }
    
    // Only show thanks screen if submission was successful
    if (success) {
      setStars(0); 
      setTagRatings({}); 
      setComment(''); 
      setVehicleId(null); 
      setRouteId(null); 
      setThanks(true);
      setTimeout(() => setThanks(false), 1500);
    }
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
        <View style={styles.homeContent}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🚐</Text>
          </View>
          <Text style={styles.header}>RateMyRide</Text>
          <Text style={styles.subtitle}>
            Scan the QR code or enter the registration number to {viewMode === 'rate' ? 'rate' : 'view stats for'} this ride
          </Text>
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
          onPress={() => setScanning(true)}
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
          <Pressable
            onPress={handleRegNumberSubmit}
            style={[styles.submitRegButton, !regNumber.trim() && styles.submitRegButtonDisabled]}
            disabled={!regNumber.trim()}
          >
            <Text style={[styles.submitRegButtonText, !regNumber.trim() && styles.submitRegButtonTextDisabled]}>
              Submit
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
        contentContainerStyle={styles.container}
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
            <Text style={styles.errorText}>Unable to load stats. Please try again.</Text>
            <Pressable
              onPress={() => {
                setVehicleId(null);
                setRouteId(null);
                setStats(null);
                setVehicleRegNumber('');
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
    <ScrollView 
      style={styles.scrollContainer}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.ratingHeader}>
        <Text style={styles.ratingTitle}>Rate Kombi</Text>
        <Text style={styles.ratingSubtitle}>Share your experience</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rating</Text>
        <StarRow value={stars} onChange={setStars} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rate each aspect</Text>
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
        <Text style={styles.sectionTitle}>Comment</Text>
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

      <Pressable
        onPress={submit}
        disabled={stars < 1}
        style={[styles.submitButton, stars < 1 && styles.submitButtonDisabled]}
      >
        <Text style={[styles.submitButtonText, stars < 1 && styles.submitButtonTextDisabled]}>
          Submit Rating
        </Text>
      </Pressable>
    </ScrollView>
  );
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


const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    backgroundColor: '#ffffff',
    padding: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  homeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    padding: 24,
  },
  homeContent: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 96,
    height: 96,
    backgroundColor: '#2563eb',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
  ratingHeader: {
    marginBottom: 24,
    marginTop: 16,
  },
  ratingTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  ratingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  section: {
    marginBottom: 24,
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
  },
  starButton: {
    padding: 8,
  },
  star: {
    fontSize: 48,
    color: '#d1d5db',
    marginRight: 4,
  },
  starSelected: {
    color: '#fbbf24',
  },
  tagRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 8,
  },
  tagLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
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
    fontSize: 28,
    color: '#d1d5db',
    marginRight: 2,
  },
  tagStarSelected: {
    color: '#fbbf24',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'right',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
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
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
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
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#111827',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 8,
    width: '100%',
    maxWidth: 320,
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
  submitRegButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    marginTop: 16,
  },
  submitRegButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  submitRegButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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
    marginTop: 16,
  },
  backButtonStats: {
    marginBottom: 16,
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
  },
  statsSubtitle: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  statsCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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




