import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  Modal as RNModal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  category?: string;
  title: string;
  children: React.ReactNode;
  primaryButtonText?: string;
  onPrimaryAction?: () => void;
}

export function AppModal({
  visible,
  onClose,
  category,
  title,
  children,
  primaryButtonText,
  onPrimaryAction,
}: AppModalProps) {
  return (
    <RNModal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeaderRow}>
            {category ? (
              <Text style={styles.modalCategory}>{category}</Text>
            ) : null}
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Feather name="x" size={18} color="#627D98" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalTitle}>{title}</Text>

          <View style={styles.body}>{children}</View>

          {primaryButtonText && onPrimaryAction ? (
            <TouchableOpacity
              style={styles.primaryModalBtn}
              onPress={onPrimaryAction}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryModalBtnText}>
                {primaryButtonText}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 44, 64, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FAF6F0',
    borderRadius: 24,
    padding: 22,
    width: '100%',
    maxWidth: 360,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalCategory: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F2C40',
    marginTop: -4,
  },
  body: {
    gap: 12,
  },
  primaryModalBtn: {
    backgroundColor: '#174A62',
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  primaryModalBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});