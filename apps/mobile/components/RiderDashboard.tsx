import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, ActivityIndicator, RefreshControl, Modal, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

interface RatingHistoryItem {
  id: string;
  vehicle_id: string;
  stars: number;
  tag_ratings?: Record<string, number> | null;
  comment: string | null;
  created_at: string;
  vehicle: {
    reg_number: string;
  } | null;
}

interface DashboardStats {
  totalRatings: number;
  averageStars: number;
  favoriteVehicle: string | null;
  recentRatings: RatingHistoryItem[];
}

interface RiderDashboardProps {
  onLogout: () => void;
  onRateVehicle: () => void;
  getDeviceHash: () => Promise<string>;
  onOpenMenu?: () => void;
}

export default function RiderDashboard({ onLogout, onRateVehicle, getDeviceHash, onOpenMenu }: RiderDashboardProps) {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalRatings: 0,
    averageStars: 0,
    favoriteVehicle: null,
    recentRatings: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<RatingHistoryItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchDashboardData = useCallback(async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      if (currentUser) {
        const deviceHash = await getDeviceHash();
        
        // Fetch all ratings for this device
        const { data: ratingsData, error: ratingsError } = await supabase
          .from('rating')
          .select(`
            id,
            vehicle_id,
            stars,
            tag_ratings,
            comment,
            created_at,
            vehicle:vehicle_id(reg_number)
          `)
          .eq('device_hash', deviceHash)
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
        const vehicleCounts: Record<string, number> = {};
        ratings.forEach(rating => {
          const vehicleId = rating.vehicle_id;
          vehicleCounts[vehicleId] = (vehicleCounts[vehicleId] || 0) + 1;
        });
        
        const favoriteVehicleId = Object.keys(vehicleCounts).reduce((a, b) => 
          vehicleCounts[a] > vehicleCounts[b] ? a : b, Object.keys(vehicleCounts)[0] || ''
        );
        
        const favoriteVehicle = favoriteVehicleId
          ? ratings.find(r => r.vehicle_id === favoriteVehicleId)?.vehicle?.reg_number || null
          : null;

        const recentRatings = ratings; // Show all ratings with pagination

        setStats({
          totalRatings,
          averageStars,
          favoriteVehicle,
          recentRatings,
        });
        setError(null);
        setCurrentPage(1); // Reset to first page when data refreshes
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Unable to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getDeviceHash]);

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

      {/* Recent Ratings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Ratings</Text>
        {stats.recentRatings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No ratings yet</Text>
            <Text style={styles.emptySubtext}>Start rating vehicles to see your history here</Text>
            <Pressable onPress={onRateVehicle} style={styles.emptyActionButton}>
              <Text style={styles.emptyActionButtonText}>Rate Your First Vehicle</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.ratingsList}>
              {stats.recentRatings
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((rating) => (
                  <Pressable
                    key={rating.id}
                    onPress={() => {
                      setSelectedRating(rating);
                      setModalVisible(true);
                    }}
                    style={styles.ratingCard}
                  >
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
                    <Text style={styles.date}>
                      {new Date(rating.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </Pressable>
                ))}
            </View>

            {/* Pagination Controls */}
            {stats.recentRatings.length > itemsPerPage && (
              <View style={styles.paginationContainer}>
                <Pressable
                  onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                >
                  <Text style={[styles.paginationButtonText, currentPage === 1 && styles.paginationButtonTextDisabled]}>
                    ← Previous
                  </Text>
                </Pressable>

                <Text style={styles.paginationInfo}>
                  Page {currentPage} of {Math.ceil(stats.recentRatings.length / itemsPerPage)}
                </Text>

                <Pressable
                  onPress={() => setCurrentPage(prev => Math.min(Math.ceil(stats.recentRatings.length / itemsPerPage), prev + 1))}
                  disabled={currentPage === Math.ceil(stats.recentRatings.length / itemsPerPage)}
                  style={[styles.paginationButton, currentPage === Math.ceil(stats.recentRatings.length / itemsPerPage) && styles.paginationButtonDisabled]}
                >
                  <Text style={[styles.paginationButtonText, currentPage === Math.ceil(stats.recentRatings.length / itemsPerPage) && styles.paginationButtonTextDisabled]}>
                    Next →
                  </Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </View>

      {/* Rating Detail Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedRating && (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Rating Details</Text>
                    <Pressable onPress={() => setModalVisible(false)} style={styles.closeButton}>
                      <Text style={styles.closeButtonText}>✕</Text>
                    </Pressable>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Vehicle</Text>
                    <Text style={styles.modalVehicle}>
                      {selectedRating.vehicle?.reg_number || 'Unknown Vehicle'}
                    </Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Overall Rating</Text>
                    <View style={styles.modalStarsRow}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Text
                          key={n}
                          style={[
                            styles.modalStar,
                            selectedRating.stars >= n && styles.modalStarSelected
                          ]}
                        >
                          ★
                        </Text>
                      ))}
                      <Text style={styles.modalStarsValue}>{selectedRating.stars.toFixed(1)}</Text>
                    </View>
                  </View>

                  {selectedRating.tag_ratings && Object.keys(selectedRating.tag_ratings).length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Category Ratings</Text>
                      {Object.entries(selectedRating.tag_ratings).map(([tag, rating]) => (
                        <View key={tag} style={styles.tagRow}>
                          <Text style={styles.tagName}>{tag}</Text>
                          <View style={styles.tagStarsRow}>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Text
                                key={n}
                                style={[
                                  styles.tagStar,
                                  rating >= n && styles.tagStarSelected
                                ]}
                              >
                                ★
                              </Text>
                            ))}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {selectedRating.comment && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Comment</Text>
                      <Text style={styles.modalComment}>{selectedRating.comment}</Text>
                    </View>
                  )}

                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Date</Text>
                    <Text style={styles.modalDate}>
                      {new Date(selectedRating.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
    paddingTop: 120,
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
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statValueSmall: {
    fontSize: 16,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
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
    marginBottom: 20,
  },
  emptyActionButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyActionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#6b7280',
    fontWeight: '600',
  },
  modalSection: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  modalVehicle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  modalStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalStar: {
    fontSize: 32,
    color: '#e5e7eb',
    marginRight: 4,
  },
  modalStarSelected: {
    color: '#fbbf24',
  },
  modalStarsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 12,
  },
  tagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tagName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  tagStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagStar: {
    fontSize: 20,
    color: '#e5e7eb',
    marginLeft: 2,
  },
  tagStarSelected: {
    color: '#fbbf24',
  },
  modalComment: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
  },
  modalDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  paginationButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    minWidth: 100,
    alignItems: 'center',
  },
  paginationButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  paginationButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  paginationButtonTextDisabled: {
    color: '#9ca3af',
  },
  paginationInfo: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
});

