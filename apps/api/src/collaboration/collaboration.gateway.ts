import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface ConnectedUser {
  userId: string;
  username: string;
  socketId: string;
  guideId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/collaboration',
  path: '/api/socket.io',
})
export class CollaborationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, ConnectedUser>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '') ||
        (client.handshake.query?.token as string);

      if (!token) {
        client.disconnect(true);
        return;
      }

      const secret = this.configService.get<string>(
        'JWT_SECRET',
        'ctfguide_dev_secret_change_in_prod',
      );
      const payload = this.jwtService.verify(token, { secret });

      const user: ConnectedUser = {
        userId: payload.sub,
        username: payload.username,
        socketId: client.id,
      };

      this.connectedUsers.set(client.id, user);
      client.emit('user:connected', { userId: user.userId, username: user.username });

      // Broadcast updated user list
      this.broadcastOnlineUsers();
    } catch (err) {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const user = this.connectedUsers.get(client.id);
    if (user?.guideId) {
      // Notify guide room that user left
      client.to(`guide:${user.guideId}`).emit('collaborator:left', {
        userId: user.userId,
        username: user.username,
      });
    }

    this.connectedUsers.delete(client.id);
    this.broadcastOnlineUsers();
  }

  @SubscribeMessage('guide:join')
  handleJoinGuide(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { guideId: string },
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user) return;

    // Leave previous guide room if any
    if (user.guideId) {
      client.leave(`guide:${user.guideId}`);
      client.to(`guide:${user.guideId}`).emit('collaborator:left', {
        userId: user.userId,
        username: user.username,
      });
    }

    // Join new guide room
    user.guideId = data.guideId;
    this.connectedUsers.set(client.id, user);
    client.join(`guide:${data.guideId}`);

    // Notify others in the guide room
    client.to(`guide:${data.guideId}`).emit('collaborator:joined', {
      userId: user.userId,
      username: user.username,
    });

    // Send current collaborators in this guide
    const collaborators = Array.from(this.connectedUsers.values())
      .filter((u) => u.guideId === data.guideId && u.socketId !== client.id)
      .map((u) => ({ userId: u.userId, username: u.username }));

    client.emit('guide:collaborators', collaborators);

    return { success: true };
  }

  @SubscribeMessage('guide:leave')
  handleLeaveGuide(@ConnectedSocket() client: Socket) {
    const user = this.connectedUsers.get(client.id);
    if (!user || !user.guideId) return;

    const guideId = user.guideId;
    client.leave(`guide:${guideId}`);
    client.to(`guide:${guideId}`).emit('collaborator:left', {
      userId: user.userId,
      username: user.username,
    });

    user.guideId = undefined;
    this.connectedUsers.set(client.id, user);
  }

  @SubscribeMessage('guide:update')
  handleGuideUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { guideId: string; content: any },
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user) return;

    // Broadcast the update to other users in the guide room
    client.to(`guide:${data.guideId}`).emit('guide:updated', {
      userId: user.userId,
      username: user.username,
      content: data.content,
    });
  }

  @SubscribeMessage('guide:cursor')
  handleCursorUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { guideId: string; cursor: any },
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user) return;

    client.to(`guide:${data.guideId}`).emit('collaborator:cursor', {
      userId: user.userId,
      username: user.username,
      cursor: data.cursor,
    });
  }

  // Method to broadcast invitation events from InvitationsService
  broadcastInvitation(userId: string, event: string, data: any) {
    // Find all sockets for this user
    for (const [socketId, user] of this.connectedUsers.entries()) {
      if (user.userId === userId) {
        this.server.to(socketId).emit(event, data);
      }
    }
  }

  private broadcastOnlineUsers() {
    const users = Array.from(this.connectedUsers.values()).map((u) => ({
      userId: u.userId,
      username: u.username,
      guideId: u.guideId,
    }));
    this.server.emit('users:online', users);
  }
}