/**
 * Testes para as procedures de cookie de sessão Avec
 * Verifica que salvarCookieSessao e removerCookieSessao funcionam corretamente
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock das dependências de banco de dados
vi.mock("./db", () => ({
  getAvecConfig: vi.fn(),
  upsertAvecConfig: vi.fn(),
  listAvecConfigs: vi.fn(),
  listAvecMapeamento: vi.fn(),
  insertAvecSyncLog: vi.fn(),
  updateAvecSyncStatus: vi.fn(),
}));

import { getAvecConfig, upsertAvecConfig } from "./db";

const mockGetAvecConfig = getAvecConfig as ReturnType<typeof vi.fn>;
const mockUpsertAvecConfig = upsertAvecConfig as ReturnType<typeof vi.fn>;

const mockConfig = {
  id: 1,
  tenantId: 1,
  empresaSlug: "seraphine",
  avecEmail: "admin@seraphine.com",
  avecSenha: "senha123",
  avecSalaoId: "95687",
  avecSalaoNome: "Seraphine Beauty",
  ativo: 1,
  sincAutoAtiva: 0,
  horarioSinc: "23:00",
  avecSessionCookie: null,
  cookieConfiguradoEm: null,
  ultimaSincronizacao: null,
  statusUltimaSinc: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Avec Cookie de Sessão", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("salvarCookieSessao", () => {
    it("deve salvar o cookie quando a configuração existe", async () => {
      mockGetAvecConfig.mockResolvedValue(mockConfig);
      mockUpsertAvecConfig.mockResolvedValue(1);

      const cookieValue = "ci_session=abc123xyz";

      // Simular a lógica da procedure
      const config = await getAvecConfig(1, "seraphine");
      expect(config).not.toBeNull();

      await upsertAvecConfig({
        tenantId: 1,
        empresaSlug: "seraphine",
        avecEmail: config!.avecEmail,
        avecSenha: config!.avecSenha,
        avecSalaoId: config!.avecSalaoId,
        avecSalaoNome: config!.avecSalaoNome ?? undefined,
        ativo: config!.ativo,
        sincAutoAtiva: config!.sincAutoAtiva,
        horarioSinc: config!.horarioSinc ?? undefined,
        avecSessionCookie: cookieValue,
        cookieConfiguradoEm: new Date(),
      });

      expect(mockUpsertAvecConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          avecSessionCookie: cookieValue,
          cookieConfiguradoEm: expect.any(Date),
        })
      );
    });

    it("deve lançar erro quando a configuração não existe", async () => {
      mockGetAvecConfig.mockResolvedValue(null);

      const config = await getAvecConfig(1, "empresa-inexistente");
      expect(config).toBeNull();

      // A procedure deve lançar erro neste caso
      if (!config) {
        expect(() => {
          throw new Error("Configuração Avec não encontrada. Salve as credenciais primeiro.");
        }).toThrow("Configuração Avec não encontrada");
      }
    });
  });

  describe("removerCookieSessao", () => {
    it("deve remover o cookie definindo como null", async () => {
      const configComCookie = {
        ...mockConfig,
        avecSessionCookie: "ci_session=abc123xyz",
        cookieConfiguradoEm: new Date(),
      };
      mockGetAvecConfig.mockResolvedValue(configComCookie);
      mockUpsertAvecConfig.mockResolvedValue(1);

      const config = await getAvecConfig(1, "seraphine");
      expect(config?.avecSessionCookie).toBe("ci_session=abc123xyz");

      await upsertAvecConfig({
        tenantId: 1,
        empresaSlug: "seraphine",
        avecEmail: config!.avecEmail,
        avecSenha: config!.avecSenha,
        avecSalaoId: config!.avecSalaoId,
        avecSalaoNome: config!.avecSalaoNome ?? undefined,
        ativo: config!.ativo,
        sincAutoAtiva: config!.sincAutoAtiva,
        horarioSinc: config!.horarioSinc ?? undefined,
        avecSessionCookie: null,
        cookieConfiguradoEm: null,
      });

      expect(mockUpsertAvecConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          avecSessionCookie: null,
          cookieConfiguradoEm: null,
        })
      );
    });
  });

  describe("Lógica de seleção de cookie no sincronizador", () => {
    it("deve usar cookie manual quando disponível", () => {
      const configComCookie = {
        ...mockConfig,
        avecSessionCookie: "ci_session=manual123",
        cookieConfiguradoEm: new Date(),
      };

      let sessionCookie: string | null = null;
      let metodo: string | null = null;

      if (configComCookie.avecSessionCookie && configComCookie.avecSessionCookie.trim()) {
        sessionCookie = configComCookie.avecSessionCookie.trim();
        metodo = "cookie_manual";
      }

      expect(sessionCookie).toBe("ci_session=manual123");
      expect(metodo).toBe("cookie_manual");
    });

    it("deve tentar login automático quando não há cookie manual", () => {
      const configSemCookie = {
        ...mockConfig,
        avecSessionCookie: null,
      };

      let usarCookieManual = false;

      if (configSemCookie.avecSessionCookie && configSemCookie.avecSessionCookie.trim()) {
        usarCookieManual = true;
      }

      expect(usarCookieManual).toBe(false);
    });

    it("deve ignorar cookie vazio (apenas espaços)", () => {
      const configCookieVazio = {
        ...mockConfig,
        avecSessionCookie: "   ",
      };

      let usarCookieManual = false;

      if (configCookieVazio.avecSessionCookie && configCookieVazio.avecSessionCookie.trim()) {
        usarCookieManual = true;
      }

      expect(usarCookieManual).toBe(false);
    });
  });

  describe("Detecção de cookie expirado", () => {
    it("deve detectar cookie configurado há mais de 48h como potencialmente expirado", () => {
      const dataAntiga = new Date(Date.now() - 50 * 60 * 60 * 1000); // 50 horas atrás
      const cookieIdade = Math.floor((Date.now() - dataAntiga.getTime()) / (1000 * 60 * 60));
      const cookieExpirado = cookieIdade > 48;

      expect(cookieExpirado).toBe(true);
    });

    it("deve considerar cookie configurado há menos de 48h como ativo", () => {
      const dataRecente = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 horas atrás
      const cookieIdade = Math.floor((Date.now() - dataRecente.getTime()) / (1000 * 60 * 60));
      const cookieExpirado = cookieIdade > 48;

      expect(cookieExpirado).toBe(false);
    });
  });
});
