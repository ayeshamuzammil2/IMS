import React, { useCallback, useRef, useState } from 'react';
import { View, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { IdCard as IdCardIcon, Clock, XCircle, Lock, ShieldCheck, AlertCircle } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Button } from '../../components/primitives/Button';
import { idCardsApi, type IdCardStatusKey } from '../../api/resources/idcards.api';
import { IdCardPreview } from '../../components/media/IdCardPreview';
import { buildIdCardA4Pdf } from '../../lib/idCardPdf';
import { openFileDirect } from '../../lib/downloadAndShare';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';

type Tone = 'success' | 'warning' | 'error' | 'muted';

const STATUS_CONFIG: Record<
  IdCardStatusKey,
  {
    tone: Tone;
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

const stateTone: Record<Tone, 'success' | 'warning' | 'error'> = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  muted: 'warning',
};

export function IdCardScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const [downloading, setDownloading] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const cardShotRef = useRef<any>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['idcards', 'mine'],
    queryFn: idCardsApi.getMine,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
      setDownloading(false);
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ y: 0, animated: false });
      }
    }, [refetch]),
  );

  const handleDownload = async () => {
    if (!cardShotRef.current?.capture) {
      Toast.show({ type: 'error', text1: 'ID Card preview not ready' });
      return;
    }
    setDownloading(true);
    try {
      const cardImageUri = await cardShotRef.current.capture();
      const pdfUri = await buildIdCardA4Pdf(cardImageUri);
      await openFileDirect(pdfUri, 'application/pdf');
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not download ID card', text2: error?.message });
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading || !data) {
    return (
      <Screen scroll={false}>
        <View style={s.centerLoading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="caption" style={s.loadingText}>Loading ID Card details...</Text>
        </View>
      </Screen>
    );
  }

  const config = STATUS_CONFIG[data.status];
  const IconComponent = config.Icon;
  const canDownload = DOWNLOADABLE_STATUSES.has(data.status);
  const activeToneColor = config.tone === 'muted' ? theme.colors.textMuted : theme.colors[stateTone[config.tone]];

  return (
    <Screen scroll={false}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={s.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Live Preview Card */}
        {data.status !== 'Draft' ? (
          <View style={s.previewCardWrapper}>
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
          </View>
        ) : null}

        {/* Main Status Header Card (Compact Sleek Sizing) */}
        <View style={[s.statusCard, { borderColor: activeToneColor }]}>
          <View style={[s.iconBadge, { backgroundColor: `${activeToneColor}15` }]}>
            <IconComponent size={22} color={activeToneColor} />
          </View>
          
          <Text variant="h2" style={s.statusTitleText}>
            {config.title}
          </Text>
          
          <Text variant="caption" style={s.statusDescText}>
            {config.description}
          </Text>
        </View>

        {/* Meta Card with Clean Row-Based Alignment */}
        {(data.cardNumber || data.validUntil) && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <IdCardIcon size={16} color={theme.colors.primary} />
              <Text variant="overline" style={s.cardTitle}>
                CARD DETAILS
              </Text>
            </View>

            <View style={s.detailsGroup}>
              {data.cardNumber ? (
                <View style={s.detailRow}>
                  <Text variant="caption" style={s.detailLabel}>Card No</Text>
                  <Text variant="body" style={s.detailValue}>{data.cardNumber}</Text>
                </View>
              ) : null}

              {data.cardNumber && data.validUntil ? <View style={s.rowDivider} /> : null}

              {data.validUntil ? (
                <View style={s.detailRow}>
                  <Text variant="caption" style={s.detailLabel}>Valid Until</Text>
                  <Text variant="body" style={s.detailValue}>
                    {new Date(data.validUntil).toLocaleDateString()}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* Actions Group */}
        <View style={s.actionsGroup}>
          <Button
            label={downloading ? 'Downloading...' : 'Download ID Card (PDF)'}
            onPress={handleDownload}
            disabled={!canDownload || downloading}
            loading={downloading}
            fullWidth
            style={s.actionButton}
          />
          
          {!canDownload ? (
            <View style={s.reasonBox}>
              <AlertCircle size={14} color={theme.colors.textSecondary} />
              <Text variant="caption" style={s.reasonText}>
                Download unlocks after admin approval
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (t: AppTheme) => ({
  container: {
    paddingHorizontal: 3,
    paddingTop:1,
    paddingBottom: t.spacing.xl,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: t.spacing.sm,
  },
  loadingText: {
    color: t.colors.textSecondary,
  },
  previewCardWrapper: {
    marginBottom: t.spacing.md,
  },
  
  statusCard: {
    alignItems: 'center' as const,
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    paddingVertical: t.spacing.sm, 
    paddingHorizontal: t.spacing.sm,
    marginBottom: t.spacing.sm,
    shadowColor: t.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  iconBadge: {
    width: 44, 
    height: 44,
    borderRadius: 22,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 4,
  },
  statusTitleText: {
    fontSize: 16, 
    fontWeight: '800' as const,
    color: t.colors.textPrimary,
    textAlign: 'center' as const,
    marginTop: 2,
    marginBottom: 2,
  },
  statusDescText: {
    color: t.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center' as const,
    paddingHorizontal: t.spacing.xs,
  },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    marginBottom: t.spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: t.spacing.md,
  },
  cardTitle: {
    color: t.colors.textSecondary,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    fontSize: 11,
  },
  detailsGroup: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 4,
  },
  rowDivider: {
    height: 1,
    backgroundColor: t.colors.border,
    marginVertical: 4,
  },
  detailLabel: {
    color: t.colors.textSecondary,
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: t.colors.textPrimary,
  },
  actionsGroup: {
    gap: t.spacing.xs,
  },
  actionButton: {
    marginTop: t.spacing.xs,
  },
  reasonBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    marginTop: t.spacing.xs,
  },
  reasonText: {
    textAlign: 'center' as const,
    color: t.colors.textSecondary,
    fontSize: 11.5,
  },
});