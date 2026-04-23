import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

interface WebSocketEvents {
  "faturamento:novo": (data: { empresaSlug: string; data: string; total: number; timestamp: string }) => void;
  "faturamento:deletado": (data: { id: string; empresaSlug: string; timestamp: string }) => void;
  "faturamento:atualizado": (data: { id: string; empresaSlug: string; total: number; timestamp: string }) => void;
  "user:connected": (data: { username: string; totalConnected: number }) => void;
  "user:disconnected": (data: { username: string; totalConnected: number }) => void;
}

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [totalConnected, setTotalConnected] = useState(0);
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // Conectar ao WebSocket
  useEffect(() => {
    if (!user) return;

    // Conectar ao servidor WebSocket (mesmo host)
    const socket = io(window.location.origin, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Evento de conexão
    socket.on("connect", () => {
      console.log("[WebSocket] Conectado ao servidor");
      setIsConnected(true);

      // Autenticar com o servidor
      socket.emit("auth", {
        tenantId: (user as any)?.tenantId || 1,
        userId: user.id,
        username: user.name || "Usuário",
      });
    });

    // Evento de desconexão
    socket.on("disconnect", () => {
      console.log("[WebSocket] Desconectado do servidor");
      setIsConnected(false);
    });

    // Evento: novo faturamento registrado
    socket.on("faturamento:novo", (data) => {
      console.log("[WebSocket] Novo faturamento recebido:", data);
      // Invalidar queries para atualizar dashboard
      utils.faturamento.listar.invalidate();
      utils.profissionais.ranking.invalidate();
    });

    // Evento: faturamento deletado
    socket.on("faturamento:deletado", (data) => {
      console.log("[WebSocket] Faturamento deletado:", data);
      utils.faturamento.listar.invalidate();
      utils.profissionais.ranking.invalidate();
    });

    // Evento: faturamento atualizado
    socket.on("faturamento:atualizado", (data) => {
      console.log("[WebSocket] Faturamento atualizado:", data);
      utils.faturamento.listar.invalidate();
      utils.profissionais.ranking.invalidate();
    });

    // Evento: usuário conectado
    socket.on("user:connected", (data) => {
      console.log(`[WebSocket] ${data.username} conectado (Total: ${data.totalConnected})`);
      setTotalConnected(data.totalConnected);
    });

    // Evento: usuário desconectado
    socket.on("user:disconnected", (data) => {
      console.log(`[WebSocket] ${data.username} desconectado (Total: ${data.totalConnected})`);
      setTotalConnected(data.totalConnected);
    });

    // Evento de erro
    socket.on("error", (error) => {
      console.error("[WebSocket] Erro:", error);
    });

    // Cleanup ao desmontar
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, utils]);

  // Função para emitir eventos
  const emit = useCallback(
    <K extends keyof WebSocketEvents>(event: K, data: Parameters<WebSocketEvents[K]>[0]) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit(event, data);
      }
    },
    []
  );

  return {
    socket: socketRef.current,
    isConnected,
    totalConnected,
    emit,
  };
}
