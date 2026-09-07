import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

function read(relativePath: string) {
  return readFileSync(resolve(projectRoot, relativePath), "utf8");
}

function listTsx(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const absolutePath = resolve(directory, name);
    return statSync(absolutePath).isDirectory()
      ? listTsx(absolutePath)
      : absolutePath.endsWith(".tsx")
        ? [absolutePath]
        : [];
  });
}

describe("consistência visual global do tema claro", () => {
  const styles = read("client/src/index.css");

  it("mantém a correção global de cascata fora das layers do Tailwind", () => {
    const marker = styles.indexOf("Compatibilidade global do redesign claro");
    expect(marker).toBeGreaterThanOrEqual(0);
    expect(styles.slice(marker)).toContain(".premium-form-scope");
    expect(styles.slice(marker)).toContain(".premium-admin-scope");
    expect(styles.slice(marker)).toContain(".professional-light-scope");
    expect(styles.slice(marker)).toContain("color: #12233f !important;");
    expect(styles.slice(marker)).toContain("background-color: #ffffff !important;");
  });

  it("protege as principais áreas claras com escopos de contraste", () => {
    const expectedScopes: Array<[string, string]> = [
      ["client/src/pages/GestaoColaboradores.tsx", "people-light-scope"],
      ["client/src/pages/Profissionais.tsx", "people-light-scope"],
      ["client/src/pages/AdminPanel.tsx", "premium-admin-scope"],
      ["client/src/pages/AdminUsers.tsx", "premium-admin-scope"],
      ["client/src/pages/SuperAdmin.tsx", "premium-admin-scope"],
      ["client/src/pages/Empresas.tsx", "premium-admin-scope"],
      ["client/src/pages/Bonificacao.tsx", "premium-form-scope"],
      ["client/src/pages/HistoricoBonificacoes.tsx", "premium-form-scope"],
      ["client/src/pages/DpoteDistribuicao.tsx", "premium-form-scope"],
      ["client/src/components/AvecIntegracao.tsx", "premium-form-scope"],
      ["client/src/components/Onboarding.tsx", "premium-form-scope"],
      ["client/src/components/FechamentosConfig.tsx", "premium-form-scope"],
      ["client/src/components/ClientesEvolucaoMensalChart.tsx", "premium-form-scope"],
    ];

    for (const [file, scope] of expectedScopes) {
      expect(read(file), `${file} deve usar ${scope}`).toContain(scope);
    }
  });

  it("não permite fundos escuros explícitos em diálogos, seletores ou popovers de produção", () => {
    const clientRoot = resolve(projectRoot, "client/src");
    const ignored = new Set([
      "client/src/pages/ComponentShowcase.tsx",
      "client/src/components/AppSidebar.tsx",
      "client/src/components/DashboardLayout.tsx",
      "client/src/pages/RecuperarSenha.tsx",
    ]);
    const portalPattern = /<(?:DialogContent|AlertDialogContent|SelectContent|DropdownMenuContent|PopoverContent|SheetContent)[^>]*className="([^"]+)"/g;
    const darkSurfacePattern = /bg-(?:slate|zinc|gray)-(?:800|900|950)|bg-black(?:\/\d+)?/;
    const violations: string[] = [];

    for (const absolutePath of listTsx(clientRoot)) {
      const relativePath = absolutePath.slice(projectRoot.length + 1);
      if (ignored.has(relativePath)) continue;
      const source = readFileSync(absolutePath, "utf8");
      for (const match of source.matchAll(portalPattern)) {
        if (darkSurfacePattern.test(match[1])) {
          violations.push(`${relativePath}: ${match[1]}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("mantém os componentes identificados na auditoria em superfícies claras", () => {
    const fechamentos = read("client/src/components/FechamentosConfig.tsx");
    const evolucao = read("client/src/components/ClientesEvolucaoMensalChart.tsx");
    const colaboradores = read("client/src/pages/GestaoColaboradores.tsx");

    expect(fechamentos).not.toContain('bg-gray-950');
    expect(fechamentos).not.toContain('bg-gray-900 text-white');
    expect(evolucao).not.toContain('from-slate-900 to-slate-800');
    expect(evolucao).toContain('bg-white p-6 text-slate-900');
    expect(colaboradores).toContain('className="people-select-content"');
    expect(colaboradores).toContain('text-slate-900');
  });
});
