import { StyleSheet, View } from 'react-native';

export function FlowMascotAvatar() {
  return (
    <View style={styles.mascotWrapper}>
      {/* La cabeza redonda (sin asa) */}
      <View style={styles.head}>
        {/* Ojos */}
        <View style={styles.eyesRow}>
          <View style={styles.eye} />
          <View style={styles.eye} />
        </View>
        {/* Sonrisa */}
        <View style={styles.smile} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mascotWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
  head: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#174A62',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  eyesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  eye: {
    width: 4,
    height: 6,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  smile: {
    width: 10,
    height: 4,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderTopWidth: 0,
    position: 'absolute',
    bottom: 8,
  },
});