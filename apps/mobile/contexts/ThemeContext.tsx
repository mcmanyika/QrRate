import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Theme {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  primary: string;
  primaryDark: string;
  border: string;
  borderLight: string;
  error: string;
  errorBg: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  shadow: string;
  overlay: string;
  inputBg: string;
  iconColor: string;
  starSelected: string;
  starUnselected: string;
}

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const lightTheme: Theme = {
  background: '#f0f4f8',
  card: '#ffffff',
  text: '#111827',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
  primary: '#2563eb',
  primaryDark: '#1e40af',
  border: '#e2e8f0',
  borderLight: '#e5e7eb',
  error: '#ef4444',
  errorBg: '#fef2f2',
  success: '#10b981',
  successBg: '#f0fdf4',
  warning: '#f59e0b',
  warningBg: '#fffbeb',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',
  inputBg: '#ffffff',
  iconColor: '#374151',
  starSelected: '#fbbf24',
  starUnselected: '#d1d5db',
};

const darkTheme: Theme = {
  background: '#111827',
  card: '#1f2937',
  text: '#f9fafb',
  textSecondary: '#9ca3af',
  textTertiary: '#6b7280',
  primary: '#3b82f6',
  primaryDark: '#2563eb',
  border: '#374151',
  borderLight: '#4b5563',
  error: '#ef4444',
  errorBg: '#7f1d1d',
  success: '#10b981',
  successBg: '#064e3b',
  warning: '#f59e0b',
  warningBg: '#78350f',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.7)',
  inputBg: '#374151',
  iconColor: '#d1d5db',
  starSelected: '#fbbf24',
  starUnselected: '#4b5563',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@app_theme';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [isDark, setIsDark] = useState(true); // Default to dark mode
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme preference on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme !== null) {
          setIsDark(savedTheme === 'dark');
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, []);

  // Save theme preference when it changes
  const toggleTheme = async () => {
    try {
      const newTheme = !isDark;
      setIsDark(newTheme);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const theme = isDark ? darkTheme : lightTheme;

  // Don't render children until theme is loaded
  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

