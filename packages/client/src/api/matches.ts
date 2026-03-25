import http from '../lib/http'

export const matchesApi = {
  list: (page: number, limit: number) =>
    http.get(`/api/matches?page=${page}&limit=${limit}`),

  create: (name: string) =>
    http.post<{ id: string }>('/api/matches', { name }),

  delete: (matchId: string) =>
    http.delete(`/api/matches/${matchId}`),

  getMembership: (matchId: string) =>
    http.get(`/api/matches/${matchId}/membership`),

  getMembers: (matchId: string) =>
    http.get(`/api/matches/${matchId}/members`),

  invite: (matchId: string, email: string) =>
    http.post(`/api/matches/${matchId}/invite`, { email }),

  acceptInvitation: (matchId: string, invitationId: string) =>
    http.post(`/api/matches/${matchId}/invitations/${invitationId}/accept`),

  rejectInvitation: (matchId: string, invitationId: string) =>
    http.post(`/api/matches/${matchId}/invitations/${invitationId}/reject`),

  requestAccess: (matchId: string) =>
    http.post(`/api/matches/${matchId}/requests`),

  approveRequest: (matchId: string, requestId: string) =>
    http.post(`/api/matches/${matchId}/requests/${requestId}/approve`),

  denyRequest: (matchId: string, requestId: string) =>
    http.post(`/api/matches/${matchId}/requests/${requestId}/deny`),

  removeMember: (matchId: string, userId: string) =>
    http.delete(`/api/matches/${matchId}/members/${userId}`),

  getNotifications: () =>
    http.get('/api/matches/notifications'),
}
