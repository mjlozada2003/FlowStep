import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { HistoryItem } from '@/services/tracking-helpers';

interface HistoryTimelineCardProps {
  item: HistoryItem;
  isLast: boolean;
}

export function HistoryTimelineCard({ item, isLast }: HistoryTimelineCardProps) {
  return (
    <View style={styles.timelineCardWrapper}>
      {!isLast && <View style={styles.timelineConnectorLine} />}
      <View style={styles.cardItem}>
        <View style={styles.statusIconContainer}>
          {item.status === 'completed' && (
            <View style={[styles.iconCircle, styles.bgSuccess]}>
              <Feather name="check" size={14} color="#FFFFFF" />
            </View>
          )}
          {item.status === 'missed' && (
            <View style={[styles.iconCircle, styles.bgMissed]}>
              <Text style={styles.exclamationText}>!</Text>
            </View>
          )}
          {item.status === 'pending' && (
            <View style={[styles.iconCircle, styles.bgPending]}>
              <View style={styles.innerPendingDot} />
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.stageTitleText} numberOfLines={1}>{item.stage_title}</Text>
            <View
              style={[
                styles.statusBadge,
                item.status === 'completed' && styles.badgeSuccess,
                item.status === 'missed' && styles.badgeMissed,
                item.status === 'pending' && styles.badgePending,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  item.status === 'completed' && styles.badgeSuccessText,
                  item.status === 'missed' && styles.badgeMissedText,
                  item.status === 'pending' && styles.badgePendingText,
                ]}
              >
                {item.status_label}
              </Text>
            </View>
          </View>

          <Text style={styles.activityTitle}>{item.activity_title}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.dateText}>{item.date_str}</Text>
            {item.duration_str && (
              <View style={styles.durationTag}>
                <Feather name="clock" size={12} color="#627D98" style={{ marginRight: 4 }} />
                <Text style={styles.durationText}>{item.duration_str}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  timelineCardWrapper: { position: 'relative', marginBottom: 12 },
  timelineConnectorLine: { position: 'absolute', left: 27, top: 36, bottom: -20, width: 2, backgroundColor: '#E2E8F0', zIndex: 0 },
  cardItem: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', zIndex: 1, shadowColor: '#174A62', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, elevation: 2 },
  statusIconContainer: { marginRight: 12 },
  iconCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bgSuccess: { backgroundColor: '#2F855A' },
  bgMissed: { backgroundColor: '#DD6B20' },
  bgPending: { backgroundColor: '#94A3B8' },
  exclamationText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  innerPendingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  cardContent: { flex: 1 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  stageTitleText: { fontSize: 10, fontWeight: '700', color: '#627D98', flex: 1, marginRight: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeSuccess: { backgroundColor: '#E6FFFA' },
  badgeMissed: { backgroundColor: '#FEEBC8' },
  badgePending: { backgroundColor: '#F1F5F9' },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  badgeSuccessText: { color: '#234E52' },
  badgeMissedText: { color: '#7B341E' },
  badgePendingText: { color: '#475569' },
  activityTitle: { fontSize: 14, fontWeight: '800', color: '#0F2C40', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: 11, color: '#627D98', fontWeight: '600', marginRight: 12 },
  durationTag: { flexDirection: 'row', alignItems: 'center' },
  durationText: { fontSize: 11, color: '#627D98', fontWeight: '600' },
});