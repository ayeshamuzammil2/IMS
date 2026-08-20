export type ChallengeActionType = 'HoldStill' | 'TurnLeft' | 'TurnRight' | 'Blink' | 'Smile' | 'NodUp' | 'NodDown';

export interface ChallengeStep {
  action: ChallengeActionType;
  holdMs: number;
}

export interface ChallengeSpec {
  steps: ChallengeStep[];
}

export interface LandmarkPoint {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Mirrors the backend's ChallengeFrameTelemetryDto - camelCase JSON, matched server-side via
 * PropertyNameCaseInsensitive rather than requiring exact PascalCase. */
export interface ChallengeFrameTelemetry {
  index: number;
  timestampMs: number;
  action: string;
  yaw: number | null;
  pitch: number | null;
  roll: number | null;
  leftEyeOpenProbability: number | null;
  rightEyeOpenProbability: number | null;
  smileProbability: number | null;
  boundingBox: BoundingBox | null;
  landmarks: Record<string, LandmarkPoint> | null;
  activeLightQuadrant: string | null;
}

/** Cheap, client-side "was this action satisfied" check - purely for UX pacing (when to advance
 * to the next step / capture a frame). The server never trusts this; it re-derives everything
 * from the same raw telemetry independently. */
export function isActionSatisfied(
  action: ChallengeActionType,
  pose: { yaw: number | null; pitch: number | null; leftEyeOpen: number | null; rightEyeOpen: number | null; smiling: number | null },
): boolean {
  switch (action) {
    case 'HoldStill':
      return true;
    case 'TurnLeft':
  return pose.yaw !== null && pose.yaw > 12;
case 'TurnRight':
  return pose.yaw !== null && pose.yaw < -12;
    case 'NodUp':
      return pose.pitch !== null && pose.pitch > 10;
    case 'NodDown':
      return pose.pitch !== null && pose.pitch < -10;
    case 'Blink':
      return pose.leftEyeOpen !== null && pose.rightEyeOpen !== null && pose.leftEyeOpen < 0.3 && pose.rightEyeOpen < 0.3;
    case 'Smile':
      return pose.smiling !== null && pose.smiling > 0.6;
    default:
      return false;
  }
}
