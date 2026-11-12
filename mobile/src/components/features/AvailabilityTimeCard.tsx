import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const SESSION_TIMES = ['30 min', '1 hora', '2 horas'];

interface AvailabilityTimeCardProps {
  startHour: number;
  endHour: number;
  onIncrementStart: () => void;
  onDecrementStart: () => void;
  onIncrementEnd: () => void;
  onDecrementEnd: () => void;
  sessionTime: string;
  onSelectSessionTime: (time: string) => void;
}

export function AvailabilityTimeCard({
  startHour,
  endHour,
  onIncrementStart,
  onDecrementStart,
  onIncrementEnd,
  onDecrementEnd,
  sessionTime,
  onSelectSessionTime,
}: AvailabilityTimeCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>HORARIO HABITUAL</Text>
      <Text style={styles.cardTitle}>Franja de trabajo</Text>

      <View style={styles.timeControlRow}>
        {/* Hora Inicio */}
        <View style={styles.timeBox}>
          <Text style={styles.timeBoxLabel}>DESDE</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity style={styles.stepBtn} onPress={onDecrementStart} activeOpacity={0.7}>
              <Feather name="minus" size={14} color="#174A62" />
            </TouchableOpacity>
            <Text style={styles.timeValue}>{String(startHour).padStart(2, '0')}:00</Text>
            <TouchableOpacity style={styles.stepBtn} onPress={onIncrementStart} activeOpacity={0.7}>
              <Feather name="plus" size={14} color="#174A62" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.timeDash}>—</Text>

        {/* Hora Fin */}
        <View style={styles.timeBox}>
          <Text style={styles.timeBoxLabel}>HASTA</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity style={styles.stepBtn} onPress={onDecrementEnd} activeOpacity={0.7}>
              <Feather name="minus" size={14} color="#174A62" />
            </TouchableOpacity>
            <Text style={styles.timeValue}>{String(endHour).padStart(2, '0')}:00</Text>
            <TouchableOpacity style={styles.stepBtn} onPress={onIncrementEnd} activeOpacity={0.7}>
              <Feather name="plus" size={14} color="#174A62" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Tiempo por sesión */}
      <Text style={styles.sessionLabel}>Tiempo por sesión</Text>
      <View style={styles.sessionTimesRow}>
        {SESSION_TIMES.map((time) => {
          const isSelected = sessionTime === time;
          return (
            <TouchableOpacity
              key={time}
              style={[
                styles.sessionBtn,
                isSelected && styles.sessionBtnSelected,
              ]}
              onPress={() => onSelectSessionTime(time)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.sessionBtnText,
                  isSelected && styles.sessionBtnTextSelected,
                ]}
              >
                {time}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    elevation: 3,
    gap: 10,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F2C40',
    marginTop: -2,
    marginBottom: 4,
  },
  timeControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  timeBox: {
    flex: 1,
    backgroundColor: '#FAF6F0',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    gap: 4,
  },
  timeBoxLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#627D98',
    letterSpacing: 1,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EBF5FB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D8ECF8',
  },
  timeValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F2C40',
  },
  timeDash: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  sessionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F2C40',
  },
  sessionTimesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sessionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FAF6F0',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionBtnSelected: {
    backgroundColor: '#D8ECF8',
    borderColor: '#174A62',
  },
  sessionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#627D98',
  },
  sessionBtnTextSelected: {
    color: '#174A62',
    fontWeight: '800',
  },
});