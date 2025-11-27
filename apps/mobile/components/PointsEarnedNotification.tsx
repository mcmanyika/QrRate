import React, { useEffect, useRef, useMemo } from 'react';
import { StyleSheet, Text, View, Animated, Modal } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface PointsEarnedNotificationProps {
  visible: boolean;
  pointsEarned: number;
  onDismiss: () => void;
}

export default function PointsEarnedNotification({ 
  visible, 
  pointsEarned, 
  onDismiss 
}: PointsEarnedNotificationProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const starAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Sequence of animations
      Animated.sequence([
        // Scale in + fade in
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        // Rotate star
        Animated.timing(starAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        // Hold for a moment
        Animated.delay(1000),
        // Fade out
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        onDismiss();
      });
    } else {
      // Reset animations
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      starAnim.setValue(0);
    }
  }, [visible, scaleAnim, fadeAnim, starAnim, onDismiss]);

  const starRotation = starAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible) return null;

  return (
    <Modal transparent={true} visible={visible} animationType="none">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [{ rotate: starRotation }],
              },
            ]}
          >
            <FontAwesome name="star" size={48} color={theme.starSelected} />
          </Animated.View>
          
          <Text style={styles.title}>Points Earned!</Text>
          <Text style={styles.points}>+{pointsEarned}</Text>
          <Text style={styles.subtitle}>Keep rating to earn more rewards</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    maxWidth: 280,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 8,
  },
  points: {
    fontSize: 48,
    fontWeight: '700',
    color: theme.starSelected,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
  },
});

