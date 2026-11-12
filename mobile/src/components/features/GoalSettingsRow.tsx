import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Priority = 'baja' | 'media' | 'alta';

interface GoalSettingsRowProps {
  priority: Priority;
  onSelectPriority: (p: Priority) => void;
  weeklyHours: number | null;
  isLoadingAvailability: boolean;
  availabilityErrorMessage: string | null;
}

export function GoalSettingsRow({
  priority,
  onSelectPriority,
  weeklyHours,
  isLoadingAvailability,
  availabilityErrorMessage,
}: GoalSettingsRowProps) {
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

      {/* Horas semanales persistidas */}
      <View style={[styles.card, styles.halfCard]}>
        <Text style={styles.cardBadge}>TIEMPO DISPONIBLE</Text>
        <View style={styles.counterRow}>
          <View style={styles.counterTextContainer}>
            {isLoadingAvailability ? (
              <ActivityIndicator size="small" color="#174A62" />
            ) : (
              <Text style={styles.counterValue}>
                {availabilityErrorMessage
                  ? 'No disponible'
                  : weeklyHours === null
                    ? 'Sin configurar'
                    : `${Number(weeklyHours.toFixed(2))} horas`}
              </Text>
            )}
            <Text style={styles.counterSub}>por semana</Text>
          </View>
        </View>
        {availabilityErrorMessage ? (
          <Text style={styles.availabilityError}>{availabilityErrorMessage}</Text>
        ) : null}
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
    justifyContent: 'space-between',
    marginTop: 4,
  },
  counterTextContainer: {
    alignItems: 'center',
    width: '100%',
  },
  counterValue: {
    fontSize: 13,
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