import React from 'react';
import { Image, Pressable, type StyleProp, type ImageStyle } from 'react-native';
import { getAccessToken, apiBaseUrl } from '../../api/client';

interface Props {
  fileId: string;
  size?: number;
  style?: StyleProp<ImageStyle>;
  onPress?: () => void;
}

/** RN's core Image does not run through the axios interceptor, so the JWT has to be attached
 * directly via source.headers - used for viewing attendance selfies, which are auth-gated files. */
export function AuthImage({ fileId, size = 40, style, onPress }: Props) {
  const token = getAccessToken();
  const uri = `${apiBaseUrl}/api/files/${fileId}`;

  const image = (
    <Image
      source={{ uri, headers: token ? { Authorization: `Bearer ${token}` } : undefined }}
      style={[{ width: size, height: size, borderRadius: 6 }, style]}
    />
  );

  return onPress ? <Pressable onPress={onPress}>{image}</Pressable> : image;
}
