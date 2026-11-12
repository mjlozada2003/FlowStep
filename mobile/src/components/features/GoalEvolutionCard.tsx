import { StyleSheet, Text, View } from 'react-native';

interface WeeklyProgressItem {
  week_start: string;
  minutes_spent: number;
  completed_estimated_minutes: number;
  planned_estimated_minutes: number;
}

interface GoalEvolutionCardProps {
  weeklyProgress?: WeeklyProgressItem[];
}

export function GoalEvolutionCard({ weeklyProgress = [] }: GoalEvolutionCardProps) {
  // Si no hay datos de la API, usamos un mock compatible con la estructura real
  const points = weeklyProgress.length > 0 ? weeklyProgress : [
    { week_start: '2026-05-20', minutes_spent: 30, completed_estimated_minutes: 30, planned_estimated_minutes: 100 },
    { week_start: '2026-05-27', minutes_spent: 60, completed_estimated_minutes: 60, planned_estimated_minutes: 100 },
    { week_start: '2026-06-03', minutes_spent: 90, completed_estimated_minutes: 90, planned_estimated_minutes: 100 },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRowSpace}>
        <View>
          <Text style={styles.sectionCategory}>EVOLUCIÓN</Text>
          <Text style={styles.sectionTitle}>Avance en el tiempo</Text>
        </View>
        <View style={styles.badgeEvolution}>
          <Text style={styles.badgeEvolutionText}>+3% esta semana</Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <View style={styles.yAxisLabels}>
          <Text style={styles.axisText}>100m</Text>
          <Text style={styles.axisText}>60m</Text>
          <Text style={styles.axisText}>30m</Text>
          <Text style={styles.axisText}>0m</Text>
        </View>

        <View style={styles.graphArea}>
          <View style={[styles.gridLine, { top: '0%' }]} />
          <View style={[styles.gridLine, { top: '33%' }]} />
          <View style={[styles.gridLine, { top: '66%' }]} />
          <View style={[styles.gridLine, { top: '100%' }]} />

          <View style={styles.lineOverlay} />

          {points.map((pt, idx) => {
            // Calculamos una altura proporcional basada en los minutos invertidos (máximo 120 min de referencia)
            const maxRefMinutes = 120;
            const bottomPercent = Math.min(100, Math.max(5, (pt.minutes_spent / maxRefMinutes) * 100));
            
            // Formatear la fecha '2026-05-20' a algo corto como '20 may'
            let formattedLabel = pt.week_start;
            try {
              const dateObj = new Date(pt.week_start);
              if (!isNaN(dateObj.getTime())) {
                formattedLabel = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
              }
            } catch {
              // fallback
            }

            return (
              <View key={idx} style={[styles.pointWrapper, { bottom: `${bottomPercent}%` }]}>
                <View style={styles.dataPoint} />
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.xAxisLabels}>
        {points.map((pt, idx) => {
          let label = pt.week_start;
          try {
            const dateObj = new Date(pt.week_start);
            if (!isNaN(dateObj.getTime())) {
              label = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
            }
          } catch {
            // fallback
          }
          return (
            <Text key={idx} style={styles.axisText} numberOfLines={1}>
              {label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E4E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRowSpace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: '#174A62',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F2C40',
  },
  badgeEvolution: {
    backgroundColor: '#EBF5FB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeEvolutionText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#174A62',
  },
  chartContainer: {
    flexDirection: 'row',
    height: 130,
    alignItems: 'center',
    marginBottom: 8,
  },
  yAxisLabels: {
    width: 34,
    height: '100%',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  axisText: {
    fontSize: 9,
    color: '#9FB3C8',
  },
  graphArea: {
    flex: 1,
    height: '100%',
    position: 'relative',
    justifyContent: 'flex-end',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#F0F4F8',
  },
  lineOverlay: {
    position: 'absolute',
    top: 20,
    bottom: 10,
    left: 15,
    right: 15,
    borderBottomWidth: 2.5,
    borderColor: '#38B2AC',
    opacity: 0.8,
  },
  pointWrapper: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -6 }],
  },
  dataPoint: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#38B2AC',
  },
  xAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 34,
  },
});