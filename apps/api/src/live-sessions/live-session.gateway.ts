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
import { LiveSessionsController } from './live-sessions.controller';

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
      client.to(`session:${host.sessionId}`).emit('host:disconnected');
    }
    this.connectedHosts.delete(client.id);

    // Check if it was a student
    const student = this.connectedStudents.get(client.id);
    if (student) {
      // Mark participant as offline
      await this.liveSessionsService.disconnectParticipant(client.id);
      if (student.sessionId) {
        client.to(`session:${student.sessionId}`).emit('student:disconnected', {
          name: student.name,
        });
      }
    }
    this.connectedStudents.delete(client.id);
  }

  // Host joins a session room
  @SubscribeMessage('host:join')
  handleHostJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const host = this.connectedHosts.get(client.id);
    if (!host) return;

    host.sessionId = data.sessionId;
    this.connectedHosts.set(client.id, host);
    client.join(`session:${data.sessionId}`);

    // Send initial stats
    this.sendStatsToHost(data.sessionId, client.id);

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
    client.to(`session:${data.sessionId}`).emit('session:participantJoined', {
      name: data.name,
      participantId: data.participantId,
    });

    // Send updated stats to host
    this.broadcastStats(data.sessionId);

    return { success: true };
  }

  // Student submits answer
  @SubscribeMessage('student:answer')
  handleStudentAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; name: string; phaseId: string; valid: boolean; unlockedPhaseIndex: number },
  ) {
    if (data.valid) {
      client.to(`session:${data.sessionId}`).emit('session:participantProgress', {
        name: data.name,
        phaseId: data.phaseId,
        unlockedPhaseIndex: data.unlockedPhaseIndex,
      });

      // Send updated stats to host
      this.broadcastStats(data.sessionId);
    }

    return { success: true };
  }

  // Session started
  @SubscribeMessage('session:started')
  handleSessionStarted(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    this.server.to(`session:${data.sessionId}`).emit('session:started');
    this.broadcastStats(data.sessionId);
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
    // Find the host socket for this session
    for (const [, host] of this.connectedHosts.entries()) {
      if (host.sessionId === sessionId) {
        await this.sendStatsToHost(sessionId, host.socketId);
        break;
      }
    }
  }
}
