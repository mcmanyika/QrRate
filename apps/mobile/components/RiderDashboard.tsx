import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import PointsBalanceCard from './PointsBalanceCard';
import { useTheme } from '../contexts/ThemeContext';

interface DashboardStats {
  totalRatings: number;
  averageStars: number;
  favoriteVehicle: string | null;
}

interface RiderDashboardProps {
  user: any;
  onLogout: () => void;
  onNavigateProfile: () => void;
  getDeviceHash: () => Promise<string>;
  onOpenMenu?: () => void;
}

export default function RiderDashboard({ user, onLogout, onNavigateProfile, getDeviceHash, onOpenMenu }: RiderDashboardProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  
  const [stats, setStats] = useState<DashboardStats>({
    totalRatings: 0,
    averageStars: 0,
    favoriteVehicle: null,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<{ availablePoints: number; cashEquivalent: number } | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      // Use user's auth ID if logged in, otherwise use device hash
      const identifier = user?.id || await getDeviceHash();
      
      // Fetch all ratings for this user/device
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('rating')
        .select('id, vehicle_id, stars')
        .eq('device_hash', identifier)
        .order('created_at', { ascending: false });

        if (ratingsError) {
          console.error('Error fetching ratings:', ratingsError);
          setError('Unable to load dashboard data');
          setLoading(false);
          setRefreshing(false);
          return;
        }

        const ratings = ratingsData || [];
        
        // Calculate stats
        const totalRatings = ratings.length;
        const averageStars = totalRatings > 0
          ? ratings.reduce((sum, r) => sum + r.stars, 0) / totalRatings
          : 0;
        
        // Find most frequently rated vehicle
        let favoriteVehicle: string | null = null;
        if (totalRatings > 0) {
          const vehicleCounts: Record<string, number> = {};
          ratings.forEach(rating => {
            const vehicleId = rating.vehicle_id;
            vehicleCounts[vehicleId] = (vehicleCounts[vehicleId] || 0) + 1;
          });
          
          const favoriteVehicleId = Object.keys(vehicleCounts).reduce((a, b) => 
            vehicleCounts[a] > vehicleCounts[b] ? a : b
          );
          
          // Fetch the vehicle's reg number
          const { data: vehicleData } = await supabase
            .from('vehicle')
            .select('reg_number')
            .eq('id', favoriteVehicleId)
            .maybeSingle();
          
          favoriteVehicle = vehicleData?.reg_number || null;
        }

        // Fetch points balance
        const { data: pointsData } = await supabase
          .from('user_points')
          .select('available_points, lifetime_points')
          .eq('device_hash', identifier)
          .maybeSingle();

        setBalance({
          availablePoints: pointsData?.available_points || 0,
          cashEquivalent: (pointsData?.available_points || 0) / 100 // 100 points = $1
        });

      setStats({
        totalRatings,
        averageStars,
        favoriteVehicle,
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Unable to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getDeviceHash, user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      await onLogout();
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
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
      {/* Points Balance Card - always show, even if 0 */}
      {balance && (
        <PointsBalanceCard
          availablePoints={balance.availablePoints}
          cashEquivalent={balance.cashEquivalent}
        />
      )}

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalRatings}</Text>
          <Text style={styles.statLabel}>Total Ratings</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.averageStars.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Avg Rating</Text>
        </View>
        {stats.favoriteVehicle && (
          <View style={styles.statCard}>
            <Text style={[styles.statValue, styles.statValueSmall]}>{stats.favoriteVehicle}</Text>
            <Text style={styles.statLabel}>Favorite</Text>
          </View>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      </ScrollView>
    </View>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  pageContainer: {
    flex: 1,
    backgroundColor: theme.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  hamburgerIcon: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 100,
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
    elevation: 5,
  },
  content: {
    padding: 24,
    paddingTop: 120,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 4,
  },
  statValueSmall: {
    fontSize: 16,
  },
  statLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: theme.errorBg,
    borderWidth: 1.5,
    borderColor: theme.error,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 14,
    color: theme.error,
    textAlign: 'center',
  },
});

