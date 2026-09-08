import React, { useRef } from 'react';
import { Animated, PanResponder } from 'react-native';
import Toast, { BaseToast, ErrorToast, type ToastConfigParams } from 'react-native-toast-message';

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

/** Distance (px) the toast must travel to the right, or speed it must be flicked at, before it
 * counts as a deliberate "dismiss" swipe rather than an accidental brush. */
const DISMISS_DISTANCE = 80;
const DISMISS_VELOCITY = 0.5;

/**
 * Wraps a toast body so the person can dismiss it early by swiping it to the right, instead of
 * waiting out the auto-hide timer. Only responds to gestures that are clearly horizontal (and
 * clearly rightward) so it doesn't fight with the library's own vertical swipe-to-dismiss.
 */
function withSwipeToDismiss(Component: React.ComponentType<any>) {
  return function SwipeableToast(props: ToastConfigParams<unknown> & Record<string, unknown>) {
    const translateX = useRef(new Animated.Value(0)).current;

    const panResponder = useRef(
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
        onPanResponderMove: (_evt, gesture) => {
          if (gesture.dx > 0) translateX.setValue(gesture.dx);
        },
        onPanResponderRelease: (_evt, gesture) => {
          const shouldDismiss = gesture.dx > DISMISS_DISTANCE || gesture.vx > DISMISS_VELOCITY;
          if (shouldDismiss) {
            Animated.timing(translateX, {
              toValue: 500,
              duration: 150,
              useNativeDriver: true,
            }).start(() => Toast.hide());
          } else {
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              speed: 20,
              bounciness: 6,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
        },
      }),
    ).current;

    return (
      <Animated.View {...panResponder.panHandlers} style={{ transform: [{ translateX }] }}>
        <Component {...props} />
      </Animated.View>
    );
  };
}

const SwipeableBaseToast = withSwipeToDismiss(BaseToast);
const SwipeableErrorToast = withSwipeToDismiss(ErrorToast);

export const toastConfig = {
  success: (props: ToastConfigParams<unknown>) => <SwipeableBaseToast {...props} {...sharedProps} />,
  info: (props: ToastConfigParams<unknown>) => <SwipeableBaseToast {...props} {...sharedProps} />,
  error: (props: ToastConfigParams<unknown>) => <SwipeableErrorToast {...props} {...sharedProps} />,
};
