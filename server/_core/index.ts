import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { inicializarJobsCashbarber } from "../cashbarberJob";
import { iniciarJobAvec } from "../avecJob";
import { aplicarDpoteParaTenant } from "../cashbarberSincronizador";
import { setupWebSocket } from "../websocket";
import { iniciarSincronizacaoHoraria } from "../cashbarberHourlySync";
import * as cron from "node-cron";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // ─── Endpoint interno para sync agendado externo ─────────────────────────────
  // Protegido por token secreto para evitar uso indevido
  // Usado pelo cron job externo para garantir sync mesmo após hibernação do sandbox
  app.post("/api/internal/cron-sync", async (req, res) => {
    const token = req.headers["x-cron-token"] || req.query.token;
    const expectedToken = process.env.CRON_SECRET_TOKEN || "barbiero-cron-2026";
    if (token !== expectedToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const { listCashbarberConfigs } = await import("../db");
      const { sincronizarFaturamentoCashbarber } = await import("../cashbarberSincronizador");
      const agora = new Date();
      const mes = agora.getMonth() + 1;
      const ano = agora.getFullYear();
      // Buscar todas as configs ativas (tenant 1 = Barbiero)
      const configs = await listCashbarberConfigs(1);
      const resultados: Record<string, unknown> = {};
      for (const config of configs) {
        if (!config.ativo) continue;
        try {
          const resultado = await sincronizarFaturamentoCashbarber(1, config.empresaSlug, mes, ano, "auto");
          resultados[config.empresaSlug] = { ok: true, dias: resultado.diasSincronizados };
          console.log(`[CronSync] Sync externo concluído para ${config.empresaSlug}: ${resultado.diasSincronizados} dias`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          resultados[config.empresaSlug] = { ok: false, erro: msg };
          console.error(`[CronSync] Erro ao sincronizar ${config.empresaSlug}:`, msg);
        }
      }
      // Aplicar Dpote após sync de todas as empresas
      try {
        await aplicarDpoteParaTenant(1, mes, ano);
        console.log(`[CronSync] Dpote aplicado com sucesso`);
      } catch (err) {
        console.warn(`[CronSync] Falha ao aplicar Dpote:`, err);
      }
      // Recalcular ranking dos profissionais
      let rankingResult = { sincronizados: 0, erros: 0 };
      try {
        const { executarRecalculoRanking } = await import("../cashbarberJob");
        rankingResult = await executarRecalculoRanking(1);
        console.log(`[CronSync] Ranking recalculado: ${rankingResult.sincronizados} profissional(is)`);
      } catch (err) {
        console.warn(`[CronSync] Falha ao recalcular ranking:`, err);
      }
      return res.json({ ok: true, mes, ano, resultados, ranking: rankingResult, timestamp: agora.toISOString() });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[CronSync] Erro geral:", msg);
      return res.status(500).json({ ok: false, erro: msg });
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // Setup WebSocket para sincronização em tempo real
  setupWebSocket(server);
  console.log("[WebSocket] Servidor WebSocket inicializado");

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Inicializar jobs de sincronização automática do CashBarber
    inicializarJobsCashbarber().catch((err) => {
      console.error("[CashBarber Job] Falha na inicialização:", err);
    });

    // Inicializar job de sincronização automática do Avec (a cada 1 hora)
    try {
      iniciarJobAvec();
    } catch (err) {
      console.error("[Avec Job] Falha na inicialização:", err);
    }

    // Inicializar sincronização horária do CashBarber (Mascote e Morumbi)
    try {
      iniciarSincronizacaoHoraria();
      console.log("[CashBarber Hourly Sync] Job de sincronização horária iniciado com sucesso");
    } catch (err) {
      console.error("[CashBarber Hourly Sync] Falha na inicialização:", err);
    }

  });
}

startServer().catch(console.error);
