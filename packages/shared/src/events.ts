export const SOCKET_EVENTS = {
  MATCH_STATE: 'match_state',
  BALL_UPDATE: 'ball_update',
  OVER_COMPLETE: 'over_complete',
  ADD_BALL: 'add_ball',
  RESET_MATCH: 'reset_match',
  JOIN_MATCH: 'join_match',
  LEAVE_MATCH: 'leave_match',
  MATCH_INVITATION: 'match_invitation',
  INVITATION_ACCEPTED: 'invitation_accepted',
  ACCESS_REQUEST: 'access_request',
  REQUEST_APPROVED: 'request_approved',
  REQUEST_DENIED: 'request_denied',
} as const
