import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface ScheduleItemData {
  id: number;
  day: string;
  date: string;
  scheduledDate: string;
  time: string;
  title: string;
  stage: string;
  stageId?: number;
  status: string | null;
  durationMinutes: number | null;
}

interface ScheduleItemCardProps {
  item: ScheduleItemData;
  onPress: () => void;
}

export function ScheduleItemCard({ item, onPress }: ScheduleItemCardProps) {
  return (
    <TouchableOpacity
      style={styles.activityCard}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={styles.dateBox}>
        <Text style={styles.dateBoxDay}>{item.day}</Text>
        <Text style={styles.dateBoxNum}>{item.date}</Text>
      </View>

      <View style={styles.activityInfo}>
        <View style={styles.activityHeaderRow}>
          <Text style={styles.activityTime}>{item.time}</Text>
          {item.status ? (
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{item.status}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.activityTitle}>{item.title}</Text>
        <Text style={styles.activityStage}>{item.stage}</Text>
      </View>

      <Feather name="chevron-right" size={18} color="#94A3B8" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    elevation: 2,
  },
  dateBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#D8ECF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateBoxDay: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 0.5,
  },
  dateBoxNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F2C40',
  },
  activityInfo: {
    flex: 1,
  },
  activityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 11,
    color: '#627D98',
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#137333',
    letterSpacing: 0.5,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F2C40',
    marginBottom: 2,
  },
  activityStage: {
    fontSize: 12,
    color: '#94A3B8',
  },
});