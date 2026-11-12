import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const DAYS = [
  { key: 'L', label: 'Lun' },
  { key: 'M', label: 'Mar' },
  { key: 'X', label: 'Mié' },
  { key: 'J', label: 'Jue' },
  { key: 'V', label: 'Vie' },
  { key: 'S', label: 'Sáb' },
  { key: 'D', label: 'Dom' },
];

interface AvailabilityDaysCardProps {
  selectedDays: string[];
  onToggleDay: (key: string) => void;
}

export function AvailabilityDaysCard({ selectedDays, onToggleDay }: AvailabilityDaysCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardLabel}>DÍAS DISPONIBLES</Text>
        <View style={styles.badgeCount}>
          <Text style={styles.badgeCountText}>{selectedDays.length} días</Text>
        </View>
      </View>

      <Text style={styles.cardTitle}>Selecciona tus días</Text>

      <View style={styles.daysRow}>
        {DAYS.map((day) => {
          const isSelected = selectedDays.includes(day.key);
          return (
            <TouchableOpacity
              key={day.key}
              style={[
                styles.dayCircle,
                isSelected && styles.dayCircleSelected,
              ]}
              onPress={() => onToggleDay(day.key)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.dayText,
                  isSelected && styles.dayTextSelected,
                ]}
              >
                {day.key}
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
  },
  badgeCount: {
    backgroundColor: '#EBF5FB',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F2C40',
    marginTop: -2,
    marginBottom: 4,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4, // Espacio mínimo y controlado entre cada día para que quepan los 7 juntos
  },
  dayCircle: {
    flex: 1, // Se estiran de forma equitativa ocupando exactamente el ancho disponible
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleSelected: {
    backgroundColor: '#174A62',
    borderColor: '#174A62',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#627D98',
    textAlign: 'center', // Asegura que la letra quede perfectamente centrada
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
});