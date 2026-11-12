import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

interface GoalOverviewCardProps {
  title?: string;
  dueDate?: string | null;
  isLoading: boolean;
}

export function GoalOverviewCard({ title, dueDate, isLoading }: GoalOverviewCardProps) {
  const goalDate = dueDate ? `Fecha límite: ${dueDate}` : 'Sin fecha límite';

  return (
    <View style={styles.goalCard}>
      <View style={styles.goalIconCircle}>
        <Feather name="target" size={22} color="#174A62" />
      </View>
      <View style={styles.goalTextContainer}>
        <Text style={styles.goalCardBadge}>TU OBJETIVO</Text>
        <Text style={styles.goalCardTitle}>
          {title ?? (isLoading ? 'Cargando objetivo…' : 'Objetivo no disponible')}
        </Text>
        <Text style={styles.goalCardDate}>{goalDate}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  goalCard: {
    backgroundColor: '#174A62',
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    elevation: 4,
  },
  goalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalTextContainer: {
    flex: 1,
  },
  goalCardBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#90C2DE',
    letterSpacing: 1,
    marginBottom: 2,
  },
  goalCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  goalCardDate: {
    fontSize: 11,
    color: '#D8ECF8',
  },
});