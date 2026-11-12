import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface ActivityTimeCardProps {
  hoursSpent: string;
  onChangeHours: (val: string) => void;
  minutesSpent: string;
  onChangeMinutes: (val: string) => void;
  onSave: () => void;
  isSubmitting: boolean;
}

export function ActivityTimeCard({
  hoursSpent,
  onChangeHours,
  minutesSpent,
  onChangeMinutes,
  onSave,
  isSubmitting,
}: ActivityTimeCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.iconCircle}>
          <Feather name="clock" size={16} color="#174A62" />
        </View>
        <View style={styles.headerTextFlex}>
          <Text style={styles.sectionCategory}>REGISTRO DE TIEMPO</Text>
          <Text style={styles.sectionTitle}>¿Cuánto tiempo dedicaste?</Text>
        </View>
      </View>

      <View style={styles.timeInputsRow}>
        <View style={styles.timeBoxContainer}>
          <TextInput
            style={styles.timeInput}
            value={hoursSpent}
            onChangeText={onChangeHours}
            keyboardType="numeric"
            maxLength={2}
          />
          <Text style={styles.timeUnitLabel}>horas</Text>
        </View>
        <Text style={styles.timeSeparator}>:</Text>
        <View style={styles.timeBoxContainer}>
          <TextInput
            style={styles.timeInput}
            value={minutesSpent}
            onChangeText={onChangeMinutes}
            keyboardType="numeric"
            maxLength={3}
          />
          <Text style={styles.timeUnitLabel}>minutos</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.actionButtonLight}
        onPress={onSave}
        disabled={isSubmitting}
        activeOpacity={0.8}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#174A62" />
        ) : (
          <Text style={styles.actionButtonLightText}>Guardar tiempo</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#174A62', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, elevation: 2 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  iconCircle: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#EBF5FB', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerTextFlex: { flex: 1 },
  sectionCategory: { fontSize: 9, fontWeight: '800', color: '#174A62', letterSpacing: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0F2C40' },
  timeInputsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  timeBoxContainer: { alignItems: 'center', flex: 1, maxWidth: 110 },
  timeInput: { width: '100%', height: 54, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 14, textAlign: 'center', fontSize: 22, fontWeight: '800', color: '#0F2C40', backgroundColor: '#F8FAFC', marginBottom: 4 },
  timeUnitLabel: { fontSize: 11, color: '#627D98', fontWeight: '600' },
  timeSeparator: { fontSize: 24, fontWeight: '800', color: '#627D98', marginHorizontal: 12 },
  actionButtonLight: { backgroundColor: '#EBF5FB', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#D8ECF8' },
  actionButtonLightText: { color: '#174A62', fontSize: 14, fontWeight: '700' },
});