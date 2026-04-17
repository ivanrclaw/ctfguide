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
import { LiveSessionsService } from './live-sessions.service';

interface LiveSessionHost {
  userId: string;
  username: string;
  socketId: string;
  sessionId?: string;
}

interface LiveSessionStudent {
  name: string;
  socketId: string;
  sessionId?: string;
  participantId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/live-sessions',
  path: '/api/socket.io',
})
export class LiveSessionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedHosts = new Map<string, LiveSessionHost>();
  private connectedStudents = new Map<string, LiveSessionStudent>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private liveSessionsService: LiveSessionsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '') ||
        (client.handshake.query?.token as string);

      // If token provided, treat as host connection
      if (token) {
        const secret = this.configService.get<string>(
          'JWT_SECRET',
          'ctfguide_dev_secret_change_in_prod',
        );
        const payload = this.jwtService.verify(token, { secret });

        const host: LiveSessionHost = {
          userId: payload.sub,
          username: payload.username,
          socketId: client.id,
        };

        this.connectedHosts.set(client.id, host);
        client.emit('host:connected', { userId: host.userId, username: host.username });
      } else {
        // No token = student connection
        const student: LiveSessionStudent = {
          name: (client.handshake.query?.name as string) || 'Anonymous',
          socketId: client.id,
        };

        this.connectedStudents.set(client.id, student);
      }
    } catch (err) {
      // If token verification fails, treat as student
      const student: LiveSessionStudent = {
        name: (client.handshake.query?.name as string) || 'Anonymous',
        socketId: client.id,
      };
      this.connectedStudents.set(client.id, student);
    }
  }

  async handleDisconnect(client: Socket) {
    // Check if it was a host
    const host = this.connectedHosts.get(client.id);
    if (host?.sessionId) {
      this.server.to(`session:${host.sessionId}`).emit('host:disconnected');
    }
    this.connectedHosts.delete(client.id);

    // Check if it was a student
    const student = this.connectedStudents.get(client.id);
    if (student) {
      // Mark participant as offline
      await this.liveSessionsService.disconnectParticipant(client.id);
      if (student.sessionId) {
        this.server.to(`session:${student.sessionId}`).emit('student:disconnected', {
          name: student.name,
        });
        // Broadcast updated stats after disconnect
        this.broadcastStats(student.sessionId);
      }
    }
    this.connectedStudents.delete(client.id);
  }

  // Host joins a session room
  @SubscribeMessage('host:join')
  async handleHostJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const host = this.connectedHosts.get(client.id);
    if (!host) return;

    host.sessionId = data.sessionId;
    this.connectedHosts.set(client.id, host);
    client.join(`session:${data.sessionId}`);

    // Send initial stats
    await this.sendStatsToHost(data.sessionId, client.id);

    return { success: true };
  }

  // Student joins a session room
  @SubscribeMessage('student:join')
  async handleStudentJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; name: string; participantId: string },
  ) {
    const student = this.connectedStudents.get(client.id);
    if (!student) return;

    student.sessionId = data.sessionId;
    student.participantId = data.participantId;
    student.name = data.name;
    this.connectedStudents.set(client.id, student);
    client.join(`session:${data.sessionId}`);

    // Update participant socket ID
    await this.liveSessionsService.updateParticipantSocket(data.participantId, client.id);

    // Notify host of new student
    this.server.to(`session:${data.sessionId}`).emit('session:participantJoined', {
      name: data.name,
      participantId: data.participantId,
    });

    // Send updated stats to all hosts in this session
    await this.broadcastStats(data.sessionId);

    return { success: true };
  }

  // Student submits answer
  @SubscribeMessage('student:answer')
  async handleStudentAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; name: string; phaseId: string; valid: boolean; unlockedPhaseIndex: number },
  ) {
    if (data.valid) {
      this.server.to(`session:${data.sessionId}`).emit('session:participantProgress', {
        name: data.name,
        phaseId: data.phaseId,
        unlockedPhaseIndex: data.unlockedPhaseIndex,
      });

      // Send updated stats to all hosts in this session
      await this.broadcastStats(data.sessionId);
    }

    return { success: true };
  }

  // Session started
  @SubscribeMessage('session:started')
  async handleSessionStarted(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    this.server.to(`session:${data.sessionId}`).emit('session:started');
    await this.broadcastStats(data.sessionId);
    return { success: true };
  }

  // Session finished
  @SubscribeMessage('session:finished')
  handleSessionFinished(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    this.server.to(`session:${data.sessionId}`).emit('session:finished');
    return { success: true };
  }

  // Projector view joins to get session info
  @SubscribeMessage('projector:join')
  async handleProjectorJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    client.join(`session:${data.sessionId}`);

    // Send session info to projector
    const stats = await this.liveSessionsService.getSessionStatsForProjector(data.sessionId);
    this.server.to(client.id).emit('projector:info', stats);

    return { success: true };
  }

  private async sendStatsToHost(sessionId: string, hostSocketId: string) {
    try {
      const host = this.connectedHosts.get(hostSocketId);
      if (!host) return;

      const stats = await this.liveSessionsService.getSessionStats(sessionId, host.userId);
      this.server.to(hostSocketId).emit('session:stats', stats);
    } catch {
      // Ignore errors
    }
  }

  private async broadcastStats(sessionId: string) {
    // Send stats to ALL hosts tracking this session
    for (const [socketId, host] of this.connectedHosts.entries()) {
      if (host.sessionId === sessionId) {
        await this.sendStatsToHost(sessionId, socketId);
      }
    }
  }
}
