import { PDFDocument, PDFPage, rgb } from "pdf-lib";
import ExcelJS from "exceljs";

interface RelatorioAtendimentos {
  periodo: {
    inicio: string;
    fim: string;
  };
  unidade: string;
  profissional?: string;
  totalClientes: number;
  totalAtendimentos: number;
  ticketMedio: number;
  atendimentos: Array<{
    data: string;
    profissional: string;
    cliente: string;
    servico: string;
    valor: number;
    duracao: number;
  }>;
}

/**
 * Gera PDF do relatório de atendimentos
 */
export async function gerarPDFRelatorio(
  relatorio: RelatorioAtendimentos
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595, 842]); // A4
  const { height } = page.getSize();
  let yPosition = height - 50;

  const drawText = (text: string, x: number, y: number, size: number = 12) => {
    page.drawText(text, {
      x,
      y,
      size,
      color: rgb(0, 0, 0),
    });
  };

  // Cabeçalho
  drawText("RELATÓRIO DE ATENDIMENTOS", 50, yPosition, 16);
  yPosition -= 30;

  drawText(`Unidade: ${relatorio.unidade}`, 50, yPosition, 11);
  yPosition -= 20;

  drawText(
    `Período: ${relatorio.periodo.inicio} a ${relatorio.periodo.fim}`,
    50,
    yPosition,
    11
  );
  yPosition -= 20;

  if (relatorio.profissional) {
    drawText(`Profissional: ${relatorio.profissional}`, 50, yPosition, 11);
    yPosition -= 20;
  }

  // Resumo
  yPosition -= 10;
  drawText("RESUMO", 50, yPosition, 12);
  yPosition -= 15;

  drawText(`Total de Clientes: ${relatorio.totalClientes}`, 50, yPosition, 10);
  yPosition -= 15;

  drawText(`Total de Atendimentos: ${relatorio.totalAtendimentos}`, 50, yPosition, 10);
  yPosition -= 15;

  drawText(
    `Ticket Médio: R$ ${relatorio.ticketMedio.toFixed(2)}`,
    50,
    yPosition,
    10
  );
  yPosition -= 25;

  // Tabela de atendimentos
  drawText("DETALHES DOS ATENDIMENTOS", 50, yPosition, 12);
  yPosition -= 15;

  // Cabeçalho da tabela
  const colX = [50, 120, 200, 280, 380, 480];
  const colLabels = ["Data", "Profissional", "Cliente", "Serviço", "Valor", "Duração"];

  colLabels.forEach((label, i) => {
    drawText(label, colX[i], yPosition, 9);
  });

  yPosition -= 12;

  // Linhas da tabela
  relatorio.atendimentos.forEach((att) => {
    if (yPosition < 50) {
      page = pdfDoc.addPage([595, 842]);
      yPosition = 800;
    }

    drawText(att.data, colX[0], yPosition, 8);
    drawText(att.profissional, colX[1], yPosition, 8);
    drawText(att.cliente.substring(0, 15), colX[2], yPosition, 8);
    drawText(att.servico.substring(0, 15), colX[3], yPosition, 8);
    drawText(`R$ ${att.valor.toFixed(2)}`, colX[4], yPosition, 8);
    drawText(`${att.duracao}min`, colX[5], yPosition, 8);

    yPosition -= 12;
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Gera Excel do relatório de atendimentos
 */
export async function gerarExcelRelatorio(
  relatorio: RelatorioAtendimentos
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Atendimentos");

  // Estilo de cabeçalho
  const headerStyle = {
    fill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF4472C4" } },
    font: { bold: true, color: { argb: "FFFFFFFF" }, size: 11 },
    alignment: { horizontal: "center" as const, vertical: "center" as const },
    border: {
      top: { style: "thin" as const },
      left: { style: "thin" as const },
      bottom: { style: "thin" as const },
      right: { style: "thin" as const },
    },
  };

  // Informações do relatório
  worksheet.addRow([`RELATÓRIO DE ATENDIMENTOS - ${relatorio.unidade}`]);
  worksheet.addRow([
    `Período: ${relatorio.periodo.inicio} a ${relatorio.periodo.fim}`,
  ]);
  if (relatorio.profissional) {
    worksheet.addRow([`Profissional: ${relatorio.profissional}`]);
  }
  worksheet.addRow([]);

  // Resumo
  worksheet.addRow(["RESUMO"]);
  worksheet.addRow([`Total de Clientes:`, relatorio.totalClientes]);
  worksheet.addRow([`Total de Atendimentos:`, relatorio.totalAtendimentos]);
  worksheet.addRow([`Ticket Médio:`, `R$ ${relatorio.ticketMedio.toFixed(2)}`]);
  worksheet.addRow([]);

  // Cabeçalho da tabela
  const headerRow = worksheet.addRow([
    "Data",
    "Profissional",
    "Cliente",
    "Serviço",
    "Valor",
    "Duração (min)",
  ]);

  headerRow.eachCell((cell: any) => {
    Object.assign(cell, headerStyle);
  });

  // Dados
  relatorio.atendimentos.forEach((att) => {
    worksheet.addRow([
      att.data,
      att.profissional,
      att.cliente,
      att.servico,
      att.valor,
      att.duracao,
    ]);
  });

  // Ajustar largura das colunas
  worksheet.columns = [
    { width: 12 },
    { width: 18 },
    { width: 20 },
    { width: 20 },
    { width: 12 },
    { width: 15 },
  ];

  // Formatar coluna de valor como moeda
  const colE = worksheet.getColumn("E");
  if (colE) colE.numFmt = '"R$ "#,##0.00';

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as any);
}

/**
 * Gera relatório consolidado por profissional
 */
export async function gerarRelatorioConsolidadoProfissional(
  unidade: string,
  dataInicio: string,
  dataFim: string,
  atendimentos: Array<{
    profissional: string;
    cliente: string;
    servico: string;
    valor: number;
    duracao: number;
    data: string;
  }>
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Consolidado");

  // Agrupar por profissional
  const porProfissional = new Map<
    string,
    {
      atendimentos: number;
      clientes: Set<string>;
      totalValor: number;
      duracao: number;
    }
  >();

  atendimentos.forEach((att) => {
    if (!porProfissional.has(att.profissional)) {
      porProfissional.set(att.profissional, {
        atendimentos: 0,
        clientes: new Set(),
        totalValor: 0,
        duracao: 0,
      });
    }

    const prof = porProfissional.get(att.profissional)!;
    prof.atendimentos++;
    prof.clientes.add(att.cliente);
    prof.totalValor += att.valor;
    prof.duracao += att.duracao;
  });

  // Cabeçalho
  worksheet.addRow([`RELATÓRIO CONSOLIDADO - ${unidade}`]);
  worksheet.addRow([`Período: ${dataInicio} a ${dataFim}`]);
  worksheet.addRow([]);

  // Tabela
  const headerRow = worksheet.addRow([
    "Profissional",
    "Atendimentos",
    "Clientes Únicos",
    "Total (R$)",
    "Duração Total (min)",
    "Ticket Médio (R$)",
  ]);

  headerRow.eachCell((cell: any) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  });

  // Dados ordenados por valor total
  const profissionais = Array.from(porProfissional.entries())
    .sort((a, b) => b[1].totalValor - a[1].totalValor);

  profissionais.forEach(([nome, dados]) => {
    worksheet.addRow([
      nome,
      dados.atendimentos,
      dados.clientes.size,
      dados.totalValor,
      dados.duracao,
      dados.totalValor / dados.atendimentos,
    ]);
  });

  worksheet.columns = [
    { width: 20 },
    { width: 15 },
    { width: 18 },
    { width: 15 },
    { width: 20 },
    { width: 18 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as any);
}
