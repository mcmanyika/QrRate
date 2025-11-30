import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Modal } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { getCountries, type Country } from '../utils/countries';

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
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  
  const [user, setUser] = useState<any>(null);
  const [ratings, setRatings] = useState<RatingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
  const [selectedRating, setSelectedRating] = useState<RatingHistoryItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [profileCountryCode, setProfileCountryCode] = useState<string | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const fetchUserData = useCallback(async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      // Load countries for profile editing
      const fetchedCountries = await getCountries();
      setCountries(fetchedCountries);

      // Fetch user profile (country preference)
      const deviceHash = await getDeviceHash();
      
      if (currentUser) {
        // For logged-in users, fetch by user_id
        const { data: profileData } = await supabase
          .from('rider_profile')
          .select('country_code')
          .eq('user_id', currentUser.id)
          .maybeSingle();
        
        if (profileData?.country_code) {
          setProfileCountryCode(profileData.country_code);
        }
      } else {
        // For anonymous users, fetch by device_hash
        const { data: profileData } = await supabase
          .from('rider_profile')
          .select('country_code')
          .eq('device_hash', deviceHash)
          .maybeSingle();
        
        if (profileData?.country_code) {
          setProfileCountryCode(profileData.country_code);
        }
      }

      // Fetch ratings by device_hash
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
    setCurrentPage(1);
    fetchUserData();
  };

  const handleSaveProfile = async () => {
    if (!profileCountryCode) {
      setError('Please select a country');
      return;
    }

    setSavingProfile(true);
    setError(null);

    try {
      const deviceHash = await getDeviceHash();
      
      if (user) {
        // For logged-in users, check if profile exists
        const { data: existingProfile } = await supabase
          .from('rider_profile')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingProfile) {
          // Update existing profile
          const { error: profileError } = await supabase
            .from('rider_profile')
            .update({ country_code: profileCountryCode })
            .eq('user_id', user.id);

          if (profileError) {
            console.error('Error updating profile:', profileError);
            setError('Unable to save profile');
          } else {
            setEditModalVisible(false);
            fetchUserData();
          }
        } else {
          // Insert new profile
          const { error: profileError } = await supabase
            .from('rider_profile')
            .insert({
              user_id: user.id,
              country_code: profileCountryCode,
            });

          if (profileError) {
            console.error('Error creating profile:', profileError);
            setError('Unable to save profile');
          } else {
            setEditModalVisible(false);
            fetchUserData();
          }
        }
      } else {
        // For anonymous users, check if profile exists
        const { data: existingProfile } = await supabase
          .from('rider_profile')
          .select('id')
          .eq('device_hash', deviceHash)
          .maybeSingle();

        if (existingProfile) {
          // Update existing profile
          const { error: profileError } = await supabase
            .from('rider_profile')
            .update({ country_code: profileCountryCode })
            .eq('device_hash', deviceHash);

          if (profileError) {
            console.error('Error updating profile:', profileError);
            setError('Unable to save profile');
          } else {
            setEditModalVisible(false);
            fetchUserData();
          }
        } else {
          // Insert new profile
          const { error: profileError } = await supabase
            .from('rider_profile')
            .insert({
              device_hash: deviceHash,
              country_code: profileCountryCode,
            });

          if (profileError) {
            console.error('Error creating profile:', profileError);
            setError('Unable to save profile');
          } else {
            setEditModalVisible(false);
            fetchUserData();
          }
        }
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Unable to save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleOpenEdit = async () => {
    // Ensure we have the current profile country loaded
    if (!profileCountryCode && countries.length > 0) {
      const deviceHash = await getDeviceHash();
      
      if (user) {
        const { data: profileData } = await supabase
          .from('rider_profile')
          .select('country_code')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profileData?.country_code) {
          setProfileCountryCode(profileData.country_code);
        } else if (!profileCountryCode) {
          setProfileCountryCode('KE'); // Default to Kenya
        }
      } else {
        const { data: profileData } = await supabase
          .from('rider_profile')
          .select('country_code')
          .eq('device_hash', deviceHash)
          .maybeSingle();
        
        if (profileData?.country_code) {
          setProfileCountryCode(profileData.country_code);
        } else if (!profileCountryCode) {
          setProfileCountryCode('KE'); // Default to Kenya
        }
      }
    }
    
    setEditModalVisible(true);
    setError(null);
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

      <View style={styles.container}>
        <View style={styles.content}>
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
            
            {/* Country Display */}
            {profileCountryCode && (
              <View style={styles.countryDisplay}>
                <Text style={styles.countryDisplayText}>
                  {countries.find(c => c.code === profileCountryCode)?.flag} {countries.find(c => c.code === profileCountryCode)?.name || profileCountryCode}
                </Text>
              </View>
            )}
            
            {/* Edit Button */}
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleOpenEdit}
            >
              <FontAwesome name="edit" size={16} color={theme.primary} />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          {/* Rating History */}
          <Text style={styles.sectionTitle}>Rating History</Text>
        </View>

        {/* Scrollable Rating History Section */}
        <View style={styles.section}>
          <ScrollView
            style={styles.scrollableList}
            contentContainerStyle={styles.scrollableContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
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
              <>
                <View style={styles.ratingsList}>
                  {ratings
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
            {ratings.length > itemsPerPage && (
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
                  Page {currentPage} of {Math.ceil(ratings.length / itemsPerPage)}
                </Text>

                <Pressable
                  onPress={() => setCurrentPage(prev => Math.min(Math.ceil(ratings.length / itemsPerPage), prev + 1))}
                  disabled={currentPage === Math.ceil(ratings.length / itemsPerPage)}
                  style={[styles.paginationButton, currentPage === Math.ceil(ratings.length / itemsPerPage) && styles.paginationButtonDisabled]}
                >
                  <Text style={[styles.paginationButtonText, currentPage === Math.ceil(ratings.length / itemsPerPage) && styles.paginationButtonTextDisabled]}>
                    Next →
                  </Text>
                </Pressable>
              </View>
                )}
              </>
            )}
          </ScrollView>
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
                      <Text style={styles.modalLabel}>Rating</Text>
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

        {/* Edit Profile Modal */}
        <Modal
          visible={editModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setEditModalVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setEditModalVisible(false)}
          >
            <Pressable style={styles.editModalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <TouchableOpacity
                  onPress={() => setEditModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <View style={styles.modalSection}>
                  <TouchableOpacity
                    style={styles.countrySelectButton}
                    onPress={() => setShowCountryPicker(true)}
                    disabled={savingProfile}
                  >
                    <Text style={styles.countrySelectButtonText}>
                      {profileCountryCode ? (
                        <>
                          {countries.find(c => c.code === profileCountryCode)?.flag} {countries.find(c => c.code === profileCountryCode)?.name || profileCountryCode}
                        </>
                      ) : (
                        'Select Country'
                      )}
                    </Text>
                    <FontAwesome name="chevron-down" size={14} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalButtonRow}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setEditModalVisible(false)}
                    disabled={savingProfile}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton, savingProfile && styles.saveButtonDisabled]}
                    onPress={handleSaveProfile}
                    disabled={savingProfile || !profileCountryCode}
                  >
                    {savingProfile ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

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
                      profileCountryCode === country.code && styles.countryOptionSelected
                    ]}
                    onPress={() => {
                      setProfileCountryCode(country.code);
                      setShowCountryPicker(false);
                      setError(null);
                    }}
                  >
                    <Text style={styles.countryOptionText}>
                      {country.flag} {country.name}
                    </Text>
                    {profileCountryCode === country.code && (
                      <FontAwesome name="check" size={16} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </View>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  pageContainer: {
    flex: 1,
    backgroundColor: theme.background,
    zIndex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: theme.background,
    paddingTop: 60,
  },
  hamburgerIcon: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10000,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 16,
    zIndex: 1,
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
  header: {
    marginBottom: 24,
  },
  backButton: {
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    color: theme.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.text,
  },
  userCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 1,
  },
  userIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.primary,
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
    color: theme.text,
    marginBottom: 4,
  },
  userInfo: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  editButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: theme.primary,
    backgroundColor: 'transparent',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.primary,
  },
  countryDisplay: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border || '#e5e7eb',
  },
  countryDisplayText: {
    fontSize: 14,
    color: theme.text,
    fontWeight: '500',
  },
  editModalContent: {
    backgroundColor: theme.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  countrySelectButton: {
    backgroundColor: theme.card,
    borderWidth: 1.5,
    borderColor: theme.border || '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  countrySelectButtonText: {
    fontSize: 16,
    color: theme.text,
    fontWeight: '500',
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
    borderBottomColor: theme.border || '#e5e7eb',
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
    borderBottomColor: theme.border || '#e5e7eb',
  },
  countryOptionSelected: {
    backgroundColor: theme.card,
  },
  countryOptionText: {
    fontSize: 16,
    color: theme.text,
    fontWeight: '500',
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.border || '#e5e7eb',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: theme.card,
    borderWidth: 1.5,
    borderColor: theme.border || '#e5e7eb',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  saveButton: {
    backgroundColor: theme.primary,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  section: {
    flex: 1,
    paddingHorizontal: 24,
    marginBottom: 80, // Leave space for footer menu to prevent touch blocking
  },
  scrollableList: {
    flex: 1,
  },
  scrollableContent: {
    paddingBottom: 100, // Extra padding to leave space for footer menu
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  errorContainer: {
    backgroundColor: theme.errorBg,
    borderWidth: 1.5,
    borderColor: theme.error,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: theme.error,
    textAlign: 'center',
  },
  emptyContainer: {
    backgroundColor: theme.card,
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
    color: theme.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  ratingsList: {
    gap: 12,
  },
  ratingCard: {
    backgroundColor: theme.card,
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
    color: theme.text,
    flex: 1,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    fontSize: 16,
    color: theme.starUnselected,
    marginLeft: 2,
  },
  starSelected: {
    color: theme.starSelected,
  },
  date: {
    fontSize: 12,
    color: theme.textTertiary,
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
    backgroundColor: theme.primary,
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
    color: theme.textTertiary,
  },
  paginationInfo: {
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.card,
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
    color: theme.text,
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
    color: theme.textSecondary,
    fontWeight: '600',
  },
  modalSection: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  modalVehicle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.text,
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
    color: theme.starSelected,
  },
  modalStarsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
    marginLeft: 12,
  },
  modalComment: {
    fontSize: 15,
    color: theme.text,
    lineHeight: 22,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
  },
  modalDate: {
    fontSize: 14,
    color: theme.textSecondary,
  },
});

