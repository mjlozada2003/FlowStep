import { Feather } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

export function FlowThinkingMascot() {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animación de pulso para la mascota
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

    // Animación de onda expansiva de fondo
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
      {/* Onda expansiva de fondo */}
      <Animated.View
        style={[
          styles.radarWave,
          {
            transform: [{ scale: waveScale }],
            opacity: waveOpacity,
          },
        ]}
      />

      {/* Círculo principal con pulso */}
      <Animated.View
        style={[
          styles.avatarCircle,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <Feather name="cpu" size={34} color="#174A62" />
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
    backgroundColor: '#D8ECF8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});