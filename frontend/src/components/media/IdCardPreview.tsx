import React, { forwardRef } from 'react';
import { Image, View } from 'react-native';
import ViewShot from 'react-native-view-shot';
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

export const IdCardPreview = forwardRef<View, Props>(function IdCardPreview(
  { fullName, designation, email, departmentName, cardNumber, emergencyContactPhone, photoFileId },
  ref,
) {
  const s = useThemedStyles(makeStyles);

  return (
    <ViewShot ref={ref as any} options={{ format: 'png', quality: 1 }}>
      <View style={s.cardWrapper}>
        {/* Top Metallic Gold Accent Bar */}
        <View style={s.topBar} />

        <View style={s.cardBody}>
          {/* Header Section */}
          <View style={s.headerContainer}>
            <Image source={require('../../../assets/pia-logo.png')} style={s.logo} resizeMode="contain" />
            <Text variant="overline" style={s.brand} numberOfLines={1}>
              PIA WINGS
            </Text>
            <View style={s.badge}>
              <Text variant="caption" style={s.badgeText}>
                INTERNEE ID CARD
              </Text>
            </View>
          </View>

          {/* Photo Frame Section */}
          <View style={s.photoContainer}>
            {photoFileId ? (
              <AuthImage fileId={photoFileId} style={s.photo} />
            ) : (
              <View style={[s.photo, s.photoPlaceholder]} />
            )}
          </View>

          {/* User Primary Details */}
          <Text variant="bodyStrong" style={s.name} numberOfLines={1}>
            {fullName}
          </Text>

          {designation ? (
            <Text variant="caption" style={s.designation} numberOfLines={1}>
              {designation}
            </Text>
          ) : null}

          {/* Elegant Gradient Divider */}
          <View style={s.divider} />

          {/* Card Meta Details */}
          {departmentName ? (
            <Text variant="caption" style={s.deptText}>
              {departmentName}
            </Text>
          ) : null}

          {email ? (
            <Text variant="caption" style={s.email} numberOfLines={1}>
              {email}
            </Text>
          ) : null}

          {cardNumber ? (
            <View style={s.idBadge}>
              <Text variant="caption" style={s.idBadgeText}>
                ID: {cardNumber}
              </Text>
            </View>
          ) : null}

          {emergencyContactPhone ? (
            <Text variant="caption" style={s.emergencyText}>
              Emergency: {emergencyContactPhone}
            </Text>
          ) : null}
        </View>
      </View>
    </ViewShot>
  );
});

const makeStyles = (t: AppTheme) => ({
  cardWrapper: {
    alignSelf: 'center' as const,
    width: 275,
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg ?? 16,
    borderWidth: 1.5,
    borderColor: '#d1fae5',
    overflow: 'hidden' as const,
    ...t.shadows.md,
  },
  topBar: {
    height: 7,
    backgroundColor: '#047857',
    width: '100%' as const,
  },
  cardBody: {
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.xs,
    paddingBottom: t.spacing.lg,
    alignItems: 'center' as const,
    backgroundColor: '#f0fdf4',
  },
  headerContainer: {
    alignItems: 'center' as const,
    marginBottom: 4,
  },
  logo: {
    width: 68,
    height: 68,
    marginBottom: -6,
  },
  brand: {
    color: '#065f46',
    fontWeight: '900' as const,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: 1.5,
    marginTop: -4,
  },
  badge: {
    backgroundColor: 'rgba(4, 120, 87, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 20,
    marginTop: 3,
    borderWidth: 0.8,
    borderColor: 'rgba(4, 120, 87, 0.25)',
  },
  badgeText: {
    color: '#047857',
    fontSize: 9.5,
    fontWeight: '800' as const,
    letterSpacing: 0.8,
  },
  photoContainer: {
    marginVertical: 6,
    padding: 3,
    backgroundColor: '#ffffff',
    borderRadius: t.radii.md ?? 10,
    borderWidth: 2,
    borderColor: '#059669',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  photo: {
    width: 108,
    height: 135,
    borderRadius: (t.radii.md ?? 10) - 2,
  },
  photoPlaceholder: {
    backgroundColor: t.colors.skeleton,
  },
  name: {
    fontSize: 16.5,
    fontWeight: '800' as const,
    color: '#0f172a',
    marginTop: 2,
    textAlign: 'center' as const,
    letterSpacing: 0.2,
  },
  designation: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#059669',
    marginTop: 1,
  },
  divider: {
    width: '85%' as const,
    height: 1.5,
    backgroundColor: '#089a56',
    marginVertical: 8,
    borderRadius: 1,
  },
  deptText: {
    fontSize: 11.5,
    fontWeight: '700' as const,
    color: '#334155',
    marginBottom: 1,
  },
  email: {
    fontSize: 10.5,
    color: '#64748b',
    textAlign: 'center' as const,
    marginBottom: 4,
  },
  idBadge: {
    backgroundColor: '#047857',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 8,
    marginVertical: 3,
    elevation: 1,
  },
  idBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 0.8,
  },
  emergencyText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#64748b',
    marginTop: 3,
  },
});