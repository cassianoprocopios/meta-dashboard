import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

function read(relativePath: string) {
  return readFileSync(resolve(projectRoot, relativePath), "utf8");
}

describe("visibilidade das telas de pessoas", () => {
  const profissionais = read("client/src/pages/Profissionais.tsx");
  const colaboradores = read("client/src/pages/GestaoColaboradores.tsx");
  const styles = read("client/src/index.css");

  it("aplica o escopo claro dedicado nas duas telas", () => {
    expect(profissionais).toContain('className="people-light-scope');
    expect(colaboradores).toContain('className="people-light-scope');
    expect(styles).toContain(".people-light-scope");
  });

  it("mantém todos os diálogos das duas telas em superfícies claras", () => {
    const dialogClasses = [...`${profissionais}\n${colaboradores}`.matchAll(/<DialogContent className="([^"]+)"/g)]
      .map((match) => match[1]);

    expect(dialogClasses.length).toBeGreaterThan(0);
    expect(dialogClasses.every((className) => className.includes("premium-form-scope"))).toBe(true);
    expect(dialogClasses.every((className) => !/bg-(?:slate|gray)-9|bg-\[#(?:0f1117|1a1f2e)\]/.test(className))).toBe(true);
  });

  it("usa dropdowns claros e prioriza colunas essenciais em telas menores", () => {
    expect(profissionais).not.toMatch(/SelectContent className="(?:bg-slate-800|bg-\[#1a1d27\])/);
    expect(profissionais).toContain('className="people-table');
    expect(styles).toContain(".people-select-content");
    expect(styles).toContain(".people-table th:nth-child(2)");
  });
});
