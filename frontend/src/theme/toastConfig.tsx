import React from 'react';
import { BaseToast, ErrorToast, type ToastConfigParams } from 'react-native-toast-message';

/**
 * The library's default BaseToast/ErrorToast cap text2 at numberOfLines=1, silently truncating
 * any message longer than one line - the actual cause of "clipped" toasts reported in the spec.
 * This config removes that cap and lets the toast grow to fit its content instead of a fixed height.
 */
const sharedProps = {
  text1NumberOfLines: 0,
  text2NumberOfLines: 0,
  style: { borderLeftWidth: 6, height: undefined, minHeight: 60, paddingVertical: 10 },
  contentContainerStyle: { paddingHorizontal: 15 },
  text1Style: { fontSize: 15, fontWeight: '600' as const },
  text2Style: { fontSize: 13, lineHeight: 18 },
};

export const toastConfig = {
  success: (props: ToastConfigParams<unknown>) => <BaseToast {...props} {...sharedProps} />,
  info: (props: ToastConfigParams<unknown>) => <BaseToast {...props} {...sharedProps} />,
  error: (props: ToastConfigParams<unknown>) => <ErrorToast {...props} {...sharedProps} />,
};
