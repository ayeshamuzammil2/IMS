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
        <View style={s.topBar} />

        <View style={s.cardBody}>
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

          <View style={s.photoContainer}>
            {photoFileId ? (
              <AuthImage fileId={photoFileId} style={s.photo} />
            ) : (
              <View style={[s.photo, s.photoPlaceholder]} />
            )}
          </View>

          <Text variant="bodyStrong" style={s.name} numberOfLines={1}>
            {fullName}
          </Text>

          {designation ? (
            <Text variant="caption" style={s.designation} numberOfLines={1}>
              {designation}
            </Text>
          ) : null}

          <View style={s.divider} />

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
                {cardNumber}
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
    backgroundColor: '#E8F5E9', // Fixed Mint Green (Ignores Dark/Light Mode)
    borderRadius: t.radii.lg ?? 16,
    borderWidth: 1.5,
    borderColor: '#C8E6C9', // Fixed Mint Border
    overflow: 'hidden' as const,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  topBar: {
    height: 7,
    backgroundColor: '#006633', // Fixed PIA Green Top Bar
    width: '100%' as const,
  },
  cardBody: {
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.xs,
    paddingBottom: t.spacing.lg,
    alignItems: 'center' as const,
    backgroundColor: '#E8F5E9', // Fixed Mint Green Body Background
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
    color: '#006633', // Fixed Brand Title Color
    fontWeight: '900' as const,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: 1.5,
    marginTop: -4,
  },
  badge: {
    backgroundColor: '#C8E6C9', // Fixed Light Mint Badge Fill
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 20,
    marginTop: 3,
    borderWidth: 0.8,
    borderColor: '#A5D6A7', // Fixed Badge Border
  },
  badgeText: {
    color: '#1B4D2E', // Fixed Dark Green Badge Label
    fontSize: 9.5,
    fontWeight: '800' as const,
    letterSpacing: 0.8,
  },
  photoContainer: {
    marginVertical: 6,
    padding: 3,
    backgroundColor: '#FFFFFF', // Fixed White Image Frame Background
    borderRadius: t.radii.md ?? 10,
    borderWidth: 2,
    borderColor: '#006633', // Fixed Dark Green Image Border
    elevation: 3,
    shadowColor: '#000000',
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
    backgroundColor: '#E0E0E0', // Fixed Skeleton Color
  },
  name: {
    fontSize: 16.5,
    fontWeight: '800' as const,
    color: '#111827', // Fixed Primary Dark Text (Ignores Theme)
    marginTop: 2,
    textAlign: 'center' as const,
    letterSpacing: 0.2,
  },
  designation: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#006633', // Fixed Designation Accent Color
    marginTop: 1,
  },
  divider: {
    width: '85%' as const,
    height: 1.5,
    backgroundColor: '#A5D6A7', // Fixed Divider Color
    marginVertical: 8,
    borderRadius: 1,
  },
  deptText: {
    fontSize: 11.5,
    fontWeight: '700' as const,
    color: '#374151', // Fixed Secondary Dark Gray Text
    marginBottom: 1,
  },
  email: {
    fontSize: 10.5,
    color: '#4B5563', // Fixed Muted Dark Text
    textAlign: 'center' as const,
    marginBottom: 4,
  },
  idBadge: {
    backgroundColor: '#006633', // Fixed PIA Green Badge Fill
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 8,
    marginVertical: 3,
    elevation: 1,
  },
  idBadgeText: {
    color: '#FFFFFF', // Fixed White Text
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 0.8,
  },
  emergencyText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#6B7280', // Fixed Contact Info Muted Color
    marginTop: 3,
  },
});