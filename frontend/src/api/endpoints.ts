// Every API path lives here - no URL literal is allowed outside this file. This is the guard
// against v1's regression where http://localhost:5000 was hardcoded in three separate screens
// and silently broke on Android emulator and every real device.
export const endpoints = {
  auth: {
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    logoutAll: '/auth/logout-all',
    changePassword: '/auth/change-password',
    me: '/auth/me',
    forgotPassword: '/auth/forgot-password',
  },
  files: {
    meta: (fileId: string) => `/files/${fileId}/meta`,
  },
  departments: {
    list: '/departments',
    lookup: '/departments/lookup',
    byId: (id: number) => `/departments/${id}`,
    deactivate: (id: number) => `/departments/${id}/deactivate`,
    reactivate: (id: number) => `/departments/${id}/reactivate`,
  },
  mentors: {
    list: '/mentors',
    byId: (id: number) => `/mentors/${id}`,
    deactivate: (id: number) => `/mentors/${id}/deactivate`,
    reactivate: (id: number) => `/mentors/${id}/reactivate`,
    resetPassword: (id: number) => `/mentors/${id}/reset-password`,
    transfer: (id: number) => `/mentors/${id}/transfer`,
  },
  interns: {
    list: '/interns',
    byId: (id: number) => `/interns/${id}`,
    deactivate: (id: number) => `/interns/${id}/deactivate`,
    reactivate: (id: number) => `/interns/${id}/reactivate`,
    resetPassword: (id: number) => `/interns/${id}/reset-password`,
    unlock: (id: number) => `/interns/${id}/unlock`,
    unlockFaceEnrollment: (id: number) => `/interns/${id}/unlock-face-enrollment`,
  },
  notifications: {
    list: '/notifications',
    unreadCount: '/notifications/unread-count',
    markRead: (id: number) => `/notifications/${id}/read`,
    markAllRead: '/notifications/read-all',
    pushToken: '/notifications/push-token',
  },
  attendance: {
    today: '/attendance/today',
    sessions: '/attendance/sessions',
    submit: (sessionId: string) => `/attendance/sessions/${sessionId}/submit`,
    teamToday: '/attendance/team-today',
    history: '/attendance/history',
    enrollment: {
      sessions: '/attendance/enrollment/sessions',
      submit: (sessionId: string) => `/attendance/enrollment/sessions/${sessionId}/submit`,
      review: {
        queue: '/attendance/enrollment/review/queue',
        detail: (internProfileId: number) => `/attendance/enrollment/review/${internProfileId}`,
        decide: (internProfileId: number) => `/attendance/enrollment/review/${internProfileId}/decide`,
      },
    },
    review: {
      queue: '/attendance/review/queue',
      decide: (attendanceDayId: number) => `/attendance/review/${attendanceDayId}/decide`,
      requestOverride: (internProfileId: number) => `/attendance/review/overrides/${internProfileId}`,
      pendingOverrides: '/attendance/review/overrides/pending',
      decideOverride: (overrideId: number) => `/attendance/review/overrides/${overrideId}/decide`,
    },
  },
  documents: {
    dashboard: '/documents/dashboard',
    upload: '/documents',
    extraLink: '/documents/extra-link',
    selfDetails: '/documents/self-details',
    review: {
      queue: '/documents/review/queue',
      decide: (documentId: number) => `/documents/review/${documentId}/decide`,
    },
  },
  chat: {
    contacts: '/chat/contacts',
    messages: (otherUserId: number) => `/chat/${otherUserId}/messages`,
  },
  github: {
    status: '/github/status',
    submit: '/github',
    review: {
      queue: '/github/review/queue',
      decide: (submissionId: number) => `/github/review/${submissionId}/decide`,
    },
  },
  projects: {
    mine: '/projects/mine',
    forIntern: (internProfileId: number) => `/projects/intern/${internProfileId}`,
    assign: (internProfileId: number) => `/projects/intern/${internProfileId}`,
    update: (assignmentId: number) => `/projects/intern/assignment/${assignmentId}`,
    delete: (assignmentId: number) => `/projects/intern/assignment/${assignmentId}`,
  },
  certificates: {
    mine: '/certificates/mine',
    list: '/certificates',
    templates: {
      list: '/certificates/templates',
      upload: '/certificates/templates',
      preview: (templateId: number) => `/certificates/templates/${templateId}/preview`,
    },
    forIntern: (internProfileId: number) => `/certificates/intern/${internProfileId}`,
    generate: (internProfileId: number) => `/certificates/intern/${internProfileId}/generate`,
    approve: (internProfileId: number) => `/certificates/intern/${internProfileId}/approve`,
    issue: (internProfileId: number) => `/certificates/intern/${internProfileId}/issue`,
  },
  dashboard: {
    summary: '/dashboard/summary',
  },
  adminJobs: {
    run: (name: string) => `/admin/jobs/${name}/run`,
  },
  idcards: {
    mine: '/idcards/mine',
    list: '/idcards',
    forIntern: (internProfileId: number) => `/idcards/intern/${internProfileId}`,
    submit: (internProfileId: number) => `/idcards/intern/${internProfileId}/submit`,
    approve: (internProfileId: number) => `/idcards/intern/${internProfileId}/approve`,
    issue: (internProfileId: number) => `/idcards/intern/${internProfileId}/issue`,
  },
};