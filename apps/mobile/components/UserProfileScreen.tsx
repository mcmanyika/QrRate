import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface RatingHistoryItem {
  id: string;
  vehicle_id: string;
  stars: number;
  comment: string | null;
  created_at: string;
  vehicle: {
    reg_number: string;
  } | null;
}

interface UserProfileScreenProps {
  onLogout: () => void;
  onBack: () => void;
  getDeviceHash: () => Promise<string>;
  onOpenMenu?: () => void;
}

export default function UserProfileScreen({ onLogout, onBack, getDeviceHash, onOpenMenu }: UserProfileScreenProps) {
  const [user, setUser] = useState<any>(null);
  const [ratings, setRatings] = useState<RatingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = useCallback(async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      if (currentUser) {
        // Fetch ratings by device_hash (since rating table doesn't have user_id yet)
        // For logged-in users, we'll use their device_hash to show their rating history
        const deviceHash = await getDeviceHash();
        const { data: ratingsData, error: ratingsError } = await supabase
          .from('rating')
          .select(`
            id,
            vehicle_id,
            stars,
            comment,
            created_at,
            vehicle:vehicle_id(reg_number)
          `)
          .eq('device_hash', deviceHash)
          .order('created_at', { ascending: false })
          .limit(50);

        if (ratingsError) {
          console.error('Error fetching ratings:', ratingsError);
          setError('Unable to load rating history');
        } else {
          setRatings(ratingsData || []);
          setError(null);
        }
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Unable to load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getDeviceHash]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // Clear any stored session data
      await AsyncStorage.removeItem('supabase.auth.token');
      onLogout();
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserData();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.pageContainer}>
      {/* Hamburger Menu Icon */}
      {onOpenMenu && (
        <TouchableOpacity 
          style={styles.hamburgerIcon}
          onPress={onOpenMenu}
        >
          <FontAwesome name="bars" size={22} color="#2563eb" />
        </TouchableOpacity>
      )}

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
          <Text style={styles.title}>Profile</Text>
        </View>

      {/* User Info */}
      <View style={styles.userCard}>
        <View style={styles.userIcon}>
          <Text style={styles.userIconText}>
            {user?.email?.[0]?.toUpperCase() || user?.phone?.[user.phone.length - 1] || 'U'}
          </Text>
        </View>
        <Text style={styles.userEmail}>{user?.email || user?.phone || 'User'}</Text>
        <Text style={styles.userInfo}>
          {user?.email ? 'Email account' : 'Phone account'}
        </Text>
      </View>

      {/* Rating History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rating History</Text>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        {ratings.length === 0 && !error ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No ratings yet</Text>
            <Text style={styles.emptySubtext}>Start rating vehicles to see your history here</Text>
          </View>
        ) : (
          <View style={styles.ratingsList}>
            {ratings.map((rating) => (
              <View key={rating.id} style={styles.ratingCard}>
                <View style={styles.ratingHeader}>
                  <Text style={styles.vehicleReg}>
                    {rating.vehicle?.reg_number || 'Unknown Vehicle'}
                  </Text>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Text
                        key={n}
                        style={[
                          styles.star,
                          rating.stars >= n && styles.starSelected
                        ]}
                      >
                        ★
                      </Text>
                    ))}
                  </View>
                </View>
                {rating.comment && (
                  <Text style={styles.comment}>{rating.comment}</Text>
                )}
                <Text style={styles.date}>
                  {new Date(rating.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Logout Button */}
      <Pressable onPress={handleLogout} style={styles.logoutButton}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  hamburgerIcon: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 100,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f4f8',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111827',
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  userIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  userIconText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  userEmail: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  userInfo: {
    fontSize: 14,
    color: '#6b7280',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
  },
  emptyContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  ratingsList: {
    gap: 12,
  },
  ratingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  vehicleReg: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    fontSize: 16,
    color: '#d1d5db',
    marginLeft: 2,
  },
  starSelected: {
    color: '#fbbf24',
  },
  comment: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
  },
  date: {
    fontSize: 12,
    color: '#9ca3af',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});

