import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { CheckCircle2, Clock, XCircle, RefreshCw } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Input } from '../../components/primitives/Input';
import { Button } from '../../components/primitives/Button';
import { githubApi, type GithubStatusDto } from '../../api/resources/github.api';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';

const STATUS_CONFIG: Record<string, { tone: 'success' | 'warning' | 'error' | 'muted'; label: string; Icon: typeof CheckCircle2 }> = {
  NotSubmitted: { tone: 'muted', label: 'Not submitted yet', Icon: RefreshCw },
  Pending: { tone: 'warning', label: 'Pending review', Icon: Clock },
  Approved: { tone: 'success', label: 'Approved', Icon: CheckCircle2 },
  Rejected: { tone: 'error', label: 'Rejected', Icon: XCircle },
  ResubmitRequested: { tone: 'warning', label: 'Resubmission requested', Icon: RefreshCw },
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

  const config = STATUS_CONFIG[data?.status ?? 'NotSubmitted'];

  return (
    <Screen scroll>
      {isLoading || !data ? (
        <Text variant="body" tone="muted">
          Loading...
        </Text>
      ) : (
        <>
          <View style={[s.statusBanner, { backgroundColor: theme.colors.surfaceSunken }]}>
            <config.Icon size={18} color={theme.colors[config.tone === 'muted' ? 'textMuted' : config.tone]} />
            <Text variant="bodyStrong" tone={config.tone} style={s.statusText}>
              {config.label}
            </Text>
          </View>

          {data.rejectionReason ? (
            <Text variant="body" tone="error" style={s.reasonText}>
              {data.rejectionReason}
            </Text>
          ) : null}

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

  return (
    <View style={s.card}>
      <Input
        label="GitHub Repository URL"
        placeholder="https://github.com/owner/repo"
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        keyboardType="url"
      />
      <Button label="Submit" onPress={handleSubmit} loading={submitting} disabled={!url.trim()} fullWidth />
    </View>
  );
}

const makeStyles = (t: AppTheme) => ({
  statusBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.sm,
    borderRadius: t.radii.md,
    padding: t.spacing.md,
    marginBottom: t.spacing.md,
  },
  statusText: { flex: 1 },
  reasonText: { marginBottom: t.spacing.md },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    gap: t.spacing.md,
  },
});
