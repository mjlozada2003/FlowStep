import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppModal } from '@/components/ui/Modal';

interface MissReason {
  reason_id: number;
  name: string;
  description?: string;
}

interface ActivityMissModalProps {
  visible: boolean;
  onClose: () => void;
  reasons: MissReason[];
  selectedReasonId: number | null;
  onSelectReason: (id: number) => void;
  details: string;
  onChangeDetails: (text: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function ActivityMissModal({
  visible,
  onClose,
  reasons,
  selectedReasonId,
  onSelectReason,
  details,
  onChangeDetails,
  onSubmit,
  isSubmitting,
}: ActivityMissModalProps) {
  return (
    <AppModal visible={visible} onClose={onClose} title="Registrar Resultado">
      <View style={{ width: '100%' }}>
        <Text style={styles.modalTitleQuestion}>¿Por qué no pudiste completarla?</Text>
        <View style={styles.pillsContainer}>
          {reasons.map((reason) => {
            const isSelected = selectedReasonId === reason.reason_id;
            return (
              <TouchableOpacity
                key={reason.reason_id}
                style={[styles.pillButton, isSelected && styles.pillButtonSelected]}
                onPress={() => onSelectReason(reason.reason_id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                  {reason.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.subLabel}>DETALLES OPCIONALES</Text>
        <TextInput
          style={styles.textArea}
          value={details}
          onChangeText={onChangeDetails}
          placeholder="Explica brevemente..."
          multiline
          placeholderTextColor="#94A3B8"
        />

        <TouchableOpacity
          style={[styles.primaryActionButton, !selectedReasonId && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={!selectedReasonId || isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryActionText}>Guardar motivo</Text>
          )}
        </TouchableOpacity>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  modalTitleQuestion: { fontSize: 16, fontWeight: '800', color: '#0F2C40', marginBottom: 14 },
  pillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  pillButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' },
  pillButtonSelected: { borderColor: '#174A62', backgroundColor: '#D8ECF8' },
  pillText: { fontSize: 12, color: '#486581', fontWeight: '600' },
  pillTextSelected: { color: '#174A62', fontWeight: '800' },
  subLabel: { fontSize: 10, fontWeight: '800', color: '#627D98', marginBottom: 6, letterSpacing: 0.8, marginTop: 10 },
  textArea: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 12, height: 80, fontSize: 13, color: '#0F2C40', backgroundColor: '#F8FAFC', textAlignVertical: 'top', marginBottom: 12 },
  primaryActionButton: { backgroundColor: '#174A62', borderRadius: 16, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: '#174A62', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, elevation: 3 },
  primaryActionText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  buttonDisabled: { opacity: 0.5 },
});