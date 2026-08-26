import React from 'react';
import { Pressable, type StyleProp, type ImageStyle } from 'react-native';
import { Image, type ImageContentFit } from 'expo-image';
import { getAccessToken, apiBaseUrl } from '../../api/client';

interface Props {
  fileId: string;
  size?: number;
  style?: StyleProp<ImageStyle>;
  onPress?: () => void;
  /** How the image fills its box. Defaults to 'cover' (crops to fill a square thumbnail) -
   * pass 'contain' for full-document previews so nothing gets cropped off the edges. */
  contentFit?: ImageContentFit;
}

/** RN's core Image does not run through the axios interceptor, so the JWT has to be attached
 * directly via source.headers - used for viewing attendance selfies, which are auth-gated files.
 * Uses expo-image instead of RN core Image because core Image unreliably drops custom
 * `source.headers` on Android, causing the backend's [Authorize]-protected /api/files endpoint
 * to 401 silently (no visible error - the image area just stays blank). expo-image sends
 * headers reliably on both platforms. */
export function AuthImage({ fileId, size = 40, style, onPress, contentFit = 'cover' }: Props) {
  const token = getAccessToken();
  const uri = `${apiBaseUrl}/api/files/${fileId}`;

  const image = (
    <Image
      source={{ uri, headers: token ? { Authorization: `Bearer ${token}` } : undefined }}
      style={[{ width: size, height: size, borderRadius: 6 }, style]}
      contentFit={contentFit}
      cachePolicy="none"
    />
  );

  return onPress ? <Pressable onPress={onPress}>{image}</Pressable> : image;
}