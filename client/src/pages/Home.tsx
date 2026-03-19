import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, TrendingUp, Target, DollarSign } from "lucide-react";
import { monthlyData, calculateStats, DailyData } from "@/lib/mockData";
import MetricCard from "@/components/MetricCard";
import ProgressIndicator from "@/components/ProgressIndicator";
import BarChartComponent from "@/components/BarChartComponent";
import PieChartComponent from "@/components/PieChartComponent";
import AlertsList from "@/components/AlertsList";
import DailyTargetConfig from "@/components/DailyTargetConfig";

/**
 * Design Philosophy: Minimalista com Gradientes Suaves
 * - Cores: Azul suave (primário), tons neutros, acentos em verde/laranja
 * - Tipografia: Poppins para títulos, Inter para corpo
 * - Espaçamento: Amplo e deliberado
 * - Sombras: Suaves e sutis
 */

export default function Home() {
  const [selectedMonth, setSelectedMonth] = useState("JANEIRO");
  const [dailyTarget, setDailyTarget] = useState(6500);
  
  const currentData = monthlyData[selectedMonth];
  const stats = useMemo(() => calculateStats(currentData), [currentData]);
  
  // Calculate today's progress (using first day as example)
  const todayData = currentData[0];
  const todayTotal = todayData.morumbi.total + todayData.mascote.total + todayData.seraphine.faturamento_total;
  const progressPercent = (todayTotal / dailyTarget) * 100;
  
  // Generate alerts
  const generateAlerts = (): Array<{ id: number; type: "warning" | "success" | "info"; title: string; message: string }> => {
    const alerts: Array<{ id: number; type: "warning" | "success" | "info"; title: string; message: string }> = [];
    
    // Check if below target
    if (stats.morumbi.average < dailyTarget * 0.3) {
      alerts.push({
        id: 1,
        type: "warning",
        title: "Morumbi abaixo da meta",
        message: `Média diária: R$ ${stats.morumbi.average.toFixed(2)}`,
      });
    }
    
    if (stats.mascote.average < dailyTarget * 0.15) {
      alerts.push({
        id: 2,
        type: "warning",
        title: "Mascote abaixo da meta",
        message: `Média diária: R$ ${stats.mascote.average.toFixed(2)}`,
      });
    }
    
    if (stats.seraphine.average > dailyTarget * 1.2) {
      alerts.push({
        id: 3,
        type: "success",
        title: "Seraphine acima da meta",
        message: `Média diária: R$ ${stats.seraphine.average.toFixed(2)}`,
      });
    }
    
    return alerts;
  };
  
  const alerts: Array<{ id: number; type: "warning" | "success" | "info"; title: string; message: string }> = generateAlerts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Meta Dashboard</h1>
              <p className="text-sm text-slate-500 mt-1">Gestão de Metas Mensais</p>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {/* Month Selector */}
        <div className="mb-8">
          <Tabs value={selectedMonth} onValueChange={setSelectedMonth} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-white border border-slate-200">
              <TabsTrigger value="JANEIRO" className="data-[state=active]:bg-blue-100">
                Janeiro
              </TabsTrigger>
              <TabsTrigger value="FEVEREIRO" className="data-[state=active]:bg-blue-100">
                Fevereiro
              </TabsTrigger>
              <TabsTrigger value="MARÇO" className="data-[state=active]:bg-blue-100">
                Março
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Daily Target Configuration */}
        <div className="mb-8">
          <DailyTargetConfig value={dailyTarget} onChange={setDailyTarget} />
        </div>

        {/* Today's Progress */}
        <div className="mb-8">
          <ProgressIndicator 
            title="Progresso de Hoje"
            current={todayTotal}
            target={dailyTarget}
            percent={progressPercent}
          />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Morumbi"
            value={stats.morumbi.total}
            average={stats.morumbi.average}
            max={stats.morumbi.max}
            min={stats.morumbi.min}
            color="from-blue-500 to-blue-600"
          />
          <MetricCard
            title="Mascote"
            value={stats.mascote.total}
            average={stats.mascote.average}
            max={stats.mascote.max}
            min={stats.mascote.min}
            color="from-purple-500 to-purple-600"
          />
          <MetricCard
            title="Seraphine"
            value={stats.seraphine.total}
            average={stats.seraphine.average}
            max={stats.seraphine.max}
            min={stats.seraphine.min}
            color="from-emerald-500 to-emerald-600"
          />
          <MetricCard
            title="Total Geral"
            value={stats.grandTotal}
            average={(stats.morumbi.average + stats.mascote.average + stats.seraphine.average)}
            max={stats.morumbi.max + stats.mascote.max + stats.seraphine.max}
            min={stats.morumbi.min + stats.mascote.min + stats.seraphine.min}
            color="from-slate-600 to-slate-700"
            highlight
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Bar Chart */}
          <div className="lg:col-span-2">
            <Card className="p-6 border-slate-200/50 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-lg font-semibold text-slate-900 mb-6">
                Faturamento por Empresa
              </h2>
              <BarChartComponent data={stats} />
            </Card>
          </div>

          {/* Pie Chart */}
          <div>
            <Card className="p-6 border-slate-200/50 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-lg font-semibold text-slate-900 mb-6">
                Composição do Faturamento
              </h2>
              <PieChartComponent data={stats} />
            </Card>
          </div>
        </div>

        {/* Alerts Section */}
        <div className="mb-8">
          <AlertsList alerts={alerts} />
        </div>

        {/* Daily Data Table */}
        <Card className="p-6 border-slate-200/50 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">
            Dados Diários - {selectedMonth}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Data</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Dia</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700">Morumbi</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700">Mascote</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700">Seraphine</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {currentData.slice(0, 10).map((day: DailyData, idx: number) => {
                  const total = day.morumbi.total + day.mascote.total + day.seraphine.faturamento_total;
                  return (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-slate-900">{day.data}</td>
                      <td className="py-3 px-4 text-slate-600">{day.dia_semana}</td>
                      <td className="py-3 px-4 text-right text-blue-600 font-medium">
                        R$ {day.morumbi.total.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-purple-600 font-medium">
                        R$ {day.mascote.total.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-600 font-medium">
                        R$ {day.seraphine.faturamento_total.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-900 font-semibold">
                        R$ {total.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}
