import React, { useCallback, useRef, useState } from 'react';
import { View, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { CheckCircle2, Clock, XCircle, RefreshCw, GitBranch, AlertCircle } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Input } from '../../components/primitives/Input';
import { Button } from '../../components/primitives/Button';
import { githubApi, type GithubStatusDto } from '../../api/resources/github.api';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';

type Tone = 'success' | 'warning' | 'error' | 'muted';

const STATUS_CONFIG: Record<
  string,
  {
    tone: Tone;
    title: string;
    description: string;
    Icon: typeof CheckCircle2;
  }
> = {
  NotSubmitted: {
    tone: 'muted',
    title: 'Repository Not Submitted',
    description: 'Please paste your public GitHub repository link below for project review.',
    Icon: GitBranch,
  },
  Pending: {
    tone: 'warning',
    title: 'Review Pending',
    description: 'Your repository has been submitted and is currently under review by your mentor.',
    Icon: Clock,
  },
  Approved: {
    tone: 'success',
    title: 'Repository Approved!',
    description: 'Great job! Your GitHub repository has been verified and accepted.',
    Icon: CheckCircle2,
  },
  Rejected: {
    tone: 'error',
    title: 'Submission Rejected',
    description: 'Your repository submission was rejected. Please review feedback and submit an updated link.',
    Icon: XCircle,
  },
  ResubmitRequested: {
    tone: 'warning',
    title: 'Resubmission Requested',
    description: 'Your mentor requested changes or a new repository link.',
    Icon: RefreshCw,
  },
};

const stateTone: Record<Tone, 'success' | 'warning' | 'error'> = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  muted: 'warning',
};

export function GithubRepoScreen() {
  const theme = useTheme();
  const s = useThemedStyles(makeStyles);
  const queryClient = useQueryClient();

  const scrollRef = useRef<ScrollView>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['github', 'status'],
    queryFn: githubApi.getStatus,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ y: 0, animated: false });
      }
    }, [refetch]),
  );

  if (isLoading || !data) {
    return (
      <Screen scroll={false}>
        <View style={s.centerLoading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="caption" style={s.loadingText}>Loading Repository details...</Text>
        </View>
      </Screen>
    );
  }

  const statusKey = data?.status ?? 'NotSubmitted';
  const config = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.NotSubmitted;
  const IconComponent = config.Icon;
  const activeToneColor = config.tone === 'muted' ? theme.colors.textMuted : theme.colors[stateTone[config.tone]];

  return (
    <Screen scroll={false}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={s.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Status Header Card (Compact Sizing) */}
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

        {/* Mentor Remarks Card */}
        {data.rejectionReason ? (
          <View style={s.remarksCard}>
            <View style={s.remarksHeader}>
              <AlertCircle size={16} color={theme.colors.error} />
              <Text variant="overline" style={s.remarksTitle}>
                MENTOR REMARKS
              </Text>
            </View>
            <Text variant="caption" style={s.remarksText}>
              {data.rejectionReason}
            </Text>
          </View>
        ) : null}

        {/* Form Section Container */}
        <RepoForm
          initial={data}
          onSubmitted={() => queryClient.invalidateQueries({ queryKey: ['github', 'status'] })}
        />
      </ScrollView>
    </Screen>
  );
}

function RepoForm({ initial, onSubmitted }: { initial: GithubStatusDto; onSubmitted: () => void }) {
  const s = useThemedStyles(makeStyles);
  const [url, setUrl] = useState(initial.repositoryUrl ?? '');
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setUrl(initial.repositoryUrl ?? '');
    }, [initial.repositoryUrl])
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await githubApi.submit(url.trim());
      Toast.show({ type: 'success', text1: 'Repository submitted', text2: 'Awaiting review by your mentor.' });
      onSubmitted();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not submit', text2: error?.message });
    } finally {
      setSubmitting(false);
    }
  };

  const isApproved = initial.status === 'Approved';

  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <GitBranch size={16} color={s.cardTitle.color} />
        <Text variant="overline" style={s.cardTitle}>
          PROJECT REPOSITORY
        </Text>
      </View>

      <View style={s.formGroup}>
        <Input
          label="GitHub Repository URL"
          placeholder="https://github.com/username/repo"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          keyboardType="url"
          editable={!isApproved}
        />

        <View style={s.actionsGroup}>
          <Button
            label={initial.repositoryUrl ? 'Update Repository' : 'Submit Repository'}
            onPress={handleSubmit}
            loading={submitting}
            disabled={!url.trim() || isApproved}
            variant={initial.status === 'Rejected' ? 'danger' : 'primary'}
            fullWidth
            style={s.actionButton}
          />

          {isApproved ? (
            <View style={s.reasonBox}>
              <AlertCircle size={14} color={s.reasonText.color} />
              <Text variant="caption" style={s.reasonText}>
                Repository is approved and locked for changes
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const makeStyles = (t: AppTheme) => ({
  container: {
    paddingHorizontal: 3,
    paddingTop: 1,
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
  statusCard: {
    alignItems: 'center' as const,
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1.5,
    paddingVertical: t.spacing.sm,
    paddingHorizontal: 3,
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
  remarksCard: {
    backgroundColor: t.colors.errorBg,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.error,
    padding: t.spacing.md,
    marginBottom: t.spacing.md,
  },
  remarksHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 4,
  },
  remarksTitle: {
    color: t.colors.error,
    fontWeight: '700' as const,
    fontSize: 11,
  },
  remarksText: {
    color: t.colors.error,
    fontSize: 12.5,
    lineHeight: 18,
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
  formGroup: {
    gap: t.spacing.md,
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