import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, usePhotoOutput, type CameraRef } from 'react-native-vision-camera';
import { useFaceDetectorOutput, type Face } from 'react-native-vision-camera-face-detector';
import { Text } from '../primitives/Text';
import { Button } from '../primitives/Button';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import { isActionSatisfied, type BoundingBox, type ChallengeFrameTelemetry, type ChallengeSpec, type LandmarkPoint } from '../../lib/challenge';
import type { CapturedFrame } from '../../api/resources/attendance.api';
import type { AppTheme } from '../../theme/types';

/**
 * Verified against the installed packages' actual .d.ts files (react-native-vision-camera@5.x's
 * new "outputs" composition API, and react-native-vision-camera-face-detector@2.x's
 * useFaceDetectorOutput) - not the older frame-processor-plugin API from earlier VisionCamera
 * versions. Field names (yawAngle, pitchAngle, bounds, landmarks.LEFT_EAR, etc.) come directly
 * from Face.nitro.d.ts and Landmarks.d.ts. Still worth a quick sanity check on a real device,
 * since this was written without being able to run it - the type-level shapes are confirmed,
 * runtime behavior (detection latency, coordinate scaling) is not.
 */

// Strict per-step liveness timeout. Server's session TTL (90s) bounds the whole challenge, but
// without a per-step limit a static photo held up to the camera would just sit in "not satisfied"
// forever with no penalty. This forces a decision every STEP_TIMEOUT_MS regardless of step holdMs.
const STEP_TIMEOUT_MS = 12000;


interface DetectedPose {
  yaw: number | null;
  pitch: number | null;
  leftEyeOpen: number | null;
  rightEyeOpen: number | null;
  smiling: number | null;
  boundingBox: BoundingBox | null;
  landmarks: Record<string, LandmarkPoint> | null;
}

const emptyPose: DetectedPose = {
  yaw: null, pitch: null, leftEyeOpen: null, rightEyeOpen: null, smiling: null, boundingBox: null, landmarks: null,
};

const LANDMARK_KEYS = [
  ['LEFT_EYE', 'leftEye'], ['RIGHT_EYE', 'rightEye'], ['NOSE_BASE', 'noseBase'],
  ['LEFT_EAR', 'leftEar'], ['RIGHT_EAR', 'rightEar'], ['LEFT_CHEEK', 'leftCheek'], ['RIGHT_CHEEK', 'rightCheek'],
  ['MOUTH_LEFT', 'mouthLeft'], ['MOUTH_RIGHT', 'mouthRight'], ['MOUTH_BOTTOM', 'mouthBottom'],
] as const;

function extractPose(face: Face | null): DetectedPose {
  if (!face) return emptyPose;

  let landmarks: Record<string, LandmarkPoint> | null = null;
  if (face.landmarks) {
    landmarks = {};
    for (const [mlkitKey, ourKey] of LANDMARK_KEYS) {
      const point = face.landmarks[mlkitKey];
      if (point) landmarks[ourKey] = { x: point.x, y: point.y };
    }
  }

  return {
    yaw: face.yawAngle,
    pitch: face.pitchAngle,
    leftEyeOpen: face.leftEyeOpenProbability ?? null,
    rightEyeOpen: face.rightEyeOpenProbability ?? null,
    smiling: face.smilingProbability ?? null,
    boundingBox: face.bounds ? { x: face.bounds.x, y: face.bounds.y, width: face.bounds.width, height: face.bounds.height } : null,
    landmarks,
  };
}

interface Props {
  challenge: ChallengeSpec;
  onComplete: (frames: CapturedFrame[]) => void;
  onCancel: () => void;
  /** Fired when a single step isn't satisfied within STEP_TIMEOUT_MS. The screen is expected to
   * close the modal and let the user retry with a fresh session (a stale challenge shouldn't be
   * resumed - that would let an attacker keep replaying the same frame until it happens to match). */
  onTimeout: () => void;
}

export function ChallengeCaptureView({ challenge, onComplete, onCancel, onTimeout }: Props) {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');
  const cameraRef = useRef<CameraRef>(null);
  const photoOutput = usePhotoOutput({ quality: 0.7 });

  const [stepIndex, setStepIndex] = useState(0);
  const [holding, setHolding] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(STEP_TIMEOUT_MS / 1000));
  const poseRef = useRef<DetectedPose>(emptyPose);
  const satisfiedSinceRef = useRef<number | null>(null);
  const capturingRef = useRef(false);
  const capturedRef = useRef<CapturedFrame[]>([]);
  const stepStartedAtRef = useRef<number>(Date.now());
  const timedOutRef = useRef(false);

  const faceDetectorOutput = useFaceDetectorOutput({
    performanceMode: 'fast',
    runLandmarks: true,
    runClassifications: true,
    onFacesDetected: (faces) => {
      poseRef.current = extractPose(faces[0] ?? null);
    },
    onError: () => {
      poseRef.current = emptyPose;
    },
  });

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  // Reset the per-step clock every time we move to a new step.
  useEffect(() => {
    stepStartedAtRef.current = Date.now();
    setSecondsLeft(Math.ceil(STEP_TIMEOUT_MS / 1000));
  }, [stepIndex]);

  useEffect(() => {
    if (stepIndex >= challenge.steps.length) return undefined;
    const step = challenge.steps[stepIndex];

    const interval = setInterval(async () => {
      if (capturingRef.current || timedOutRef.current) return;

      const elapsedSinceStepStart = Date.now() - stepStartedAtRef.current;
      const remainingMs = STEP_TIMEOUT_MS - elapsedSinceStepStart;
      setSecondsLeft(Math.max(0, Math.ceil(remainingMs / 1000)));

      if (elapsedSinceStepStart >= STEP_TIMEOUT_MS) {
        timedOutRef.current = true;
        onTimeout();
        return;
      }

      const pose = poseRef.current;
      const satisfied = isActionSatisfied(step.action, pose);

      if (!satisfied) {
        satisfiedSinceRef.current = null;
        setHolding(false);
        return;
      }

      if (satisfiedSinceRef.current === null) {
        satisfiedSinceRef.current = Date.now();
      }
      setHolding(true);

      const heldForMs = Date.now() - satisfiedSinceRef.current;
      if (heldForMs < step.holdMs) return;

      capturingRef.current = true;
      try {
        const photoFile = await photoOutput.capturePhotoToFile({ flashMode: 'off' }, {});
        const uri = photoFile.filePath.startsWith('file://') ? photoFile.filePath : `file://${photoFile.filePath}`;

        const telemetry: ChallengeFrameTelemetry = {
          index: stepIndex,
          timestampMs: Date.now(),
          action: step.action,
          yaw: pose.yaw,
          pitch: pose.pitch,
          roll: null,
          leftEyeOpenProbability: pose.leftEyeOpen,
          rightEyeOpenProbability: pose.rightEyeOpen,
          smileProbability: pose.smiling,
          boundingBox: pose.boundingBox,
          landmarks: pose.landmarks,
          activeLightQuadrant: null,
        };

        capturedRef.current = [...capturedRef.current, { uri, telemetry }];

        if (capturedRef.current.length >= challenge.steps.length) {
          onComplete(capturedRef.current);
        } else {
          satisfiedSinceRef.current = null;
          setHolding(false);
          setStepIndex((i) => i + 1);
        }
      } finally {
        capturingRef.current = false;
      }
    }, 150);

    return () => clearInterval(interval);
  }, [stepIndex, challenge.steps, onComplete, onTimeout, photoOutput]);

  if (!hasPermission) {
    return (
      <View style={s.center}>
        <Text variant="body" tone="secondary" style={s.centerText}>
          Camera access is required to mark attendance.
        </Text>
        <Button label="Grant Camera Access" onPress={requestPermission} />
        <Button label="Cancel" variant="ghost" onPress={onCancel} style={s.cancelSpacing} />
      </View>
    );
  }

  if (!device) {
    return (
      <View style={s.center}>
        <Text variant="body" tone="error">
          No front camera was found on this device.
        </Text>
        <Button label="Cancel" variant="ghost" onPress={onCancel} />
      </View>
    );
  }

  const currentStep = challenge.steps[stepIndex];

  return (
    <View style={s.fill}>
      <Camera
        ref={cameraRef}
        style={s.fill}
        device={device}
        isActive={true}
        outputs={[photoOutput, faceDetectorOutput]}
      />
      <View style={s.overlay}>
        <View style={s.progressRow}>
          {challenge.steps.map((_, i) => (
            <View key={i} style={[s.progressDot, i < stepIndex && s.progressDotDone, i === stepIndex && s.progressDotActive]} />
          ))}
        </View>
        <Text variant="h2" tone="inverse" style={s.instruction}>
          {currentStep ? describeAction(currentStep.action) : 'Hold still...'}
        </Text>
        <Text variant="caption" tone="inverse" style={s.timer}>
          {secondsLeft}s
        </Text>
        {holding ? <ActivityIndicator color={theme.colors.textOnDark} /> : null}
        <Button label="Cancel" variant="ghost" onPress={onCancel} style={s.cancelButton} />
      </View>
    </View>
  );
}

function describeAction(action: ChallengeSpec['steps'][number]['action']): string {
  switch (action) {
    case 'TurnLeft':
      return 'Turn your head left';
    case 'TurnRight':
      return 'Turn your head right';
    case 'Blink':
      return 'Blink your eyes';
    case 'Smile':
      return 'Smile';
    case 'NodUp':
      return 'Tilt your head up';
    case 'NodDown':
      return 'Tilt your head down';
    default:
      return 'Hold still';
  }
}

const makeStyles = (t: AppTheme) => ({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, gap: t.spacing.md, padding: t.spacing.lg },
  centerText: { textAlign: 'center' as const },
  cancelSpacing: { marginTop: t.spacing.sm },
  overlay: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    bottom: 0,
    padding: t.spacing.lg,
    alignItems: 'center' as const,
    gap: t.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  progressRow: { flexDirection: 'row' as const, gap: t.spacing.sm },
  progressDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.35)' },
  progressDotActive: { backgroundColor: t.colors.primary },
  progressDotDone: { backgroundColor: t.colors.success },
  instruction: { textAlign: 'center' as const },
  timer: { opacity: 0.85 },
  cancelButton: { marginTop: t.spacing.xs },
});