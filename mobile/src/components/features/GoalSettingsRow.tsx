import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

type Priority = 'baja' | 'media' | 'alta';

interface GoalSettingsRowProps {
  priority: Priority;
  onSelectPriority: (p: Priority) => void;
  weeklyHours: number | null;
  onChangeHours: (newHours: number) => void; // <--- Añadimos esta función prop
  isLoadingAvailability: boolean;
  availabilityErrorMessage: string | null;
}

export function GoalSettingsRow({
  priority,
  onSelectPriority,
  weeklyHours,
  onChangeHours,
  isLoadingAvailability,
  availabilityErrorMessage,
}: GoalSettingsRowProps) {
  const currentHours = weeklyHours ?? 5; // Valor por defecto si es null

  const handleDecrement = () => {
    if (currentHours > 1) {
      onChangeHours(currentHours - 1);
    }
  };

  const handleIncrement = () => {
    onChangeHours(currentHours + 1);
  };

  return (
    <View style={styles.rowCardsContainer}>
      {/* Prioridad del objetivo */}
      <View style={[styles.card, styles.halfCard]}>
        <Text style={styles.cardBadge}>PRIORIDAD DEL OBJETIVO</Text>
        <View style={styles.priorityChipsRow}>
          {(['baja', 'media', 'alta'] as Priority[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.miniChip,
                priority === p && styles.miniChipSelected,
              ]}
              onPress={() => onSelectPriority(p)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.miniChipText,
                  priority === p && styles.miniChipTextSelected,
                ]}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Horas semanales interactivas */}
      <View style={[styles.card, styles.halfCard]}>
        <Text style={styles.cardBadge}>TIEMPO DISPONIBLE</Text>
        <View style={styles.counterRow}>
          {isLoadingAvailability ? (
            <ActivityIndicator size="small" color="#174A62" />
          ) : availabilityErrorMessage ? (
            <Text style={styles.availabilityError}>{availabilityErrorMessage}</Text>
          ) : (
            <View style={styles.stepperContainer}>
              <TouchableOpacity
                style={styles.stepButton}
                onPress={handleDecrement}
                activeOpacity={0.7}
              >
                <Feather name="minus" size={14} color="#174A62" />
              </TouchableOpacity>

              <View style={styles.counterTextContainer}>
                <Text style={styles.counterValue}>
                  {Number(currentHours.toFixed(1))}h
                </Text>
                <Text style={styles.counterSub}>por semana</Text>
              </View>

              <TouchableOpacity
                style={styles.stepButton}
                onPress={handleIncrement}
                activeOpacity={0.7}
              >
                <Feather name="plus" size={14} color="#174A62" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    elevation: 4,
  },
  rowCardsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCard: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  cardBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1,
    marginBottom: 6,
  },
  priorityChipsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  miniChip: {
    flex: 1,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniChipSelected: {
    backgroundColor: '#D8ECF8',
    borderColor: '#174A62',
  },
  miniChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#627D98',
  },
  miniChipTextSelected: {
    color: '#174A62',
    fontWeight: '800',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  stepButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EBF5FB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D8ECF8',
  },
  counterTextContainer: {
    alignItems: 'center',
  },
  counterValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F2C40',
  },
  counterSub: {
    fontSize: 9,
    color: '#627D98',
  },
  availabilityError: {
    fontSize: 10,
    lineHeight: 14,
    color: '#C53030',
    textAlign: 'center',
    marginTop: 4,
  },
});