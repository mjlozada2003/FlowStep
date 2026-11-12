import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface StageActivityData {
  id: number;
  title: string;
  duration: number | null;
  type: string;
  date: string;
  rawDate?: string;
  rawTime?: string;
  completed: boolean;
}

interface StageActivityCardProps {
  activity: StageActivityData;
  index: number;
  isBusy: boolean;
  onToggle: () => void;
  onEdit: () => void;
}

export function StageActivityCard({
  activity,
  index,
  isBusy,
  onToggle,
  onEdit,
}: StageActivityCardProps) {
  return (
    <View style={[styles.activityCard, activity.completed && styles.activityCardCompleted]}>
      <Pressable style={styles.cardMainClickable} onPress={onToggle} disabled={isBusy}>
        <View style={[styles.checkbox, activity.completed && styles.checkboxCompleted]}>
          {isBusy ? (
            <ActivityIndicator size="small" color="#174A62" />
          ) : activity.completed ? (
            <Feather name="check" size={14} color="#FFFFFF" />
          ) : null}
        </View>

        <View style={styles.activityInfo}>
          <Text style={styles.activityBadge}>ACTIVIDAD {index + 1}</Text>
          <Text style={[styles.activityTitle, activity.completed && styles.activityTitleCompleted]}>
            {activity.title}
          </Text>
          {activity.date ? (
            <Text style={styles.activityDateText}>
              <Feather name="calendar" size={11} color="#627D98" /> {activity.date}
            </Text>
          ) : null}
        </View>
      </Pressable>

      <TouchableOpacity style={styles.editIconButton} onPress={onEdit} activeOpacity={0.7}>
        <Feather name="edit-2" size={16} color="#174A62" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  activityCardCompleted: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  cardMainClickable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    backgroundColor: '#174A62',
    borderColor: '#174A62',
  },
  activityInfo: {
    flex: 1,
    gap: 2,
  },
  activityBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#627D98',
    letterSpacing: 0.8,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F2C40',
  },
  activityTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  activityDateText: {
    fontSize: 11,
    color: '#627D98',
    marginTop: 2,
  },
  editIconButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
});