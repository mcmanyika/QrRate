import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, TouchableOpacity, Dimensions, Modal } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

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
  const { theme, isDark, toggleTheme } = useTheme();

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

  const handleNavigate = (screen: 'login' | 'dashboard' | 'profile' | 'home') => {
    onNavigate(screen);
    onClose();
  };

  const handleLogout = () => {
    onLogout();
    onClose();
  };

  const dynamicStyles = getStyles(theme);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={dynamicStyles.container} pointerEvents={visible ? 'auto' : 'none'}>
        {/* Backdrop */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View 
            style={[
              dynamicStyles.backdrop,
              { opacity: opacityAnim }
            ]} 
          />
        </Pressable>

        {/* Drawer */}
        <Animated.View 
          style={[
            dynamicStyles.drawer,
            {
              transform: [{ translateX: slideAnim }]
            }
          ]}
        >
        {/* Header */}
        <View style={dynamicStyles.header}>
          <Text style={dynamicStyles.headerTitle}>Menu</Text>
          <TouchableOpacity onPress={onClose} style={dynamicStyles.closeButton}>
            <FontAwesome name="times" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <View style={dynamicStyles.menuItems}>
          {/* Navigation Section */}
          <View style={dynamicStyles.section}>
            {currentScreen !== 'home' && (
              <TouchableOpacity 
                style={dynamicStyles.menuItem}
                onPress={() => handleNavigate('home')}
              >
                <FontAwesome name="home" size={20} color={theme.iconColor} style={dynamicStyles.menuIcon} />
                <Text style={dynamicStyles.menuText}>Home</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Account Section */}
          <View style={dynamicStyles.section}>
            <Text style={dynamicStyles.sectionTitle}>Account</Text>
            
            {user ? (
              <>
                {currentScreen !== 'dashboard' && (
                  <TouchableOpacity 
                    style={dynamicStyles.menuItem}
                    onPress={() => handleNavigate('dashboard')}
                  >
                    <FontAwesome name="bar-chart" size={20} color={theme.iconColor} style={dynamicStyles.menuIcon} />
                    <Text style={dynamicStyles.menuText}>Dashboard</Text>
                  </TouchableOpacity>
                )}
                
                {currentScreen !== 'profile' && (
                  <TouchableOpacity 
                    style={dynamicStyles.menuItem}
                    onPress={() => handleNavigate('profile')}
                  >
                    <FontAwesome name="user" size={20} color={theme.iconColor} style={dynamicStyles.menuIcon} />
                    <Text style={dynamicStyles.menuText}>Profile</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={[dynamicStyles.menuItem, dynamicStyles.logoutItem]}
                  onPress={handleLogout}
                >
                  <FontAwesome name="sign-out" size={20} color={theme.error} style={dynamicStyles.menuIcon} />
                  <Text style={dynamicStyles.logoutText}>Logout</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity 
                style={dynamicStyles.menuItem}
                onPress={() => handleNavigate('login')}
              >
                <FontAwesome name="lock" size={20} color={theme.iconColor} style={dynamicStyles.menuIcon} />
                <Text style={dynamicStyles.menuText}>Login</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Theme Toggle */}
          <View style={dynamicStyles.section}>
            <TouchableOpacity 
              style={dynamicStyles.menuItem}
              onPress={toggleTheme}
            >
              <FontAwesome 
                name={isDark ? 'sun-o' : 'moon-o'} 
                size={20} 
                color={theme.iconColor} 
                style={dynamicStyles.menuIcon} 
              />
              <Text style={dynamicStyles.menuText}>
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* App Info */}
          <View style={dynamicStyles.footer}>
            <Text style={dynamicStyles.footerText}>FeedbackQR v0.1.0</Text>
            {user && (
              <Text style={dynamicStyles.footerEmail}>{user.email}</Text>
            )}
          </View>
        </View>
      </Animated.View>
      </View>
    </Modal>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  backdrop: {
    flex: 1,
    backgroundColor: theme.overlay,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: theme.card,
    shadowColor: theme.shadow,
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
    borderBottomColor: theme.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.text,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
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
    color: theme.textSecondary,
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
    color: theme.text,
  },
  logoutItem: {
    marginTop: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.error,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  footerText: {
    fontSize: 12,
    color: theme.textTertiary,
    textAlign: 'center',
  },
  footerEmail: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});

