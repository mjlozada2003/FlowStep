import { StyleSheet, Text, View } from 'react-native';

interface GoalDistributionCardProps {
  completed: number;
  pending: number;
  skipped: number;
  total: number;
}

export function GoalDistributionCard({
  completed = 3,
  pending = 8,
  skipped = 1,
  total = 12,
}: GoalDistributionCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRowSpace}>
        <View>
          <Text style={styles.sectionCategory}>DISTRIBUCIÓN</Text>
          <Text style={styles.sectionTitle}>Estado de actividades</Text>
        </View>
      </View>

      <View style={styles.contentRow}>
        {/* Simulación visual de gráfico circular / donut */}
        <View style={styles.donutContainer}>
          <View style={styles.donutRing}>
            <View style={styles.donutCenter}>
              <Text style={styles.donutNumber}>{total}</Text>
              <Text style={styles.donutSub}>actividades</Text>
            </View>
          </View>
        </View>

        {/* Leyenda de estados */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#38B2AC' }]} />
            <Text style={styles.legendText}>Completadas</Text>
            <Text style={styles.legendVal}>{completed}</Text>
          </View>

          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#9FB3C8' }]} />
            <Text style={styles.legendText}>Pendientes</Text>
            <Text style={styles.legendVal}>{pending}</Text>
          </View>

          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#DD6B20' }]} />
            <Text style={styles.legendText}>No completadas</Text>
            <Text style={styles.legendVal}>{skipped}</Text>
          </View>
        </View>
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
    marginBottom: 14,
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
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  donutContainer: {
    width: 110,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 12,
    borderColor: '#9FB3C8',
    borderTopColor: '#38B2AC',
    borderRightColor: '#DD6B20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutCenter: {
    alignItems: 'center',
  },
  donutNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F2C40',
  },
  donutSub: {
    fontSize: 9,
    color: '#627D98',
  },
  legendContainer: {
    flex: 1,
    marginLeft: 20,
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#334E68',
    flex: 1,
  },
  legendVal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F2C40',
  },
});