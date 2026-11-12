import { Feather } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

export function SuccessAnimationBox() {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animación de aparición con rebote al cargar
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.15,
        duration: 400,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Animación de pulso continuo sutil en el check
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1.05,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scaleAnim, bounceAnim]);

  return (
    <View style={styles.successIconContainer}>
      <Animated.View
        style={[
          styles.successCircle,
          {
            transform: [{ scale: Animated.multiply(scaleAnim, bounceAnim) }],
          },
        ]}
      >
        <Feather name="check" size={34} color="#FFFFFF" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  successIconContainer: {
    alignItems: 'center',
    marginVertical: 4,
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#38A169',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#38A169',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    elevation: 6,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
});