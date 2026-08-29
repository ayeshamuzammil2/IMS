import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { CheckCircle2, Clock, XCircle, RefreshCw, GitBranch, AlertCircle, ExternalLink } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Input } from '../../components/primitives/Input';
import { Button } from '../../components/primitives/Button';
import { githubApi, type GithubStatusDto } from '../../api/resources/github.api';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';

const STATUS_CONFIG: Record<
  string,
  {
    tone: 'success' | 'warning' | 'error' | 'muted';
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

export function GithubRepoScreen() {
  const theme = useTheme();
  const s = useThemedStyles(makeStyles);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['github', 'status'],
    queryFn: githubApi.getStatus,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const statusKey = data?.status ?? 'NotSubmitted';
  const config = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.NotSubmitted;
  const IconComponent = config.Icon;

  return (
    <Screen scroll>
      {isLoading || !data ? (
        <Text variant="body" tone="muted">
          Loading...
        </Text>
      ) : (
        <>
          {/* Enhanced Status Banner */}
          <View style={[s.bannerCard, s[`banner_${config.tone}`]]}>
            <View style={[s.iconWrapper, s[`iconWrapper_${config.tone}`]]}>
              <IconComponent size={26} color={getIconColor(config.tone, theme)} />
            </View>
            <View style={s.bannerTextContainer}>
              <Text variant="bodyStrong" style={[s.bannerTitle, { color: getIconColor(config.tone, theme) }]}>
                {config.title}
              </Text>
              <Text variant="caption" tone="secondary" style={s.bannerDescription}>
                {config.description}
              </Text>
            </View>
          </View>

          {/* Rejection / Mentor Remarks Card */}
          {data.rejectionReason ? (
            <View style={s.remarksCard}>
              <View style={s.remarksHeader}>
                <AlertCircle size={18} color={theme.colors.error} />
                <Text variant="bodyStrong" tone="error">
                  Mentor Remarks
                </Text>
              </View>
              <Text variant="caption" tone="error" style={s.remarksText}>
                {data.rejectionReason}
              </Text>
            </View>
          ) : null}

          {/* Repository Submission Form Card */}
          <RepoForm
            initial={data}
            onSubmitted={() => queryClient.invalidateQueries({ queryKey: ['github', 'status'] })}
          />
        </>
      )}
    </Screen>
  );
}

function RepoForm({ initial, onSubmitted }: { initial: GithubStatusDto; onSubmitted: () => void }) {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const [url, setUrl] = useState(initial.repositoryUrl ?? '');
  const [submitting, setSubmitting] = useState(false);

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
    <View style={s.formCard}>
      <View style={s.formHeader}>
        <Text variant="bodyStrong">Project Repository</Text>
        <Text variant="caption" tone="muted">
          Provide the full URL of your GitHub repository.
        </Text>
      </View>

      <Input
        label="GitHub Repository URL"
        placeholder="https://github.com/username/repo"
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        keyboardType="url"
        editable={!isApproved}
      />

      <Button
        label={initial.repositoryUrl ? 'Update Repository' : 'Submit Repository'}
        onPress={handleSubmit}
        loading={submitting}
        disabled={!url.trim() || isApproved}
        variant={initial.status === 'Rejected' ? 'danger' : 'primary'}
        fullWidth
        style={s.submitButton}
      />
    </View>
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
  // Banner Styling
  bannerCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: t.radii.lg,
    borderWidth: 1.5,
    padding: t.spacing.md,
    marginBottom: t.spacing.md,
    gap: t.spacing.md,
  },
  banner_success: {
    borderColor: t.colors.success,
    backgroundColor: t.colors.successBg,
  },
  banner_warning: {
    borderColor: t.colors.warning,
    backgroundColor: t.colors.warningBg,
  },
  banner_error: {
    borderColor: t.colors.error,
    backgroundColor: t.colors.errorBg,
  },
  banner_muted: {
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },

  iconWrapper: {
    padding: 8,
    borderRadius: 50,
  },
  iconWrapper_success: { backgroundColor: 'rgba(34, 197, 94, 0.15)' },
  iconWrapper_warning: { backgroundColor: 'rgba(234, 179, 8, 0.15)' },
  iconWrapper_error: { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
  iconWrapper_muted: { backgroundColor: t.colors.surfaceSunken },

  bannerTextContainer: {
    flex: 1,
    gap: 2,
  },
  bannerTitle: {
    fontSize: 15,
  },
  bannerDescription: {
    lineHeight: 18,
  },

  // Remarks Section
  remarksCard: {
    backgroundColor: t.colors.errorBg,
    borderRadius: t.radii.md,
    borderWidth: 1,
    borderColor: t.colors.error,
    padding: t.spacing.md,
    marginBottom: t.spacing.md,
    gap: t.spacing.xs,
  },
  remarksHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.xs,
  },
  remarksText: {
    lineHeight: 18,
  },

  // Form Card
  formCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    gap: t.spacing.md,
  },
  formHeader: {
    gap: 2,
  },
  submitButton: {
    marginTop: t.spacing.xs,
  },
});