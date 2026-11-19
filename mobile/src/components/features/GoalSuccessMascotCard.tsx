import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

interface GoalSuccessMascotCardProps {
  quote?: string;
}

export function GoalSuccessMascotCard({ quote }: GoalSuccessMascotCardProps) {
  return (
    <View style={styles.mascotCard}>
      <View style={styles.mascotAvatar}>
        <Feather name="smile" size={20} color="#174A62" />
      </View>
      <View style={styles.mascotTextContainer}>
        <Text style={styles.mascotTitle}>Flow dice:</Text>
        <Text style={styles.mascotSubtitle}>
          &ldquo;{quote || 'El progreso se construye paso a paso. Ya diste el primero.'}&rdquo;
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mascotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FB',
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  mascotAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D8ECF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascotTextContainer: {
    flex: 1,
  },
  mascotTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#174A62',
    marginBottom: 2,
  },
  mascotSubtitle: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 17,
  },
});