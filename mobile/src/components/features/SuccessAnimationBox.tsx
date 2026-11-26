import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

interface SuccessAnimationBoxProps {
  isError?: boolean;
}

export function SuccessAnimationBox({ isError = false }: SuccessAnimationBoxProps) {
  const [scaleAnim] = useState(() => new Animated.Value(0));
  const [bounceAnim] = useState(() => new Animated.Value(1));

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

    // Animación de pulso continuo sutil
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
          isError && styles.errorCircle,
          {
            transform: [{ scale: Animated.multiply(scaleAnim, bounceAnim) }],
          },
        ]}
      >
        <Feather 
          name={isError ? 'x' : 'check'} 
          size={34} 
          color="#FFFFFF" 
        />
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
  errorCircle: {
    backgroundColor: '#C53030',
    shadowColor: '#C53030',
  },
});