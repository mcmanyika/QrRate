import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface PointsBalanceCardProps {
  availablePoints: number;
  cashEquivalent: number;
}

export default function PointsBalanceCard({ 
  availablePoints, 
  cashEquivalent
}: PointsBalanceCardProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <FontAwesome name="star" size={24} color={theme.starSelected} />
        <Text style={styles.title}>Your Points</Text>
      </View>
      <Text style={styles.pointsValue}>{availablePoints}</Text>
      <Text style={styles.subtext}>≈ ${cashEquivalent.toFixed(2)} ride credit</Text>
    </View>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
    marginLeft: 8,
  },
  pointsValue: {
    fontSize: 36,
    fontWeight: '800',
    color: theme.primary,
    marginBottom: 4,
  },
  subtext: {
    fontSize: 14,
    color: theme.textSecondary,
  },
});

