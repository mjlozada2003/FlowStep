import { StyleSheet, Text, View } from 'react-native';

interface BrandHeaderProps {
  showTagline?: boolean;
}

export function BrandHeader({ showTagline = true }: BrandHeaderProps) {
  return (
    <View style={styles.brandHeader}>
      <View style={styles.logoRow}>
        <View style={styles.logoBars}>
          <View style={[styles.bar, styles.bar1]} />
          <View style={[styles.bar, styles.bar2]} />
          <View style={[styles.bar, styles.bar3]} />
        </View>
        <Text style={styles.brandName}>FlowStep</Text>
      </View>
      {showTagline ? (
        <Text style={styles.brandTagline}>Tu camino, paso a paso.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  brandHeader: {
    marginBottom: 20,
    paddingLeft: 4,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 22,
    marginRight: 4,
  },
  bar: {
    width: 5,
    borderRadius: 2.5,
    backgroundColor: '#174A62',
  },
  bar1: { height: 12 },
  bar2: { height: 17 },
  bar3: { height: 22 },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F2C40',
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 13,
    color: '#627D98',
    marginTop: 2,
  },
});