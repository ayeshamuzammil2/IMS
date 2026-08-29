import React, { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import * as Sharing from 'expo-sharing';
import { IdCard as IdCardIcon, Clock, XCircle, Lock, ShieldCheck } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Button } from '../../components/primitives/Button';
import { idCardsApi, type IdCardStatusKey } from '../../api/resources/idcards.api';
import { IdCardPreview } from '../../components/media/IdCardPreview';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';

const STATUS_CONFIG: Record<
  IdCardStatusKey,
  {
    tone: 'success' | 'warning' | 'error' | 'muted';
    title: string;
    description: string;
    Icon: typeof IdCardIcon;
  }
> = {
  Draft: {
    tone: 'muted',
    title: 'ID Card Locked',
    description: 'Not yet requested by your mentor. It will process once your internship details are submitted.',
    Icon: Lock,
  },
  PendingApproval: {
    tone: 'warning',
    title: 'Pending Admin Approval',
    description: 'Your ID Card has been generated and is currently awaiting final approval from the administration.',
    Icon: Clock,
  },
  Approved: {
    tone: 'success',
    title: 'Approved - Ready to Download',
    description: 'Your ID Card has been approved by the administration. You can download it now.',
    Icon: ShieldCheck,
  },
  Issued: {
    tone: 'success',
    title: 'ID Card Successfully Issued!',
    description: 'Congratulations! Your official digital ID card is ready for download.',
    Icon: ShieldCheck,
  },
  Rejected: {
    tone: 'error',
    title: 'ID Card Request Rejected',
    description: 'Your ID Card request was rejected. Please contact your coordinator or support for details.',
    Icon: XCircle,
  },
};

const DOWNLOADABLE_STATUSES: ReadonlySet<IdCardStatusKey> = new Set(['Approved', 'Issued']);

export function IdCardScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const [downloading, setDownloading] = useState(false);
  
  // Ref for ViewShot capture
  const cardShotRef = useRef<any>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['idcards', 'mine'],
    queryFn: idCardsApi.getMine,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  // Exact UI capture download handler
  const handleDownload = async () => {
    if (!cardShotRef.current?.capture) {
      Toast.show({ type: 'error', text1: 'ID Card preview not ready' });
      return;
    }
    setDownloading(true);
    try {
      const uri = await cardShotRef.current.capture();
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Save or share ID Card',
        });
      } else {
        Toast.show({ type: 'error', text1: 'Sharing is not available on this device' });
      }
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not save ID card', text2: error?.message });
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading || !data) {
    return (
      <Screen>
        <Text variant="body" tone="muted">
          Loading...
        </Text>
      </Screen>
    );
  }

  const config = STATUS_CONFIG[data.status];
  const IconComponent = config.Icon;
  const canDownload = DOWNLOADABLE_STATUSES.has(data.status);

  return (
    <Screen scroll>
      {/* Live Preview Card */}
      {data.status !== 'Draft' ? (
        <IdCardPreview
          ref={cardShotRef}
          fullName={data.internFullName ?? ''}
          designation={data.designation ?? ''}
          email={data.email}
          departmentName={data.departmentName}
          cardNumber={data.cardNumber}
          emergencyContactPhone={data.emergencyContactPhone}
          photoFileId={data.photoFileId}
        />
      ) : null}

      {/* Main Status Banner Card */}
      <View style={[s.card, s[`card_${config.tone}`]]}>
        <View style={[s.iconWrapper, s[`iconWrapper_${config.tone}`]]}>
          <IconComponent size={32} color={getIconColor(config.tone, theme)} />
        </View>

        <Text variant="h3" style={s.cardTitle}>
          {config.title}
        </Text>

        <Text variant="caption" tone="muted" style={s.cardDescription}>
          {config.description}
        </Text>

        {/* Dynamic Badges & Meta Info */}
        {(data.cardNumber || data.validUntil) && (
          <View style={s.metaContainer}>
            {data.cardNumber ? (
              <View style={s.metaRow}>
                <Text variant="caption" tone="muted">
                  Card No:
                </Text>
                <Text variant="caption" style={s.metaValue}>
                  {data.cardNumber}
                </Text>
              </View>
            ) : null}

            {data.validUntil ? (
              <View style={s.metaRow}>
                <Text variant="caption" tone="muted">
                  Valid Until:
                </Text>
                <Text variant="caption" style={s.metaValue}>
                  {new Date(data.validUntil).toLocaleDateString()}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Action Button */}
        {canDownload ? (
          <Button
            label="Download ID Card"
            onPress={handleDownload}
            loading={downloading}
            fullWidth
            style={s.downloadButton}
          />
        ) : null}
      </View>
    </Screen>
  );
}

function getIconColor(tone: 'success' | 'warning' | 'error' | 'muted', theme: AppTheme) {
  switch (tone) {
    case 'success':
      return theme.colors.success;
    case 'warning':
      return theme.colors.warning;
    case 'error':
      return theme.colors.error;
    default:
      return theme.colors.textMuted;
  }
}

const makeStyles = (t: AppTheme) => ({
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1.5,
    padding: t.spacing.xl,
    alignItems: 'center' as const,
    marginTop: t.spacing.md,
  },
  card_success: {
    borderColor: t.colors.success,
    backgroundColor: t.colors.successBg,
  },
  card_warning: {
    borderColor: t.colors.warning,
    backgroundColor: t.colors.warningBg,
  },
  card_error: {
    borderColor: t.colors.error,
    backgroundColor: t.colors.errorBg,
  },
  card_muted: {
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },

  iconWrapper: {
    padding: t.spacing.md,
    borderRadius: 50,
    marginBottom: t.spacing.md,
  },
  iconWrapper_success: { backgroundColor: 'rgba(34, 197, 94, 0.15)' },
  iconWrapper_warning: { backgroundColor: 'rgba(234, 179, 8, 0.15)' },
  iconWrapper_error: { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
  iconWrapper_muted: { backgroundColor: t.colors.surfaceSunken },

  cardTitle: {
    textAlign: 'center' as const,
    marginBottom: t.spacing.xs,
  },
  cardDescription: {
    textAlign: 'center' as const,
    lineHeight: 18,
    marginBottom: t.spacing.md,
  },

  metaContainer: {
    width: '100%' as const,
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.md,
    padding: t.spacing.md,
    gap: t.spacing.xs,
    marginTop: t.spacing.xs,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  metaRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  metaValue: {
    fontWeight: '600' as const,
  },

  downloadButton: {
    marginTop: t.spacing.lg,
  },
});