import React from 'react';
import { Image, View } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';
import { Text } from '../primitives/Text';

interface Props {
  name: string;
  imageUrl?: string | null;
  size?: number;
}

export function RoleAvatar({ name, imageUrl, size = 40 }: Props) {
  const theme = useTheme();
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  const style = {
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: theme.colors.primaryContainer,
    overflow: 'hidden' as const,
  };

  if (imageUrl) {
    return <Image source={{ uri: imageUrl }} style={style} />;
  }

  return (
    <View style={style}>
      <Text style={{ color: theme.colors.onPrimaryContainer, fontSize: size * 0.4, fontWeight: '700' }}>{initial}</Text>
    </View>
  );
}
