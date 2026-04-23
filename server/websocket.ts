import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";

interface ConnectedUser {
  socketId: string;
  tenantId: number;
  userId: string;
  username: string;
}

const connectedUsers = new Map<string, ConnectedUser>();
let globalIO: SocketIOServer | null = null;

export function setupWebSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  globalIO = io;

  io.on("connection", (socket) => {
    console.log(`[WebSocket] Novo cliente conectado: ${socket.id}`);

    // Quando o cliente se autentica
    socket.on("auth", (data: { tenantId: number; userId: string; username: string }) => {
      const user: ConnectedUser = {
        socketId: socket.id,
        tenantId: data.tenantId,
        userId: data.userId,
        username: data.username,
      };
      connectedUsers.set(socket.id, user);
      
      // Juntar o socket a uma sala por tenant para broadcast seletivo
      socket.join(`tenant-${data.tenantId}`);
      
      console.log(`[WebSocket] Usuário autenticado: ${data.username} (tenant: ${data.tenantId})`);
      
      // Notificar outros usuários que um novo usuário conectou
      socket.to(`tenant-${data.tenantId}`).emit("user:connected", {
        username: data.username,
        totalConnected: Array.from(connectedUsers.values()).filter(u => u.tenantId === data.tenantId).length,
      });
    });

    // Evento quando um novo faturamento é registrado
    socket.on("faturamento:novo", (data: { tenantId: number; empresaSlug: string; data: string; total: number }) => {
      console.log(`[WebSocket] Novo faturamento: ${data.empresaSlug} - R$ ${data.total}`);
      
      // Broadcast para todos os usuários do mesmo tenant
      io.to(`tenant-${data.tenantId}`).emit("faturamento:novo", {
        empresaSlug: data.empresaSlug,
        data: data.data,
        total: data.total,
        timestamp: new Date().toISOString(),
      });
    });

    // Evento quando um faturamento é deletado
    socket.on("faturamento:deletado", (data: { tenantId: number; id: string; empresaSlug: string }) => {
      console.log(`[WebSocket] Faturamento deletado: ${data.id}`);
      
      io.to(`tenant-${data.tenantId}`).emit("faturamento:deletado", {
        id: data.id,
        empresaSlug: data.empresaSlug,
        timestamp: new Date().toISOString(),
      });
    });

    // Evento quando um faturamento é atualizado
    socket.on("faturamento:atualizado", (data: { tenantId: number; id: string; empresaSlug: string; total: number }) => {
      console.log(`[WebSocket] Faturamento atualizado: ${data.id} - R$ ${data.total}`);
      
      io.to(`tenant-${data.tenantId}`).emit("faturamento:atualizado", {
        id: data.id,
        empresaSlug: data.empresaSlug,
        total: data.total,
        timestamp: new Date().toISOString(),
      });
    });

    // Desconexão
    socket.on("disconnect", () => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        connectedUsers.delete(socket.id);
        console.log(`[WebSocket] Usuário desconectado: ${user.username}`);
        
        // Notificar outros usuários
        io.to(`tenant-${user.tenantId}`).emit("user:disconnected", {
          username: user.username,
          totalConnected: Array.from(connectedUsers.values()).filter(u => u.tenantId === user.tenantId).length,
        });
      }
    });

    // Tratamento de erro
    socket.on("error", (error) => {
      console.error(`[WebSocket] Erro no socket ${socket.id}:`, error);
    });
  });

  return io;
}

// Função para emitir eventos do servidor (ex: quando sync automático completa)
export function getGlobalIO() {
  return globalIO;
}

export function emitFaturamentoNovo(tenantId: number, empresaSlug: string, data: string, total: number) {
  if (globalIO) {
    globalIO.to(`tenant-${tenantId}`).emit("faturamento:novo", {
      empresaSlug,
      data,
      total,
      timestamp: new Date().toISOString(),
      source: "server",
    });
  }
}
