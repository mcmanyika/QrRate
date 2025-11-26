import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onBack: () => void;
}

export default function LoginScreen({ onLoginSuccess, onBack }: LoginScreenProps) {
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        setLoading(false);
        // Call onLoginSuccess - the auth state change listener will handle redirect
        onLoginSuccess();
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!phone.trim()) {
      setError('Please enter your phone number');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: phone.trim(),
      });

      if (otpError) {
        setError(otpError.message);
        setLoading(false);
        return;
      }

      setOtpSent(true);
      setLoading(false);
    } catch (err) {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      setError('Please enter the OTP code');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: phone.trim(),
        token: otp.trim(),
        type: 'sms',
      });

      if (verifyError) {
        setError(verifyError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        setLoading(false);
        // Call onLoginSuccess - the auth state change listener will handle redirect
        onLoginSuccess();
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Login</Text>
        <Text style={styles.subtitle}>Sign in to view your rating history</Text>
      </View>

      {/* Login Method Toggle */}
      <View style={styles.toggleContainer}>
        <Pressable
          onPress={() => {
            setLoginMethod('email');
            setError(null);
            setOtpSent(false);
            setOtp('');
          }}
          style={[styles.toggleButton, loginMethod === 'email' && styles.toggleButtonActive]}
        >
          <Text style={[styles.toggleButtonText, loginMethod === 'email' && styles.toggleButtonTextActive]}>
            Email
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setLoginMethod('phone');
            setError(null);
            setOtpSent(false);
            setOtp('');
          }}
          style={[styles.toggleButton, loginMethod === 'phone' && styles.toggleButtonActive]}
        >
          <Text style={[styles.toggleButtonText, loginMethod === 'phone' && styles.toggleButtonTextActive]}>
            Phone
          </Text>
        </Pressable>
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Email/Password Form */}
      {loginMethod === 'email' && (
        <View style={styles.form}>
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              placeholder="Enter your email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError(null);
              }}
              style={styles.input}
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              placeholder="Enter your password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setError(null);
              }}
              style={styles.input}
              placeholderTextColor="#9ca3af"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Pressable
            onPress={handleEmailLogin}
            disabled={loading}
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </Pressable>
        </View>
      )}

      {/* Phone/OTP Form */}
      {loginMethod === 'phone' && (
        <View style={styles.form}>
          {!otpSent ? (
            <>
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  placeholder="e.g., +263771234567"
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    setError(null);
                  }}
                  style={styles.input}
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                  autoCorrect={false}
                />
              </View>

              <Pressable
                onPress={handleSendOTP}
                disabled={loading}
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.loginButtonText}>Send OTP</Text>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Enter OTP Code</Text>
                <TextInput
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChangeText={(text) => {
                    setOtp(text);
                    setError(null);
                  }}
                  style={styles.input}
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                  maxLength={6}
                  autoCorrect={false}
                />
                <Text style={styles.otpHint}>We sent a code to {phone}</Text>
              </View>

              <Pressable
                onPress={handleVerifyOTP}
                disabled={loading}
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.loginButtonText}>Verify OTP</Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => {
                  setOtpSent(false);
                  setOtp('');
                  setError(null);
                }}
                style={styles.resendButton}
              >
                <Text style={styles.resendButtonText}>Change phone number</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 32,
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#2563eb',
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  toggleButtonTextActive: {
    color: '#ffffff',
  },
  form: {
    marginTop: 8,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#0f172a',
  },
  otpHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  resendButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  resendButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
  },
});

