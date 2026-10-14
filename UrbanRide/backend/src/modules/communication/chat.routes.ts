
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AuthContext } from '../../common/auth/auth-context';
import { prisma } from '../../common/database/prisma';

function reply(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<any> {
  let body = '';

  for await (const chunk of req) {
    body += chunk;
  }

  if (body.length > 12_000) {
    throw new Error('Request body is too large.');
  }

  return body ? JSON.parse(body) : {};
}

function errorMessage(message: string) {
  return { error: { message } };
}

async function handleSupportRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  auth: AuthContext | null,
  pathname: string,
): Promise<boolean> {
  if (!pathname.startsWith('/chat/support/')) return false;

  if (!auth) {
    reply(res, 401, errorMessage('Sign in to access customer support.'));
    return true;
  }

  const isAdmin = auth.role === 'ADMIN';
  const isCustomer = auth.role === 'CUSTOMER';

  if (!isAdmin && !isCustomer) {
    reply(res, 403, errorMessage('Customer support is unavailable for this account.'));
    return true;
  }

  // GET /chat/support/conversations
  // Customers see only their own conversations; admins see the full inbox.
  if (pathname === '/chat/support/conversations') {
    if (req.method === 'GET') {
      const conversations = await prisma.supportConversation.findMany({
        where: isAdmin ? {} : { customerId: auth.subjectId },
        orderBy: { updatedAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              username: true,
              fullName: true,
              email: true,
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                  fullName: true,
                  role: true,
                },
              },
            },
          },
        },
      });

      reply(res, 200, conversations);
      return true;
    }

    // POST /chat/support/conversations
    // Only customers can start a support conversation.
    if (req.method === 'POST') {
      if (!isCustomer) {
        reply(res, 403, errorMessage('Only customers can start a support conversation.'));
        return true;
      }

      const input = await readBody(req);
      const body = typeof input.body === 'string' ? input.body.trim() : '';
      const subject =
        typeof input.subject === 'string' && input.subject.trim()
          ? input.subject.trim()
          : 'General support';

      if (!body || body.length > 2000) {
        reply(res, 400, errorMessage('Message must contain 1-2000 characters.'));
        return true;
      }

      if (subject.length > 120) {
        reply(res, 400, errorMessage('Subject must not exceed 120 characters.'));
        return true;
      }

      const conversation = await prisma.supportConversation.create({
        data: {
          customerId: auth.subjectId,
          subject,
          messages: {
            create: {
              senderId: auth.subjectId,
              body,
            },
          },
        },
        include: {
          customer: {
            select: {
              id: true,
              username: true,
              fullName: true,
              email: true,
            },
          },
          messages: {
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                  fullName: true,
                  role: true,
                },
              },
            },
          },
        },
      });

      reply(res, 201, conversation);
      return true;
    }

    reply(res, 405, errorMessage('Method not allowed.'));
    return true;
  }

  // GET/POST /chat/support/conversations/:id/messages
  const messageMatch = pathname.match(
    /^\/chat\/support\/conversations\/([^/]+)\/messages$/,
  );

  if (messageMatch) {
    const conversationId = decodeURIComponent(messageMatch[1]);

    const conversation = await prisma.supportConversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        customerId: true,
        status: true,
      },
    });

    if (!conversation) {
      reply(res, 404, errorMessage('Support conversation not found.'));
      return true;
    }

    // A customer can access only their own conversation.
    if (!isAdmin && conversation.customerId !== auth.subjectId) {
      reply(res, 403, errorMessage('You cannot access this support conversation.'));
      return true;
    }

    if (req.method === 'GET') {
      const messages = await prisma.supportMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              fullName: true,
              role: true,
            },
          },
        },
      });

      reply(res, 200, messages);
      return true;
    }

    if (req.method === 'POST') {
      const input = await readBody(req);
      const body = typeof input.body === 'string' ? input.body.trim() : '';

      if (!body || body.length > 2000) {
        reply(res, 400, errorMessage('Message must contain 1-2000 characters.'));
        return true;
      }

      if (conversation.status !== 'OPEN') {
        reply(res, 409, errorMessage('This support conversation is closed.'));
        return true;
      }

      const message = await prisma.supportMessage.create({
        data: {
          conversationId,
          senderId: auth.subjectId,
          body,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              fullName: true,
              role: true,
            },
          },
        },
      });

      await prisma.supportConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      reply(res, 201, message);
      return true;
    }

    reply(res, 405, errorMessage('Method not allowed.'));
    return true;
  }

  reply(res, 404, errorMessage('Support endpoint not found.'));
  return true;
}

export async function handleChatRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  auth: AuthContext | null,
): Promise<boolean> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

  // Customer-to-admin support chat is separate from ride chat.
  const supportHandled = await handleSupportRoutes(
    req,
    res,
    auth,
    url.pathname,
  );

  if (supportHandled) return true;

  // Existing ride chat: preserve its separate authorization and storage.
  const match = url.pathname.match(/^\/chat\/rides\/([^/]+)\/messages$/);
  if (!match) return false;

  if (!auth) {
    reply(res, 401, errorMessage('Sign in to access ride chat.'));
    return true;
  }

  const rideId = decodeURIComponent(match[1]);

  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    select: {
      id: true,
      customerId: true,
      riderId: true,
      status: true,
    },
  });

  if (!ride) {
    reply(res, 404, errorMessage('Ride not found.'));
    return true;
  }

  const allowed =
    auth.role === 'ADMIN' ||
    (auth.role === 'CUSTOMER' && ride.customerId === auth.subjectId) ||
    (auth.role === 'RIDER' && ride.riderId === auth.subjectId);

  if (!allowed) {
    reply(
      res,
      403,
      errorMessage(
        'Only this ride customer, assigned rider, or an admin can access its chat.',
      ),
    );
    return true;
  }

  if (req.method === 'GET') {
    const messages = await prisma.$queryRawUnsafe<any[]>(
      `SELECT m.id, m."rideId", m."senderId",
              COALESCE(u."fullName", u.username, 'User') AS "senderName",
              m.body, m."createdAt"
       FROM "RideChatMessage" m
       LEFT JOIN "User" u ON u.id = m."senderId"
       WHERE m."rideId" = $1
       ORDER BY m."createdAt" ASC
       LIMIT 200`,
      rideId,
    );

    reply(res, 200, messages);
    return true;
  }

  if (req.method === 'POST') {
    const input = await readBody(req);
    const body = typeof input.body === 'string' ? input.body.trim() : '';

    if (!body || body.length > 2000) {
      reply(res, 400, errorMessage('Message must contain 1-2000 characters.'));
      return true;
    }

    if (ride.status === 'CANCELLED') {
      reply(res, 409, errorMessage('Chat is unavailable for cancelled rides.'));
      return true;
    }

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO "RideChatMessage"
         (id, "rideId", "senderId", body, "createdAt")
       VALUES (
         concat('chat_', md5(random()::text || clock_timestamp()::text)),
         $1, $2, $3, NOW()
       )
       RETURNING id, "rideId", "senderId", body, "createdAt"`,
      rideId,
      auth.subjectId,
      body,
    );

    const message = rows[0];

    const user = await prisma.user.findUnique({
      where: { id: auth.subjectId },
      select: { fullName: true, username: true },
    });

    reply(res, 201, {
      ...message,
      senderName: user?.fullName || user?.username || 'User',
    });
    return true;
  }

  reply(res, 405, errorMessage('Method not allowed.'));
  return true;
}
