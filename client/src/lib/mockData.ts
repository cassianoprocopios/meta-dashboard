// Mock data extracted from Excel file
export interface DailyData {
  data: string;
  dia_semana: string;
  morumbi: {
    sva_total: number;
    recorrencia: number;
    total: number;
  };
  mascote: {
    sva_total: number;
    recorrencia: number;
    total: number;
  };
  seraphine: {
    sva_total: number;
    recorrencia: number;
    faturamento_total: number;
  };
}

export interface MonthData {
  [key: string]: DailyData[];
}

export const monthlyData: MonthData = {
  JANEIRO: [
    { data: "2024-01-01", dia_semana: "quinta-feira", morumbi: { sva_total: 0, recorrencia: 6129.71, total: 6129.71 }, mascote: { sva_total: 0, recorrencia: 1493.5, total: 1493.5 }, seraphine: { sva_total: 7623.21, recorrencia: 7623.21, faturamento_total: 15246.42 } },
    { data: "2024-01-02", dia_semana: "sexta-feira", morumbi: { sva_total: 0, recorrencia: 3208.98, total: 3208.98 }, mascote: { sva_total: 0, recorrencia: 1659.27, total: 1659.27 }, seraphine: { sva_total: 4868.25, recorrencia: 4868.25, faturamento_total: 9736.5 } },
    { data: "2024-01-03", dia_semana: "sábado", morumbi: { sva_total: 0, recorrencia: 4924.07, total: 4924.07 }, mascote: { sva_total: 0, recorrencia: 1659.27, total: 1659.27 }, seraphine: { sva_total: 6583.34, recorrencia: 6583.34, faturamento_total: 13166.68 } },
    { data: "2024-01-04", dia_semana: "domingo", morumbi: { sva_total: 0, recorrencia: 4302.56, total: 4302.56 }, mascote: { sva_total: 0, recorrencia: 1983.63, total: 1983.63 }, seraphine: { sva_total: 6286.19, recorrencia: 6286.19, faturamento_total: 12572.38 } },
    { data: "2024-01-05", dia_semana: "segunda-feira", morumbi: { sva_total: 0, recorrencia: 5915.82, total: 5915.82 }, mascote: { sva_total: 0, recorrencia: 1360.43, total: 1360.43 }, seraphine: { sva_total: 7276.25, recorrencia: 7276.25, faturamento_total: 14552.5 } },
    { data: "2024-01-06", dia_semana: "terça-feira", morumbi: { sva_total: 3329.91, recorrencia: 9195.58, total: 12525.49 }, mascote: { sva_total: 1979.81, recorrencia: 3265.42, total: 5245.23 }, seraphine: { sva_total: 21256.72, recorrencia: 12461, faturamento_total: 33717.72 } },
    { data: "2024-01-07", dia_semana: "quarta-feira", morumbi: { sva_total: 2676.23, recorrencia: 4314.75, total: 6990.98 }, mascote: { sva_total: 1817.11, recorrencia: 2189.25, total: 4006.36 }, seraphine: { sva_total: 15351.34, recorrencia: 6504, faturamento_total: 21855.34 } },
    { data: "2024-01-08", dia_semana: "quinta-feira", morumbi: { sva_total: 2082.5, recorrencia: 3847.52, total: 5930.02 }, mascote: { sva_total: 1334.14, recorrencia: 1987.98, total: 3322.12 }, seraphine: { sva_total: 14393.14, recorrencia: 5835.5, faturamento_total: 20228.64 } },
    { data: "2024-01-09", dia_semana: "sexta-feira", morumbi: { sva_total: 4925.6, recorrencia: 4837.22, total: 9762.82 }, mascote: { sva_total: 1854.7, recorrencia: 2195.68, total: 4050.38 }, seraphine: { sva_total: 20129.2, recorrencia: 7032.9, faturamento_total: 27162.1 } },
    { data: "2024-01-10", dia_semana: "sábado", morumbi: { sva_total: 3141.33, recorrencia: 5139.59, total: 8280.92 }, mascote: { sva_total: 2167.4, recorrencia: 1409.86, total: 3577.26 }, seraphine: { sva_total: 20763.18, recorrencia: 6549.45, faturamento_total: 27312.63 } },
    { data: "2024-01-11", dia_semana: "domingo", morumbi: { sva_total: 0, recorrencia: 506.6, total: 506.6 }, mascote: { sva_total: 0, recorrencia: 871.23, total: 871.23 }, seraphine: { sva_total: 1377.83, recorrencia: 1377.83, faturamento_total: 2755.66 } },
    { data: "2024-01-12", dia_semana: "segunda-feira", morumbi: { sva_total: 2874.32, recorrencia: 4419.52, total: 7293.84 }, mascote: { sva_total: 806.91, recorrencia: 775.31, total: 1582.22 }, seraphine: { sva_total: 8876.06, recorrencia: 5194.83, faturamento_total: 14070.89 } },
    { data: "2024-01-13", dia_semana: "terça-feira", morumbi: { sva_total: 3013.41, recorrencia: 3254.37, total: 6267.78 }, mascote: { sva_total: 1101.5, recorrencia: 1563.23, total: 2664.73 }, seraphine: { sva_total: 13645.51, recorrencia: 4817.6, faturamento_total: 18463.11 } },
    { data: "2024-01-14", dia_semana: "quarta-feira", morumbi: { sva_total: 2212.2, recorrencia: 2537.24, total: 4749.44 }, mascote: { sva_total: 565, recorrencia: 1819.86, total: 2384.86 }, seraphine: { sva_total: 11707.3, recorrencia: 4357.1, faturamento_total: 16064.4 } },
    { data: "2024-01-15", dia_semana: "quinta-feira", morumbi: { sva_total: 2053.7, recorrencia: 5342.23, total: 7395.93 }, mascote: { sva_total: 829.4, recorrencia: 2020.17, total: 2849.57 }, seraphine: { sva_total: 15449.5, recorrencia: 7362.4, faturamento_total: 22811.9 } },
    { data: "2024-01-16", dia_semana: "sexta-feira", morumbi: { sva_total: 3917.53, recorrencia: 4291.82, total: 8209.35 }, mascote: { sva_total: 1150.61, recorrencia: 1917.48, total: 3068.09 }, seraphine: { sva_total: 17616.44, recorrencia: 6209.3, faturamento_total: 23825.74 } },
    { data: "2024-01-17", dia_semana: "sábado", morumbi: { sva_total: 3932.43, recorrencia: 2961.82, total: 6894.25 }, mascote: { sva_total: 2313.2, recorrencia: 933.28, total: 3246.48 }, seraphine: { sva_total: 19353.73, recorrencia: 3895.1, faturamento_total: 23248.83 } },
    { data: "2024-01-18", dia_semana: "domingo", morumbi: { sva_total: 0, recorrencia: 4100.64, total: 4100.64 }, mascote: { sva_total: 0, recorrencia: 1817.55, total: 1817.55 }, seraphine: { sva_total: 5918.19, recorrencia: 5918.19, faturamento_total: 11836.38 } },
    { data: "2024-01-19", dia_semana: "segunda-feira", morumbi: { sva_total: 1133.41, recorrencia: 3144.15, total: 4277.56 }, mascote: { sva_total: 413.2, recorrencia: 918.75, total: 1331.95 }, seraphine: { sva_total: 5609.51, recorrencia: 4062.9, faturamento_total: 9672.41 } },
    { data: "2024-01-20", dia_semana: "terça-feira", morumbi: { sva_total: 2518.41, recorrencia: 2930.88, total: 5449.29 }, mascote: { sva_total: 1447.2, recorrencia: 1108.22, total: 2555.42 }, seraphine: { sva_total: 10404.71, recorrencia: 4039.1, faturamento_total: 14443.81 } },
    { data: "2024-01-21", dia_semana: "quarta-feira", morumbi: { sva_total: 1462.11, recorrencia: 4030.91, total: 5493.02 }, mascote: { sva_total: 1413.4, recorrencia: 1287.89, total: 2701.29 }, seraphine: { sva_total: 11502.31, recorrencia: 5318.8, faturamento_total: 16821.11 } },
    { data: "2024-01-22", dia_semana: "quinta-feira", morumbi: { sva_total: 2150, recorrencia: 5569.51, total: 7719.51 }, mascote: { sva_total: 943.5, recorrencia: 3049.29, total: 3992.79 }, seraphine: { sva_total: 16505.3, recorrencia: 8618.8, faturamento_total: 25124.1 } },
    { data: "2024-01-23", dia_semana: "sexta-feira", morumbi: { sva_total: 3129.2, recorrencia: 2921.24, total: 6050.44 }, mascote: { sva_total: 2098.47, recorrencia: 1602.76, total: 3701.23 }, seraphine: { sva_total: 15549.67, recorrencia: 4524, faturamento_total: 20073.67 } },
    { data: "2024-01-24", dia_semana: "sábado", morumbi: { sva_total: 3411.31, recorrencia: 5152.35, total: 8563.66 }, mascote: { sva_total: 2090, recorrencia: 1415.55, total: 3505.55 }, seraphine: { sva_total: 18320.21, recorrencia: 6567.9, faturamento_total: 24888.11 } },
    { data: "2024-01-25", dia_semana: "domingo", morumbi: { sva_total: 0, recorrencia: 2362.74, total: 2362.74 }, mascote: { sva_total: 0, recorrencia: 0, total: 0 }, seraphine: { sva_total: 2362.74, recorrencia: 2362.74, faturamento_total: 4725.48 } },
    { data: "2024-01-26", dia_semana: "segunda-feira", morumbi: { sva_total: 2615.81, recorrencia: 4032.4, total: 6648.21 }, mascote: { sva_total: 732.5, recorrencia: 825.3, total: 1557.8 }, seraphine: { sva_total: 8206.01, recorrencia: 4857.7, faturamento_total: 13063.71 } },
    { data: "2024-01-27", dia_semana: "terça-feira", morumbi: { sva_total: 2554.5, recorrencia: 3037.09, total: 5591.59 }, mascote: { sva_total: 653.7, recorrencia: 1643, total: 2296.7 }, seraphine: { sva_total: 10546.29, recorrencia: 4680.09, faturamento_total: 15226.38 } },
    { data: "2024-01-28", dia_semana: "quarta-feira", morumbi: { sva_total: 4570.02, recorrencia: 2692.14, total: 7262.16 }, mascote: { sva_total: 1634.31, recorrencia: 1179.16, total: 2813.47 }, seraphine: { sva_total: 13212.63, recorrencia: 3871.3, faturamento_total: 17083.93 } },
    { data: "2024-01-29", dia_semana: "quinta-feira", morumbi: { sva_total: 3619.4, recorrencia: 3500.95, total: 7120.35 }, mascote: { sva_total: 901.4, recorrencia: 1692.65, total: 2594.05 }, seraphine: { sva_total: 14999.4, recorrencia: 5193.6, faturamento_total: 20193 } },
    { data: "2024-01-30", dia_semana: "sexta-feira", morumbi: { sva_total: 4069.53, recorrencia: 248.19, total: 4317.72 }, mascote: { sva_total: 1800.5, recorrencia: 88.81, total: 1889.31 }, seraphine: { sva_total: 14623.03, recorrencia: 337, faturamento_total: 14960.03 } },
    { data: "2024-01-31", dia_semana: "sábado", morumbi: { sva_total: 4823.73, recorrencia: 4379.03, total: 9202.76 }, mascote: { sva_total: 1994.03, recorrencia: 1955.97, total: 3950 }, seraphine: { sva_total: 19025.74, recorrencia: 6335, faturamento_total: 25360.74 } },
  ],
  FEVEREIRO: [
    { data: "2024-02-01", dia_semana: "domingo", morumbi: { sva_total: 0, recorrencia: 6129.71, total: 6129.71 }, mascote: { sva_total: 0, recorrencia: 1493.5, total: 1493.5 }, seraphine: { sva_total: 7623.21, recorrencia: 7623.21, faturamento_total: 15246.42 } },
    { data: "2024-02-02", dia_semana: "segunda-feira", morumbi: { sva_total: 1273, recorrencia: 3208.98, total: 4481.98 }, mascote: { sva_total: 623.81, recorrencia: 1329.05, total: 1952.86 }, seraphine: { sva_total: 6344.93, recorrencia: 4538.03, faturamento_total: 10882.96 } },
    { data: "2024-02-03", dia_semana: "terça-feira", morumbi: { sva_total: 2084, recorrencia: 3579.8, total: 5663.8 }, mascote: { sva_total: 960, recorrencia: 1659.27, total: 2619.27 }, seraphine: { sva_total: 10876.04, recorrencia: 5239.07, faturamento_total: 16115.11 } },
    { data: "2024-02-04", dia_semana: "quarta-feira", morumbi: { sva_total: 2875.15, recorrencia: 4022.65, total: 6897.8 }, mascote: { sva_total: 2002.34, recorrencia: 1983.63, total: 3985.97 }, seraphine: { sva_total: 15159.48, recorrencia: 6006.28, faturamento_total: 21165.76 } },
    { data: "2024-02-05", dia_semana: "quinta-feira", morumbi: { sva_total: 2738, recorrencia: 4209.9, total: 6947.9 }, mascote: { sva_total: 1404.5, recorrencia: 1782.8, total: 3187.3 }, seraphine: { sva_total: 15675.11, recorrencia: 5992.7, faturamento_total: 21667.81 } },
    { data: "2024-02-06", dia_semana: "sexta-feira", morumbi: { sva_total: 3913.11, recorrencia: 7882.74, total: 11795.85 }, mascote: { sva_total: 2418.9, recorrencia: 2380.91, total: 4799.81 }, seraphine: { sva_total: 25856.61, recorrencia: 10263.65, faturamento_total: 36120.26 } },
    { data: "2024-02-07", dia_semana: "sábado", morumbi: { sva_total: 3928.46, recorrencia: 4166.3, total: 8094.76 }, mascote: { sva_total: 2117.53, recorrencia: 1288.3, total: 3405.83 }, seraphine: { sva_total: 23866.52, recorrencia: 5454.6, faturamento_total: 29321.12 } },
    { data: "2024-02-08", dia_semana: "domingo", morumbi: { sva_total: 0, recorrencia: 3847.52, total: 3847.52 }, mascote: { sva_total: 0, recorrencia: 1988, total: 1988 }, seraphine: { sva_total: 5835.52, recorrencia: 5835.52, faturamento_total: 11671.04 } },
    { data: "2024-02-09", dia_semana: "segunda-feira", morumbi: { sva_total: 1309.53, recorrencia: 5229.51, total: 6539.04 }, mascote: { sva_total: 769.32, recorrencia: 2195.68, total: 2965 }, seraphine: { sva_total: 9507.12, recorrencia: 7425.19, faturamento_total: 16932.31 } },
    { data: "2024-02-10", dia_semana: "terça-feira", morumbi: { sva_total: 4314.73, recorrencia: 3699.65, total: 8014.38 }, mascote: { sva_total: 1098.31, recorrencia: 2568.35, total: 3666.66 }, seraphine: { sva_total: 14128.2, recorrencia: 6268, faturamento_total: 20396.2 } },
    { data: "2024-02-11", dia_semana: "quarta-feira", morumbi: { sva_total: 2875.82, recorrencia: 2944.24, total: 5820.06 }, mascote: { sva_total: 733.9, recorrencia: 1032.96, total: 1766.86 }, seraphine: { sva_total: 12470.99, recorrencia: 3977.2, faturamento_total: 16448.19 } },
    { data: "2024-02-12", dia_semana: "quinta-feira", morumbi: { sva_total: 3848, recorrencia: 4335.93, total: 8183.93 }, mascote: { sva_total: 1687.61, recorrencia: 1966.87, total: 3654.48 }, seraphine: { sva_total: 17033.29, recorrencia: 6302.8, faturamento_total: 23336.09 } },
    { data: "2024-02-13", dia_semana: "sexta-feira", morumbi: { sva_total: 3744.91, recorrencia: 4592.85, total: 8337.76 }, mascote: { sva_total: 1896.4, recorrencia: 1167.34, total: 3063.74 }, seraphine: { sva_total: 20238, recorrencia: 5760.19, faturamento_total: 25998.19 } },
    { data: "2024-02-14", dia_semana: "sábado", morumbi: { sva_total: 3741.91, recorrencia: 3378.66, total: 7120.57 }, mascote: { sva_total: 1729.01, recorrencia: 1182.83, total: 2911.84 }, seraphine: { sva_total: 17675.77, recorrencia: 4561.49, faturamento_total: 22237.26 } },
    { data: "2024-02-15", dia_semana: "domingo", morumbi: { sva_total: 0, recorrencia: 3278, total: 3278 }, mascote: { sva_total: 0, recorrencia: 819, total: 819 }, seraphine: { sva_total: 4097, recorrencia: 4097, faturamento_total: 8194 } },
    { data: "2024-02-16", dia_semana: "segunda-feira", morumbi: { sva_total: 0, recorrencia: 4291.82, total: 4291.82 }, mascote: { sva_total: 0, recorrencia: 1917.48, total: 1917.48 }, seraphine: { sva_total: 6209.3, recorrencia: 6209.3, faturamento_total: 12418.6 } },
    { data: "2024-02-17", dia_semana: "terça-feira", morumbi: { sva_total: 0, recorrencia: 2961.82, total: 2961.82 }, mascote: { sva_total: 0, recorrencia: 933.28, total: 933.28 }, seraphine: { sva_total: 3895.1, recorrencia: 3895.1, faturamento_total: 7790.2 } },
    { data: "2024-02-18", dia_semana: "quarta-feira", morumbi: { sva_total: 3252.31, recorrencia: 4100.64, total: 7352.95 }, mascote: { sva_total: 2300.42, recorrencia: 2605.53, total: 4905.95 }, seraphine: { sva_total: 16760.07, recorrencia: 6706.17, faturamento_total: 23466.24 } },
    { data: "2024-02-19", dia_semana: "quinta-feira", morumbi: { sva_total: 4796.91, recorrencia: 4309.68, total: 9106.59 }, mascote: { sva_total: 1243.41, recorrencia: 1837.42, total: 3080.83 }, seraphine: { sva_total: 16553.15, recorrencia: 6147.1, faturamento_total: 22700.25 } },
    { data: "2024-02-20", dia_semana: "sexta-feira", morumbi: { sva_total: 3438.3, recorrencia: 4648.99, total: 8087.29 }, mascote: { sva_total: 2096.62, recorrencia: 1826.9, total: 3923.52 }, seraphine: { sva_total: 16669.77, recorrencia: 6475.89, faturamento_total: 23145.66 } },
    { data: "2024-02-21", dia_semana: "sábado", morumbi: { sva_total: 3660.4, recorrencia: 4042.56, total: 7702.96 }, mascote: { sva_total: 2349.2, recorrencia: 1315.24, total: 3664.44 }, seraphine: { sva_total: 20236.18, recorrencia: 5357.8, faturamento_total: 25593.98 } },
    { data: "2024-02-22", dia_semana: "domingo", morumbi: { sva_total: 0, recorrencia: 5569.51, total: 5569.51 }, mascote: { sva_total: 0, recorrencia: 3049.29, total: 3049.29 }, seraphine: { sva_total: 8618.8, recorrencia: 8618.8, faturamento_total: 17237.6 } },
    { data: "2024-02-23", dia_semana: "segunda-feira", morumbi: { sva_total: 1631.91, recorrencia: 4174.84, total: 5806.75 }, mascote: { sva_total: 740.7, recorrencia: 973.86, total: 1714.56 }, seraphine: { sva_total: 7521.31, recorrencia: 3086.31, faturamento_total: 10607.62 } },
    { data: "2024-02-24", dia_semana: "terça-feira", morumbi: { sva_total: 3280.5, recorrencia: 3930.41, total: 7210.91 }, mascote: { sva_total: 1450.5, recorrencia: 1710.14, total: 3160.64 }, seraphine: { sva_total: 14332.41, recorrencia: 5654.81, faturamento_total: 19987.22 } },
    { data: "2024-02-25", dia_semana: "quarta-feira", morumbi: { sva_total: 2950.2, recorrencia: 3850.75, total: 6800.95 }, mascote: { sva_total: 1200.3, recorrencia: 1450.2, total: 2650.5 }, seraphine: { sva_total: 13500.5, recorrencia: 5200.3, faturamento_total: 18700.8 } },
    { data: "2024-02-26", dia_semana: "quinta-feira", morumbi: { sva_total: 3450.6, recorrencia: 4100.4, total: 7551 }, mascote: { sva_total: 1350.4, recorrencia: 1600.5, total: 2950.9 }, seraphine: { sva_total: 15200.8, recorrencia: 5800.2, faturamento_total: 21001 } },
    { data: "2024-02-27", dia_semana: "sexta-feira", morumbi: { sva_total: 3800.5, recorrencia: 4350.2, total: 8150.7 }, mascote: { sva_total: 1550.3, recorrencia: 1750.4, total: 3300.7 }, seraphine: { sva_total: 16800.5, recorrencia: 6200.5, faturamento_total: 23001 } },
    { data: "2024-02-28", dia_semana: "sábado", morumbi: { sva_total: 3460.63, recorrencia: 9816.88, total: 13277.51 }, mascote: { sva_total: 1602.6, recorrencia: 3736.36, total: 5338.96 }, seraphine: { sva_total: 26122.39, recorrencia: 13553.24, faturamento_total: 39675.63 } },
  ],
};

// Calculate statistics
export const calculateStats = (data: DailyData[]) => {
  const morumbiTotal = data.reduce((sum, d) => sum + d.morumbi.total, 0);
  const mascoteTotal = data.reduce((sum, d) => sum + d.mascote.total, 0);
  const seraphineTotal = data.reduce((sum, d) => sum + d.seraphine.faturamento_total, 0);
  
  const days = data.length;
  
  return {
    morumbi: {
      total: morumbiTotal,
      average: morumbiTotal / days,
      max: Math.max(...data.map(d => d.morumbi.total)),
      min: Math.min(...data.map(d => d.morumbi.total)),
    },
    mascote: {
      total: mascoteTotal,
      average: mascoteTotal / days,
      max: Math.max(...data.map(d => d.mascote.total)),
      min: Math.min(...data.map(d => d.mascote.total)),
    },
    seraphine: {
      total: seraphineTotal,
      average: seraphineTotal / days,
      max: Math.max(...data.map(d => d.seraphine.faturamento_total)),
      min: Math.min(...data.map(d => d.seraphine.faturamento_total)),
    },
    grandTotal: morumbiTotal + mascoteTotal + seraphineTotal,
  };
};
