import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

export function FlowThinkingMascot() {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    ).start();
  }, [pulseAnim, waveAnim]);

  const waveScale = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  });

  const waveOpacity = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0],
  });

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          styles.radarWave,
          {
            transform: [{ scale: waveScale }],
            opacity: waveOpacity,
          },
        ]}
      />

      <Animated.View
        style={[
          styles.avatarCircle,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
        >
            
        {/* Ojos */}
        <View style={styles.eyesRow}>
          <View style={styles.eye} />
          <View style={styles.eye} />
        </View>

        {/* Sonrisa */}
        <View style={styles.smile} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 90,
  },
  radarWave: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#D8ECF8',
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#174A62',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    position: 'relative',
  },
  handle: {
    position: 'absolute',
    top: 6,
    width: 22,
    height: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#174A62',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  eyesRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 6,
    marginBottom: 4,
  },
  eye: {
    width: 6,
    height: 10,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  smile: {
    width: 16,
    height: 6,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderTopWidth: 0,
    marginTop: 2,
  },
});