import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface QuickLinksFooterProps {
  user: any;
  onNavigate: (screen: 'login' | 'dashboard' | 'profile' | 'home') => void;
  onLogout: () => void;
}

export default function QuickLinksFooter({ user, onNavigate, onLogout }: QuickLinksFooterProps) {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.homeFooterContainer}>
      <View style={styles.quickLinksContainer}>
        {user ? (
          <>
            <TouchableOpacity 
              style={styles.quickLink}
              onPress={() => onNavigate('home')}
            >
              <FontAwesome name="home" size={18} color={theme.iconColor} />
              <Text style={styles.quickLinkText}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickLink}
              onPress={() => onNavigate('dashboard')}
            >
              <FontAwesome name="bar-chart" size={18} color={theme.iconColor} />
              <Text style={styles.quickLinkText}>Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickLink}
              onPress={() => onNavigate('profile')}
            >
              <FontAwesome name="user" size={18} color={theme.iconColor} />
              <Text style={styles.quickLinkText}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickLink}
              onPress={onLogout}
            >
              <FontAwesome name="sign-out" size={18} color={theme.error} />
              <Text style={[styles.quickLinkText, { color: theme.error }]}>Logout</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity 
            style={styles.quickLink}
            onPress={() => onNavigate('login')}
          >
            <FontAwesome name="lock" size={18} color={theme.iconColor} />
            <Text style={styles.quickLinkText}>Login</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  homeFooterContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.background,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1000,
  },
  quickLinksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
  },
  quickLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  quickLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
    marginTop: 4,
  },
});

