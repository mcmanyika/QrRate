import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  Pressable, 
  TextInput, 
  StyleSheet, 
  ActivityIndicator,
  ScrollView 
} from 'react-native';
import { useTipPayment } from './hooks/useTipPayment';
import type { TipPromptProps, TipAmount } from './types';

const PRESET_AMOUNTS: TipAmount[] = [100, 200, 500, 1000]; // $1, $2, $5, $10

export function TipPrompt({
  vehicleId,
  ratingId,
  routeId,
  vehicleRegNumber,
  deviceHash,
  onComplete,
  onSkip,
}: TipPromptProps) {
  const [selectedAmount, setSelectedAmount] = useState<TipAmount | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const { processTip, isProcessing, error, clearError } = useTipPayment({
    vehicleId,
    ratingId,
    routeId,
    vehicleRegNumber,
    deviceHash,
  });

  const handleAmountSelect = (amount: TipAmount) => {
    if (amount === 'custom') {
      setShowCustomInput(true);
      setSelectedAmount('custom');
    } else {
      setSelectedAmount(amount);
      setShowCustomInput(false);
      setCustomAmount('');
    }
    clearError();
  };

  const handleCustomAmountChange = (text: string) => {
    // Only allow numbers and one decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return; // Only allow one decimal point
    
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) return;
    
    setCustomAmount(cleaned);
    clearError();
  };

  const getAmountCents = (): number | null => {
    if (selectedAmount === null) return null;
    if (selectedAmount === 'custom') {
      const amount = parseFloat(customAmount);
      if (isNaN(amount) || amount <= 0) return null;
      return Math.round(amount * 100);
    }
    return selectedAmount;
  };

  const handleTip = async () => {
    const amountCents = getAmountCents();
    if (!amountCents || amountCents < 50) {
      return; // Minimum $0.50
    }

    const result = await processTip(amountCents);
    if (result.success) {
      onComplete();
    }
  };

  const amountCents = getAmountCents();
  const canSubmit = amountCents !== null && amountCents >= 50 && !isProcessing;

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="fade"
      onRequestClose={onSkip}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Tip Driver</Text>
            <Text style={styles.subtitle}>
              Show your appreciation for {vehicleRegNumber}
            </Text>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error.message}</Text>
              </View>
            )}

            <View style={styles.amountGrid}>
              {PRESET_AMOUNTS.map((amount) => (
                <Pressable
                  key={amount}
                  onPress={() => handleAmountSelect(amount)}
                  style={[
                    styles.amountButton,
                    selectedAmount === amount && styles.amountButtonSelected,
                  ]}
                  disabled={isProcessing}
                >
                  <Text
                    style={[
                      styles.amountButtonText,
                      selectedAmount === amount && styles.amountButtonTextSelected,
                    ]}
                  >
                    ${amount / 100}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => handleAmountSelect('custom')}
                style={[
                  styles.amountButton,
                  selectedAmount === 'custom' && styles.amountButtonSelected,
                ]}
                disabled={isProcessing}
              >
                <Text
                  style={[
                    styles.amountButtonText,
                    selectedAmount === 'custom' && styles.amountButtonTextSelected,
                  ]}
                >
                  Custom
                </Text>
              </Pressable>
            </View>

            {showCustomInput && (
              <View style={styles.customInputContainer}>
                <Text style={styles.customInputLabel}>Enter amount ($)</Text>
                <TextInput
                  style={styles.customInput}
                  value={customAmount}
                  onChangeText={handleCustomAmountChange}
                  placeholder="0.00"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                  editable={!isProcessing}
                />
                {customAmount && parseFloat(customAmount) > 0 && (
                  <Text style={styles.customInputHint}>
                    ${(parseFloat(customAmount) || 0).toFixed(2)}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.buttonRow}>
              <Pressable
                onPress={onSkip}
                style={[styles.skipButton, isProcessing && styles.buttonDisabled]}
                disabled={isProcessing}
              >
                <Text style={styles.skipButtonText}>Skip</Text>
              </Pressable>
              <Pressable
                onPress={handleTip}
                style={[
                  styles.tipButton,
                  (!canSubmit || isProcessing) && styles.buttonDisabled,
                ]}
                disabled={!canSubmit || isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.tipButtonText}>
                    Tip ${amountCents ? (amountCents / 100).toFixed(2) : '0.00'}
                  </Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  scrollContent: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
    justifyContent: 'center',
  },
  amountButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  amountButtonSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#2563eb',
  },
  amountButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  amountButtonTextSelected: {
    color: '#2563eb',
  },
  customInputContainer: {
    marginBottom: 24,
  },
  customInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  customInput: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  customInputHint: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  skipButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  tipButton: {
    flex: 2,
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  tipButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

