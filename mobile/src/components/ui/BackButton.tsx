import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';

interface BackButtonProps {
  onPress?: () => void;
  style?: ViewStyle;
}

export function BackButton({ onPress, style }: BackButtonProps) {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.backButton, style]}
      activeOpacity={0.7}
    >
      <Feather name="chevron-left" size={24} color="#0F2C40" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19, // <--- Si los prefieres totalmente redondos (o cámbialo a 12 si prefieres semicuadrados)
    borderWidth: 1,
    borderColor: '#E4E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
});