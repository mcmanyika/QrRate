import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, TouchableOpacity, Dimensions } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.75, 300);

interface MenuDrawerProps {
  visible: boolean;
  onClose: () => void;
  user: any;
  onNavigate: (screen: 'login' | 'dashboard' | 'profile' | 'home') => void;
  onLogout: () => void;
  currentScreen: string;
}

export default function MenuDrawer({ 
  visible, 
  onClose, 
  user, 
  onNavigate,
  onLogout,
  currentScreen 
}: MenuDrawerProps) {
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: DRAWER_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, opacityAnim]);

  if (!visible && slideAnim._value === DRAWER_WIDTH) {
    return null;
  }

  const handleNavigate = (screen: 'login' | 'dashboard' | 'profile' | 'home') => {
    onNavigate(screen);
    onClose();
  };

  const handleLogout = () => {
    onLogout();
    onClose();
  };

  return (
    <View style={styles.container} pointerEvents={visible ? 'auto' : 'none'}>
      {/* Backdrop */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View 
          style={[
            styles.backdrop,
            { opacity: opacityAnim }
          ]} 
        />
      </Pressable>

      {/* Drawer */}
      <Animated.View 
        style={[
          styles.drawer,
          {
            transform: [{ translateX: slideAnim }]
          }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Menu</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <FontAwesome name="times" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <View style={styles.menuItems}>
          {/* Navigation Section */}
          <View style={styles.section}>
            {currentScreen !== 'home' && (
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => handleNavigate('home')}
              >
                <FontAwesome name="home" size={20} color="#374151" style={styles.menuIcon} />
                <Text style={styles.menuText}>Home</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Account Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            
            {user ? (
              <>
                {currentScreen !== 'dashboard' && (
                  <TouchableOpacity 
                    style={styles.menuItem}
                    onPress={() => handleNavigate('dashboard')}
                  >
                    <FontAwesome name="bar-chart" size={20} color="#374151" style={styles.menuIcon} />
                    <Text style={styles.menuText}>Dashboard</Text>
                  </TouchableOpacity>
                )}
                
                {currentScreen !== 'profile' && (
                  <TouchableOpacity 
                    style={styles.menuItem}
                    onPress={() => handleNavigate('profile')}
                  >
                    <FontAwesome name="user" size={20} color="#374151" style={styles.menuIcon} />
                    <Text style={styles.menuText}>Profile</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={[styles.menuItem, styles.logoutItem]}
                  onPress={handleLogout}
                >
                  <FontAwesome name="sign-out" size={20} color="#ef4444" style={styles.menuIcon} />
                  <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => handleNavigate('login')}
              >
                <FontAwesome name="lock" size={20} color="#374151" style={styles.menuIcon} />
                <Text style={styles.menuText}>Login</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* App Info */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>RateMyRide v0.1.0</Text>
            {user && (
              <Text style={styles.footerEmail}>{user.email}</Text>
            )}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#6b7280',
    fontWeight: '600',
  },
  menuItems: {
    flex: 1,
    paddingTop: 20,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  menuIcon: {
    marginRight: 12,
    width: 20,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  logoutItem: {
    marginTop: 8,
  },
  logoutText: {
    color: '#ef4444',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  footerEmail: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
});

