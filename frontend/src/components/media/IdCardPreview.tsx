import React from 'react';
import { Image, View } from 'react-native';
import { AuthImage } from './AuthImage';
import { Text } from '../primitives/Text';
import { useThemedStyles } from '../../theme/useThemedStyles';
import type { AppTheme } from '../../theme/types';

interface Props {
  fullName: string;
  designation: string;
  email: string | null;
  departmentName: string | null;
  cardNumber: string | null;
  emergencyContactPhone: string | null;
  photoFileId: string | null;
}

/** Compact in-app preview mirroring the server-rendered PDF layout (IdCardPdfRenderer.cs):
 * Logo -> rounded photo -> Name/Designation/Email/Department/Intern ID/Emergency Phone. Used both
 * for the intern's own status screen and the mentor/admin pre-submit preview - no full-screen
 * background fill, just this one fixed-size card. */
export function IdCardPreview({ fullName, designation, email, departmentName, cardNumber, emergencyContactPhone, photoFileId }: Props) {
  const s = useThemedStyles(makeStyles);

  return (
    <View style={s.card}>
      <Image source={require('../../../assets/pia-logo.png')} style={s.logo} resizeMode="contain" />
      <Text variant="overline" tone="brand" style={s.brand}>
        PIA
      </Text>
      <Text variant="caption" tone="secondary" style={s.subBrand}>
        Internee ID Card
      </Text>

      {photoFileId ? (
        <AuthImage fileId={photoFileId} size={72} style={s.photo} />
      ) : (
        <View style={[s.photo, s.photoPlaceholder]} />
      )}

      <Text variant="bodyStrong" style={s.name} numberOfLines={1}>
        {fullName}
      </Text>
      {designation ? (
        <Text variant="caption" tone="secondary" numberOfLines={1}>
          {designation}
        </Text>
      ) : null}
      {email ? (
        <Text variant="caption" numberOfLines={1}>
          {email}
        </Text>
      ) : null}
      {departmentName ? <Text variant="caption">{departmentName}</Text> : null}
      {cardNumber ? <Text variant="caption">ID: {cardNumber}</Text> : null}
      {emergencyContactPhone ? <Text variant="caption">Emergency: {emergencyContactPhone}</Text> : null}
    </View>
  );
}

const makeStyles = (t: AppTheme) => ({
  card: {
    alignSelf: 'center' as const,
    width: 220,
    alignItems: 'center' as const,
    backgroundColor: t.colors.successBg,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    gap: 2,
    ...t.shadows.sm,
  },
  logo: { width: 40, height: 40, marginBottom: 2 },
  brand: { color: t.colors.primary },
  subBrand: { marginBottom: t.spacing.sm },
  photo: { borderRadius: t.radii.lg, marginBottom: t.spacing.sm, borderWidth: 2, borderColor: t.colors.borderStrong },
  photoPlaceholder: { width: 72, height: 72, backgroundColor: t.colors.skeleton },
  name: { marginTop: 2 },
});
