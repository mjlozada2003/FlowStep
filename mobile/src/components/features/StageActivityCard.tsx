import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
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
  description?: string;
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
  const [isExpanded, setIsExpanded] = useState(false);
  const isReinforcement = activity.type === 'reinforcement' || activity.title.toLowerCase().includes('refuerzo');
  const isPractice = activity.type === 'practice' || activity.title.toLowerCase().includes('práctica');

  return (
    <View style={[styles.activityCard, activity.completed && styles.activityCardCompleted]}>
      <View style={styles.cardContentRow}>
        <TouchableOpacity
          style={[styles.checkbox, activity.completed && styles.checkboxCompleted]}
          onPress={onToggle}
          disabled={isBusy}
          activeOpacity={0.8}
        >
          {isBusy ? (
            <ActivityIndicator size="small" color="#174A62" />
          ) : activity.completed ? (
            <Feather name="check" size={14} color="#FFFFFF" />
          ) : null}
        </TouchableOpacity>

        <Pressable
          style={styles.cardMainClickable}
          onPress={() => {
            if (activity.description) {
              setIsExpanded(!isExpanded);
            }
          }}
        >
          <View style={styles.activityInfo}>
            <View style={styles.badgeRow}>
              <Text style={styles.activityBadge}>ACTIVIDAD {index + 1}</Text>
              {isReinforcement ? (
                <View style={styles.reinforcementBadge}>
                  <Feather name="zap" size={10} color="#B45309" />
                  <Text style={styles.reinforcementBadgeText}>Refuerzo guiado</Text>
                </View>
              ) : isPractice ? (
                <View style={styles.practiceBadge}>
                  <Feather name="code" size={10} color="#047857" />
                  <Text style={styles.practiceBadgeText}>Práctica guiada</Text>
                </View>
              ) : null}
            </View>

            <Text style={[styles.activityTitle, activity.completed && styles.activityTitleCompleted]}>
              {activity.title}
            </Text>

            {activity.date ? (
              <Text style={styles.activityDateText}>
                <Feather name="calendar" size={11} color="#627D98" /> {activity.date}
              </Text>
            ) : null}

            {activity.description ? (
              <View style={styles.guideWrapper}>
                {isExpanded ? (
                  <View style={styles.expandedGuideBox}>
                    <Text style={styles.expandedGuideTitle}>Instrucciones y pasos:</Text>
                    <Text style={styles.expandedGuideText}>{activity.description}</Text>
                  </View>
                ) : (
                  <View style={styles.seeGuideRow}>
                    <Feather name="chevron-down" size={12} color="#174A62" />
                    <Text style={styles.seeGuideHint}>Ver guía paso a paso</Text>
                  </View>
                )}
              </View>
            ) : null}
          </View>
        </Pressable>

        <TouchableOpacity style={styles.editIconButton} onPress={onEdit} activeOpacity={0.7}>
          <Feather name="edit-2" size={16} color="#174A62" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  activityCardCompleted: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  cardContentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardMainClickable: {
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxCompleted: {
    backgroundColor: '#174A62',
    borderColor: '#174A62',
  },
  activityInfo: {
    gap: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  activityBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#627D98',
    letterSpacing: 0.8,
  },
  reinforcementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  reinforcementBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  practiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  practiceBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
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
    marginTop: 1,
  },
  guideWrapper: {
    marginTop: 4,
  },
  seeGuideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  seeGuideHint: {
    fontSize: 11,
    fontWeight: '700',
    color: '#174A62',
  },
  expandedGuideBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
    gap: 4,
  },
  expandedGuideTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#174A62',
  },
  expandedGuideText: {
    fontSize: 12,
    color: '#334E68',
    lineHeight: 18,
  },
  editIconButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    marginTop: 2,
  },
});