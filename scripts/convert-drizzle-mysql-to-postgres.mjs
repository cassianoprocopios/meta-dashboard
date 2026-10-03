#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const valueOf = (name, fallback) => {
  const prefix = `${name}=`;
  const item = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return item ? item.slice(prefix.length) : fallback;
};

const input = valueOf("--input", "drizzle/schema.ts");
const output = valueOf("--output", "drizzle/schema.pg.ts");
const reportPath = valueOf("--report", "drizzle/schema.pg.report.json");
const force = args.has("--force");

if (!fs.existsSync(input)) {
  console.error(`Arquivo de entrada não encontrado: ${input}`);
  process.exit(1);
}
if (fs.existsSync(output) && !force) {
  console.error(`Arquivo de saída já existe: ${output}. Use --force para substituir.`);
  process.exit(1);
}

const source = fs.readFileSync(input, "utf8");
const lines = source.split("\n");
const enumDeclarations = new Map();
const warnings = [];
const tables = [];
let currentTable = null;

const cap = (value) => value.charAt(0).toUpperCase() + value.slice(1);
const identifier = (value) => value.replace(/[^A-Za-z0-9_$]/g, "_");
const enumIdentifier = (table, column) =>
  `${identifier(table)}${cap(identifier(column))}Enum`;

function parseEnumValues(body) {
  return [...body.matchAll(/['\"]([^'\"]*)['\"]/g)].map((match) => match[1]);
}

function registerEnum(table, column, values) {
  const name = enumIdentifier(table, column);
  const key = `${table}.${column}`;
  const existing = enumDeclarations.get(key);
  if (existing && JSON.stringify(existing.values) !== JSON.stringify(values)) {
    warnings.push({
      type: "enum-conflict",
      location: key,
      message: "O mesmo enum lógico foi encontrado com valores diferentes; revise manualmente.",
      values,
      previousValues: existing.values,
    });
  } else if (!existing) {
    enumDeclarations.set(key, { name, table, column, values });
  }
  return name;
}

let transformed = lines.map((line, lineNumber) => {
  const tableMatch = line.match(/^export const (\w+) = mysqlTable\("([^"]+)"/);
  if (tableMatch) {
    currentTable = { identifier: tableMatch[1], name: tableMatch[2] };
    tables.push(currentTable.name);
  }

  let next = line;
  next = next.replace(/from "drizzle-orm\/mysql-core"/, 'from "drizzle-orm/pg-core"');
  next = next.replace(/\bmysqlTable\b/g, "pgTable");
  next = next.replace(/\bmysqlEnum\b/g, "pgEnum");
  next = next.replace(/\bint\b/g, "integer");
  next = next.replace(/\btinyint\b/g, "smallint");
  next = next.replace(/\.autoincrement\(\)/g, ".generatedAlwaysAsIdentity()");

  const enumPattern = /pgEnum\("([^"]+)",\s*\[([^\]]*)\]\)/g;
  next = next.replace(enumPattern, (_whole, column, body) => {
    if (!currentTable) {
      warnings.push({ type: "enum-without-table", line: lineNumber + 1, column });
      return `pgEnum("${column}", [${body}])`;
    }
    const values = parseEnumValues(body);
    const name = registerEnum(currentTable.name, column, values);
    return `${name}("${column}")`;
  });

  if (next.includes(".onUpdateNow()")) {
    warnings.push({
      type: "on-update-now",
      line: lineNumber + 1,
      table: currentTable?.name ?? null,
      message: "Removido no arquivo convertido; atualize updatedAt explicitamente na aplicação ou use trigger PostgreSQL.",
    });
    next = next.replace(/\.onUpdateNow\(\)/g, "");
  }

  if (currentTable && /^\s*\}\);/.test(next)) currentTable = null;
  return next;
});

const importLine = transformed.findIndex((line) => line.includes('from "drizzle-orm/pg-core"'));
const declarations = [...enumDeclarations.values()].map(({ name, table, column, values }) =>
  `export const ${name} = pgEnum("${table}_${column}", ${JSON.stringify(values)});`,
);
if (declarations.length) transformed.splice(importLine + 1, 0, "", "// PostgreSQL enum types generated from the former MySQL inline enums", ...declarations, "");

const converted = transformed.join("\n");
const unsupported = [];
if (/mysql-core|mysqlTable|mysqlEnum|\.autoincrement\(|\.onUpdateNow\(/.test(converted)) {
  unsupported.push("O arquivo convertido ainda contém tokens MySQL conhecidos.");
}
if (/\bmysql2\b|drizzle-orm\/mysql2/.test(source)) {
  unsupported.push("O runtime ainda usa mysql2; converta server/db.ts e demais acessos antes do deploy.");
}

const report = {
  input,
  output,
  generatedAt: new Date().toISOString(),
  tables: [...new Set(tables)],
  enums: [...enumDeclarations.values()],
  warnings,
  unsupported,
  manualReview: [
    "Revisar consultas SQL MySQL em server/routers.ts, server/avecRouter.ts e demais arquivos.",
    "Revisar insertId/onDuplicateKeyUpdate e substituí-los por returning/onConflictDoUpdate.",
    "Revisar datas e funções YEAR/STR_TO_DATE para PostgreSQL.",
    "Validar dados exportados antes de importar em PostgreSQL.",
  ],
};

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(output, converted);
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Schema PostgreSQL criado: ${output}`);
console.log(`Relatório criado: ${reportPath}`);
console.log(`Tabelas: ${report.tables.length}; enums: ${report.enums.length}; avisos: ${report.warnings.length}`);
if (unsupported.length) {
  console.error("Há pendências obrigatórias. Consulte o relatório antes de usar o schema.");
  process.exitCode = 2;
}
