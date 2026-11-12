import { StyleSheet, Text, View } from 'react-native';

interface ScheduleFreeTimeCardProps {
  freeTimeStr: string;
}

export function ScheduleFreeTimeCard({ freeTimeStr }: ScheduleFreeTimeCardProps) {
  return (
    <View style={styles.freeTimeCard}>
      <Text style={styles.freeTimeTitle}>{freeTimeStr}</Text>
      <Text style={styles.freeTimeSubtitle}>
        Tiempo libre calculado con tus horarios y actividades de esta semana.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  freeTimeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 2,
  },
  freeTimeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F2C40',
  },
  freeTimeSubtitle: {
    fontSize: 12,
    color: '#627D98',
  },
});