import { client } from '../client';
import { endpoints } from '../endpoints';
import type { ChallengeFrameTelemetry, ChallengeSpec } from '../../lib/challenge';

export interface AttendanceTodayResponse {
  workDatePk: string;
  departmentName: string;
  departmentLatitude: number;
  departmentLongitude: number;
  geofenceRadiusMeters: number;
  arrivalMarked: boolean;
  arrivalAtUtc: string | null;
  arrivalIsLate: boolean;
  departureMarked: boolean;
  departureAtUtc: string | null;
  departureIsEarly: boolean;
  status: string;
  arrivalBlockers: string[];
  departureBlockers: string[];
  distanceMeters: number | null;
  geofenceState: string | null;
}

export type AttendanceEventType = 'Arrival' | 'Departure';

export interface CreateAttendanceSessionRequest {
  eventType: AttendanceEventType;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  deviceId: string;
  mocked?: boolean | null;
}

export interface AttendanceSessionResponse {
  sessionId: string;
  nonce: string;
  expiresAtUtc: string;
  challenge: ChallengeSpec;
}

export interface SubmitAttendanceResult {
  outcome: string;
  markedAtUtc: string | null;
  isLate: boolean;
  isEarlyLeave: boolean;
  distanceMeters: number;
  geofenceState: string;
  requiresReview: boolean;
  riskScore: number;
  flags: string[];
  message: string;
}

export interface CapturedFrame {
  uri: string;
  telemetry: ChallengeFrameTelemetry;
}

export interface SubmitAttendanceParams {
  frames: CapturedFrame[];
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  deviceId: string;
  mocked?: boolean | null;
  deviceModel?: string | null;
  appVersion?: string | null;
}

export interface AttendanceHistoryRowDto {
  internProfileId: number;
  internFullName: string;
  internCode: string;
  departmentName: string;
  workDate: string;
  status: string;
  arrivalAtUtc: string | null;
  arrivalIsLate: boolean;
  arrivalSource: string | null;
  departureAtUtc: string | null;
  departureIsEarly: boolean;
  departureSource: string | null;
}

export interface TeamAttendanceRowDto {
  internProfileId: number;
  internFullName: string;
  internCode: string;
  arrivalSelfieFileId: string | null;
  arrivalAtUtc: string | null;
  arrivalDistanceM: number | null;
  arrivalAccuracyM: number | null;
  arrivalIsLate: boolean;
  arrivalGeofenceState: string | null;
  departureSelfieFileId: string | null;
  departureAtUtc: string | null;
  departureDistanceM: number | null;
  departureAccuracyM: number | null;
  departureIsEarly: boolean;
  departureGeofenceState: string | null;
  status: string;
}

function buildFramesForm(frames: CapturedFrame[]): FormData {
  const form = new FormData();
  frames.forEach((f, i) => {
    form.append('Frames', { uri: f.uri, name: `frame_${i}.jpg`, type: 'image/jpeg' } as unknown as Blob);
  });
  form.append('TelemetryJson', JSON.stringify(frames.map((f) => f.telemetry)));
  return form;
}

export const attendanceApi = {
  today: (latitude?: number, longitude?: number, accuracyMeters?: number) =>
    client
      .get<AttendanceTodayResponse>(endpoints.attendance.today, { params: { latitude, longitude, accuracyMeters } })
      .then((r) => r.data),

  createSession: (body: CreateAttendanceSessionRequest) =>
    client.post<AttendanceSessionResponse>(endpoints.attendance.sessions, body).then((r) => r.data),

  submit: (sessionId: string, params: SubmitAttendanceParams) => {
    const form = buildFramesForm(params.frames);
    form.append('Latitude', String(params.latitude));
    form.append('Longitude', String(params.longitude));
    form.append('AccuracyMeters', String(params.accuracyMeters));
    form.append('DeviceId', params.deviceId);
    if (params.mocked !== undefined && params.mocked !== null) form.append('Mocked', String(params.mocked));
    if (params.deviceModel) form.append('DeviceModel', params.deviceModel);
    if (params.appVersion) form.append('AppVersion', params.appVersion);

    return client
      .post<SubmitAttendanceResult>(endpoints.attendance.submit(sessionId), form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  teamToday: (departmentId?: number, mentorId?: number) =>
    client
      .get<TeamAttendanceRowDto[]>(endpoints.attendance.teamToday, { params: { departmentId, mentorId } })
      .then((r) => r.data),

  history: (startDate: string, endDate: string, departmentId?: number, mentorId?: number) =>
    client
      .get<AttendanceHistoryRowDto[]>(endpoints.attendance.history, { params: { startDate, endDate, departmentId, mentorId } })
      .then((r) => r.data),
};

export interface EnrollmentSessionResponse {
  sessionId: string;
  expiresAtUtc: string;
  challenge: ChallengeSpec;
}

export interface EnrollmentResult {
  success: boolean;
  status: string;
  message: string | null;
  templateVersion: number | null;
}

export const enrollmentApi = {
  createSession: (deviceId: string) =>
    client.post<EnrollmentSessionResponse>(endpoints.attendance.enrollment.sessions, { deviceId }).then((r) => r.data),

  submit: (sessionId: string, frames: CapturedFrame[], deviceId: string, consentAcknowledged: boolean) => {
    const form = buildFramesForm(frames);
    form.append('DeviceId', deviceId);
    form.append('ConsentAcknowledged', String(consentAcknowledged));

    return client
      .post<EnrollmentResult>(endpoints.attendance.enrollment.submit(sessionId), form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};

export interface ReviewQueueItemDto {
  attendanceDayId: number;
  internProfileId: number;
  internFullName: string;
  internCode: string;
  workDate: string;
  arrivalSelfieFileId: string | null;
  arrivalAtUtc: string | null;
  departureSelfieFileId: string | null;
  departureAtUtc: string | null;
  distanceM: number | null;
  geofenceState: string | null;
  flags: string[];
  attendanceReady: boolean;
}

export interface AttendanceOverrideDto {
  id: number;
  internProfileId: number;
  internFullName: string;
  eventType: AttendanceEventType;
  reasonCode: string;
  justification: string;
  decision: string | null;
  quotaExceeded: boolean;
  requestedAtUtc: string;
  markedAtUtc: string;
}

export interface RequestOverrideParams {
  eventType: AttendanceEventType;
  reasonCode: string;
  justification: string;
  workDate: string;
  markedAtLocalTime: string;
}

export const attendanceReviewApi = {
  getQueue: () => client.get<ReviewQueueItemDto[]>(endpoints.attendance.review.queue).then((r) => r.data),

  decide: (attendanceDayId: number, approve: boolean, note?: string) =>
    client.post(endpoints.attendance.review.decide(attendanceDayId), { approve, note }),

  requestOverride: (internProfileId: number, params: RequestOverrideParams) =>
    client.post<AttendanceOverrideDto>(endpoints.attendance.review.requestOverride(internProfileId), params).then((r) => r.data),

  getPendingOverrides: () => client.get<AttendanceOverrideDto[]>(endpoints.attendance.review.pendingOverrides).then((r) => r.data),

  decideOverride: (overrideId: number, approve: boolean, note?: string) =>
    client.post(endpoints.attendance.review.decideOverride(overrideId), { approve, note }),
};
