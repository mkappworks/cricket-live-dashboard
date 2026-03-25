import { Router } from 'express'
import { eq, and, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '../db/client.js'
import {
  matches,
  matchMembers,
  matchInvitations,
  matchAccessRequests,
  users,
  matchCurrentState,
} from '../db/schema.js'
import { userSocketMap } from '../socket/userSocketMap.js'
import { SOCKET_EVENTS } from '@cricket-live/shared'
import type { Server } from 'socket.io'

// io instance injected after server setup
let _io: Server

export function setIo(io: Server) {
  _io = io
}

function emitToUser(userId: string, event: string, data: unknown) {
  const socketId = userSocketMap.get(userId)
  if (socketId && _io) {
    _io.to(socketId).emit(event, data)
  }
}

export const matchesRouter = Router()

// GET /api/matches?page=1&limit=20
matchesRouter.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20))
    const offset = (page - 1) * limit
    const currentUserId: string = res.locals.user.id

    const allMatches = await db
      .select({
        id: matches.id,
        name: matches.name,
        creatorId: matches.creatorId,
        createdAt: matches.createdAt,
        creatorEmail: users.email,
        memberCount: sql<number>`(SELECT COUNT(*) FROM match_members WHERE match_members.match_id = ${matches.id})`,
        isMember: sql<number>`(SELECT COUNT(*) FROM match_members WHERE match_members.match_id = ${matches.id} AND match_members.user_id = ${currentUserId})`,
      })
      .from(matches)
      .leftJoin(users, eq(matches.creatorId, users.id))
      .orderBy(matches.createdAt)
      .limit(limit)
      .offset(offset)

    const [{ count }] = await db.select({ count: sql<number>`COUNT(*)` }).from(matches)

    res.json({
      matches: allMatches.map((m) => ({ ...m, isMember: m.isMember > 0 })),
      total: count,
      page,
      limit,
    })
  } catch (err) {
    console.error('Error listing matches:', err)
    res.status(500).json({ error: 'Failed to list matches' })
  }
})

// POST /api/matches — create a match
matchesRouter.post('/', async (req, res) => {
  try {
    const { name } = req.body
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Match name is required' })
      return
    }

    const userId: string = res.locals.user.id
    const matchId = nanoid()

    await db.batch([
      db.insert(matches).values({ id: matchId, name: name.trim(), creatorId: userId }),
      db.insert(matchMembers).values({ matchId, userId, role: 'creator' }),
      db.insert(matchCurrentState).values({ matchId }),
    ])

    const [created] = await db.select().from(matches).where(eq(matches.id, matchId))
    res.status(201).json(created)
  } catch (err) {
    console.error('Error creating match:', err)
    res.status(500).json({ error: 'Failed to create match' })
  }
})

// DELETE /api/matches/:id — delete match (creator only)
matchesRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const userId: string = res.locals.user.id

    const [match] = await db.select().from(matches).where(eq(matches.id, id))
    if (!match) {
      res.status(404).json({ error: 'Match not found' })
      return
    }
    if (match.creatorId !== userId) {
      res.status(403).json({ error: 'Only the creator can delete this match' })
      return
    }

    await db.delete(matches).where(eq(matches.id, id))
    res.json({ success: true })
  } catch (err) {
    console.error('Error deleting match:', err)
    res.status(500).json({ error: 'Failed to delete match' })
  }
})

// GET /api/matches/:id/membership
matchesRouter.get('/:id/membership', async (req, res) => {
  try {
    const { id } = req.params
    const userId: string = res.locals.user.id

    const [member] = await db
      .select()
      .from(matchMembers)
      .where(and(eq(matchMembers.matchId, id), eq(matchMembers.userId, userId)))

    res.json({
      isMember: !!member,
      isCreator: member?.role === 'creator',
    })
  } catch (err) {
    console.error('Error checking membership:', err)
    res.status(500).json({ error: 'Failed to check membership' })
  }
})

// POST /api/matches/:id/invite — invite user by email (creator only)
matchesRouter.post('/:id/invite', async (req, res) => {
  try {
    const { id } = req.params
    const { email } = req.body
    const userId: string = res.locals.user.id

    const [match] = await db.select().from(matches).where(eq(matches.id, id))
    if (!match) {
      res.status(404).json({ error: 'Match not found' })
      return
    }
    if (match.creatorId !== userId) {
      res.status(403).json({ error: 'Only the creator can invite users' })
      return
    }
    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Email is required' })
      return
    }

    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))

    if (targetUser) {
      const [existingMember] = await db
        .select()
        .from(matchMembers)
        .where(and(eq(matchMembers.matchId, id), eq(matchMembers.userId, targetUser.id)))
      if (existingMember) {
        res.status(400).json({ error: 'User is already a member' })
        return
      }
    }

    const invitationId = nanoid()
    await db.insert(matchInvitations).values({
      id: invitationId,
      matchId: id,
      invitedEmail: email.toLowerCase().trim(),
      invitedById: userId,
    })

    if (targetUser) {
      emitToUser(targetUser.id, SOCKET_EVENTS.MATCH_INVITATION, {
        invitationId,
        matchId: id,
        matchName: match.name,
        fromUserEmail: res.locals.user.email,
      })
    }

    res.status(201).json({ invitationId })
  } catch (err) {
    console.error('Error inviting user:', err)
    res.status(500).json({ error: 'Failed to invite user' })
  }
})

// POST /api/matches/:id/invitations/:iid/accept
matchesRouter.post('/:id/invitations/:iid/accept', async (req, res) => {
  try {
    const { id, iid } = req.params
    const userEmail: string = res.locals.user.email
    const userId: string = res.locals.user.id

    const [invitation] = await db
      .select()
      .from(matchInvitations)
      .where(and(eq(matchInvitations.id, iid), eq(matchInvitations.matchId, id)))

    if (!invitation) {
      res.status(404).json({ error: 'Invitation not found' })
      return
    }
    if (invitation.invitedEmail !== userEmail) {
      res.status(403).json({ error: 'This invitation is not for you' })
      return
    }
    if (invitation.status !== 'pending') {
      res.status(400).json({ error: 'Invitation is no longer pending' })
      return
    }

    await db.batch([
      db.update(matchInvitations).set({ status: 'accepted' }).where(eq(matchInvitations.id, iid)),
      db.insert(matchMembers).values({ matchId: id, userId, role: 'member' }),
    ])

    const [match] = await db.select().from(matches).where(eq(matches.id, id))
    if (match) {
      emitToUser(match.creatorId, SOCKET_EVENTS.INVITATION_ACCEPTED, {
        matchId: id,
        matchName: match.name,
        userEmail,
      })
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Error accepting invitation:', err)
    res.status(500).json({ error: 'Failed to accept invitation' })
  }
})

// POST /api/matches/:id/invitations/:iid/reject
matchesRouter.post('/:id/invitations/:iid/reject', async (req, res) => {
  try {
    const { id, iid } = req.params
    const userEmail: string = res.locals.user.email

    const [invitation] = await db
      .select()
      .from(matchInvitations)
      .where(and(eq(matchInvitations.id, iid), eq(matchInvitations.matchId, id)))

    if (!invitation || invitation.invitedEmail !== userEmail) {
      res.status(404).json({ error: 'Invitation not found' })
      return
    }

    await db
      .update(matchInvitations)
      .set({ status: 'rejected' })
      .where(eq(matchInvitations.id, iid))

    res.json({ success: true })
  } catch (err) {
    console.error('Error rejecting invitation:', err)
    res.status(500).json({ error: 'Failed to reject invitation' })
  }
})

// POST /api/matches/:id/requests — request access
matchesRouter.post('/:id/requests', async (req, res) => {
  try {
    const { id } = req.params
    const userId: string = res.locals.user.id

    const [match] = await db.select().from(matches).where(eq(matches.id, id))
    if (!match) {
      res.status(404).json({ error: 'Match not found' })
      return
    }

    const [existingMember] = await db
      .select()
      .from(matchMembers)
      .where(and(eq(matchMembers.matchId, id), eq(matchMembers.userId, userId)))
    if (existingMember) {
      res.status(400).json({ error: 'Already a member' })
      return
    }

    const [existingRequest] = await db
      .select()
      .from(matchAccessRequests)
      .where(
        and(
          eq(matchAccessRequests.matchId, id),
          eq(matchAccessRequests.userId, userId),
          eq(matchAccessRequests.status, 'pending')
        )
      )
    if (existingRequest) {
      res.status(400).json({ error: 'Access request already pending' })
      return
    }

    const requestId = nanoid()
    await db.insert(matchAccessRequests).values({ id: requestId, matchId: id, userId })

    emitToUser(match.creatorId, SOCKET_EVENTS.ACCESS_REQUEST, {
      requestId,
      matchId: id,
      matchName: match.name,
      fromUserEmail: res.locals.user.email,
    })

    res.status(201).json({ requestId })
  } catch (err) {
    console.error('Error requesting access:', err)
    res.status(500).json({ error: 'Failed to request access' })
  }
})

// POST /api/matches/:id/requests/:rid/approve — approve request (creator only)
matchesRouter.post('/:id/requests/:rid/approve', async (req, res) => {
  try {
    const { id, rid } = req.params
    const userId: string = res.locals.user.id

    const [match] = await db.select().from(matches).where(eq(matches.id, id))
    if (!match || match.creatorId !== userId) {
      res.status(403).json({ error: 'Only the creator can approve requests' })
      return
    }

    const [request] = await db
      .select()
      .from(matchAccessRequests)
      .where(and(eq(matchAccessRequests.id, rid), eq(matchAccessRequests.matchId, id)))

    if (!request) {
      res.status(404).json({ error: 'Request not found' })
      return
    }

    await db.batch([
      db
        .update(matchAccessRequests)
        .set({ status: 'approved' })
        .where(eq(matchAccessRequests.id, rid)),
      db.insert(matchMembers).values({ matchId: id, userId: request.userId, role: 'member' }),
    ])

    const [requester] = await db.select().from(users).where(eq(users.id, request.userId))
    emitToUser(request.userId, SOCKET_EVENTS.REQUEST_APPROVED, {
      matchId: id,
      matchName: match.name,
    })

    res.json({ success: true, requesterEmail: requester?.email })
  } catch (err) {
    console.error('Error approving request:', err)
    res.status(500).json({ error: 'Failed to approve request' })
  }
})

// POST /api/matches/:id/requests/:rid/deny — deny request (creator only)
matchesRouter.post('/:id/requests/:rid/deny', async (req, res) => {
  try {
    const { id, rid } = req.params
    const userId: string = res.locals.user.id

    const [match] = await db.select().from(matches).where(eq(matches.id, id))
    if (!match || match.creatorId !== userId) {
      res.status(403).json({ error: 'Only the creator can deny requests' })
      return
    }

    const [request] = await db
      .select()
      .from(matchAccessRequests)
      .where(and(eq(matchAccessRequests.id, rid), eq(matchAccessRequests.matchId, id)))

    if (!request) {
      res.status(404).json({ error: 'Request not found' })
      return
    }

    await db
      .update(matchAccessRequests)
      .set({ status: 'rejected' })
      .where(eq(matchAccessRequests.id, rid))

    emitToUser(request.userId, SOCKET_EVENTS.REQUEST_DENIED, {
      matchId: id,
      matchName: match.name,
    })

    res.json({ success: true })
  } catch (err) {
    console.error('Error denying request:', err)
    res.status(500).json({ error: 'Failed to deny request' })
  }
})

// DELETE /api/matches/:id/members/:uid — remove member (creator only)
matchesRouter.delete('/:id/members/:uid', async (req, res) => {
  try {
    const { id, uid } = req.params
    const userId: string = res.locals.user.id

    const [match] = await db.select().from(matches).where(eq(matches.id, id))
    if (!match || match.creatorId !== userId) {
      res.status(403).json({ error: 'Only the creator can remove members' })
      return
    }
    if (uid === userId) {
      res.status(400).json({ error: 'Cannot remove yourself as creator' })
      return
    }

    await db
      .delete(matchMembers)
      .where(and(eq(matchMembers.matchId, id), eq(matchMembers.userId, uid)))

    res.json({ success: true })
  } catch (err) {
    console.error('Error removing member:', err)
    res.status(500).json({ error: 'Failed to remove member' })
  }
})

// GET /api/matches/:id/members — list match members (members only)
matchesRouter.get('/:id/members', async (req, res) => {
  try {
    const { id } = req.params
    const userId: string = res.locals.user.id

    const [membership] = await db
      .select()
      .from(matchMembers)
      .where(and(eq(matchMembers.matchId, id), eq(matchMembers.userId, userId)))

    if (!membership) {
      res.status(403).json({ error: 'Not a member of this match' })
      return
    }

    const members = await db
      .select({
        userId: matchMembers.userId,
        role: matchMembers.role,
        joinedAt: matchMembers.joinedAt,
        email: users.email,
        name: users.name,
      })
      .from(matchMembers)
      .leftJoin(users, eq(matchMembers.userId, users.id))
      .where(eq(matchMembers.matchId, id))

    res.json(members)
  } catch (err) {
    console.error('Error listing members:', err)
    res.status(500).json({ error: 'Failed to list members' })
  }
})

// GET /api/matches/notifications
matchesRouter.get('/notifications', async (req, res) => {
  try {
    const userEmail: string = res.locals.user.email

    const pendingInvitations = await db
      .select({
        id: matchInvitations.id,
        matchId: matchInvitations.matchId,
        matchName: matches.name,
        invitedById: matchInvitations.invitedById,
        inviterEmail: users.email,
        createdAt: matchInvitations.createdAt,
      })
      .from(matchInvitations)
      .leftJoin(matches, eq(matchInvitations.matchId, matches.id))
      .leftJoin(users, eq(matchInvitations.invitedById, users.id))
      .where(
        and(eq(matchInvitations.invitedEmail, userEmail), eq(matchInvitations.status, 'pending'))
      )

    res.json({ invitations: pendingInvitations })
  } catch (err) {
    console.error('Error fetching notifications:', err)
    res.status(500).json({ error: 'Failed to fetch notifications' })
  }
})

// GET /api/matches/:id/requests — list pending requests (creator only)
matchesRouter.get('/:id/requests', async (req, res) => {
  try {
    const { id } = req.params
    const userId: string = res.locals.user.id

    const [match] = await db.select().from(matches).where(eq(matches.id, id))
    if (!match || match.creatorId !== userId) {
      res.status(403).json({ error: 'Only the creator can view requests' })
      return
    }

    const requests = await db
      .select({
        id: matchAccessRequests.id,
        userId: matchAccessRequests.userId,
        status: matchAccessRequests.status,
        createdAt: matchAccessRequests.createdAt,
        email: users.email,
        name: users.name,
      })
      .from(matchAccessRequests)
      .leftJoin(users, eq(matchAccessRequests.userId, users.id))
      .where(
        and(eq(matchAccessRequests.matchId, id), eq(matchAccessRequests.status, 'pending'))
      )

    res.json(requests)
  } catch (err) {
    console.error('Error listing requests:', err)
    res.status(500).json({ error: 'Failed to list requests' })
  }
})
