# CTF Guide - Plan de Implementación Colaborativa

## Funcionalidades a implementar

### ✅ 1. Sistema de Invitaciones (Fase 1 - COMPLETADO)
- **Entidad Invitation**: Rastrear invitaciones de colaboración en guías
- **Endpoint API**: Invitar usuarios por username/email
- **Dashboard**: Notificaciones de invitación pendientes
- **Aceptación/Rechazo**: Confirmar participación en guías

### 🔄 2. Colaboración en Tiempo Real (Fase 2 - PENDIENTE)
- **WebSocket**: Socket.io para comunicación en tiempo real
- **Sincronización**: Cambios en guías reflejados en tiempo real
- **Sesiones abiertas**: Manejar múltiples sesiones concurrentes

## Arquitectura Propuesta

### Base de Datos
```sql
-- Nueva entidad: invitations
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  invited_user_id UUID REFERENCES users(id),
  inviter_id UUID NOT NULL REFERENCES users(id),
  status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
  email VARCHAR(255) NULL,
  username VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP NULL,
  declined_at TIMESTAMP NULL
);

-- Nueva entidad: guide_collaborations (opcional para control de sesiones)
CREATE TABLE guide_collaborations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  session_id VARCHAR(255) NOT NULL,
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invitations_guide ON invitations(guide_id);
CREATE INDEX idx_invitations_user ON invitations(invited_user_id);
CREATE INDEX idx_collaborations_guide ON guide_collaborations(guide_id);
CREATE INDEX idx_collaborations_user ON guide_collaborations(user_id);
```

### API Endpoints
```
POST   /api/invitations - Invitar usuario a guía
GET    /api/invitations - Obtener invitaciones del usuario
PUT    /api/invitations/:id/accept - Aceptar invitación
PUT    /api/invitations/:id/decline - Rechazar invitación
DELETE /api/invitations/:id - Cancelar invitación

WS     /api/collaboration - WebSocket para sincronización en tiempo real
```

### Frontend Components
- ✅ `InvitationNotification.tsx` - Notificación de invitación en dashboard
- ✅ `AcceptDeclineDialog.tsx` - Diálogo para aceptar/rechazar
- ✅ `RealtimeEditor.tsx` - Editor con sincronización en tiempo real
- ✅ `ConnectedUsersIndicator.tsx` - Indicador de usuarios conectados

## Implementación por Fases

### ✅ Fase 1: Sistema de Invitaciones (COMPLETADO)
1. ✅ Crear entidad Invitation en API
2. ✅ Crear módulo invitations en API
3. ✅ Crear endpoints de invitación
4. ✅ Implementar notificaciones en dashboard
5. ✅ Agregar aceptación/rechazo

### 🔄 Fase 2: Colaboración en Tiempo Real (PENDIENTE)
1. ⏳ Integrar Socket.io en API
2. ⏳ Crear módulo collaborations en API
3. ⏳ Implementar WebSocket endpoints
4. ⏳ Crear editor con sincronización
5. ⏳ Agregar indicador de usuarios conectados

## Dependencias instaladas

### API
```json
{
  "dependencies": {
    "@nestjs/websockets": "^11.1.19",
    "@nestjs/platform-socket.io": "^11.1.19",
    "socket.io": "^4.8.3",
    "socket.io-client": "^4.8.3"
  }
}
```

### Web
```json
{
  "dependencies": {
    "socket.io-client": "^4.8.3",
    "@radix-ui/react-dialog": "^1.1.5",
    "@radix-ui/react-dropdown-menu": "^2.1.5",
    "@radix-ui/react-popover": "^1.1.5"
  }
}
```

## Archivos creados/actualizados

### API
- ✅ `apps/api/src/invitations/invitation.entity.ts` - Entidad Invitation
- ✅ `apps/api/src/invitations/dto/invitation.dto.ts` - DTOs
- ✅ `apps/api/src/invitations/invitations.service.ts` - Servicio
- ✅ `apps/api/src/invitations/invitations.controller.ts` - Controlador
- ✅ `apps/api/src/invitations/invitations.module.ts` - Módulo
- ✅ `apps/api/src/guides/guide.entity.ts` - Actualizado con relación invitations
- ✅ `apps/api/src/guides/guides.service.ts` - Actualizado con método getUserCollaboratedGuides
- ✅ `apps/api/src/guides/guides.controller.ts` - Actualizado con endpoint collaborated
- ✅ `apps/api/src/app.module.ts` - Importa InvitationsModule

### Web
- ✅ `apps/web/src/contexts/websocket-context.tsx` - Contexto WebSocket
- ✅ `apps/web/src/components/invitation-notification.tsx` - Notificaciones
- ✅ `apps/web/src/components/collaborated-guides-section.tsx` - Sección de guías colaboradas
- ✅ `apps/web/src/components/invite-collaborator-dialog.tsx` - Diálogo de invitación
- ✅ `apps/web/src/api/invitations.ts` - API client
- ✅ `apps/web/src/api/guides.ts` - API client para guías colaboradas
- ✅ `apps/web/src/components/layouts/dashboard-layout.tsx` - Actualizado con notificaciones
- ✅ `apps/web/src/pages/dashboard.tsx` - Actualizado con sección colaboradas
- ✅ `apps/web/src/pages/editor.tsx` - Actualizado con diálogo de invitación
- ✅ `apps/web/src/App.tsx` - Envuelto con WebSocketProvider

## Próximos pasos

1. **Base de datos**: Ejecutar migración para crear tabla invitations
2. **Fase 2**: Implementar colaboración en tiempo real con Socket.io
3. **Testing**: Probar flujo completo de invitación y colaboración
4. **Deploy**: Desplegar cambios en Fly.io