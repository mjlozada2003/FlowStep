import { StyleSheet, Text, View } from 'react-native';

interface HistoryStatsBannerProps {
  completedCount: number;
  hoursSpent: string;
  uncompletedCount: number;
}

export function HistoryStatsBanner({
  completedCount,
  hoursSpent,
  uncompletedCount,
}: HistoryStatsBannerProps) {
  return (
    <View style={styles.statsBanner}>
      <View style={styles.statCol}>
        <Text style={styles.statNumber}>{completedCount}</Text>
        <Text style={styles.statLabel}>completadas</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statCol}>
        <Text style={styles.statNumber}>{hoursSpent}</Text>
        <Text style={styles.statLabel}>dedicadas</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statCol}>
        <Text style={styles.statNumber}>{uncompletedCount}</Text>
        <Text style={styles.statLabel}>sin completar</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsBanner: {
    backgroundColor: '#174A62',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 20,
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    elevation: 3,
  },
  statCol: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 2 },
  statLabel: { fontSize: 10, color: '#9FB3C8', fontWeight: '600' },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255, 255, 255, 0.15)' },
});