import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import DashboardPerformanceProfissionais from "@/components/DashboardPerformanceProfissionais";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Building2, DollarSign, Target, TrendingUp, ArrowLeft, Users, CalendarDays } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const nomes: Record<string,string> = { MORUMBI:"Morumbi", MASCOTE:"Mascote", SERAPHINE:"Lephyne" };
const meses=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const money=(v:number)=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});

export default function DashboardGerencial(){
 const anoAtual=new Date().getFullYear();
 const [ano,setAno]=useState(anoAtual);
 const [unidade,setUnidade]=useState<string|null>(null);
 const {data,isLoading}=trpc.meta.historicoAnual.useQuery({ano});
 const hoje=new Date();
 const dataInicio=`${ano}-01-01`;
 const dataFim=ano===anoAtual?hoje.toISOString().split("T")[0]:`${ano}-12-31`;

 const resumo=useMemo(()=>{
  if(!data) return [];
  const slugs=Array.from(new Set((data.faturamentos??[]).map((f:any)=>f.empresaSlug))) as string[];
  return slugs.map(slug=>{
   const fats=(data.faturamentos??[]).filter((f:any)=>{
    const [a,m,d]=f.data.split("-").map(Number);
    return f.empresaSlug===slug && a===ano && (ano<anoAtual || new Date(a,m-1,d)<=hoje);
   });
   const faturamento=fats.reduce((s:number,f:any)=>s+[f.cat1,f.cat2,f.cat3,f.cat4,f.cat5,f.cat6,f.cat7,f.cat8,f.cat9].reduce((x:number,v:any)=>x+parseFloat(v||"0"),0),0);
   const metas=(data.metas??[]).filter((m:any)=>m.empresaSlug===slug && m.ano===ano);
   const meta=metas.reduce((s:number,m:any)=>s+parseFloat(m.metaMensal||"0"),0);
   const mensal=meses.map((mes,idx)=>{
    const valor=fats.filter((f:any)=>Number(f.data.split("-")[1])===idx+1).reduce((s:number,f:any)=>s+[f.cat1,f.cat2,f.cat3,f.cat4,f.cat5,f.cat6,f.cat7,f.cat8,f.cat9].reduce((x:number,v:any)=>x+parseFloat(v||"0"),0),0);
    return {mes,valor};
   });
   return {slug,nome:nomes[slug]??slug,faturamento,meta,atingimento:meta?faturamento/meta*100:0,mensal};
  }).sort((a,b)=>b.faturamento-a.faturamento);
 },[data,ano,anoAtual]);

 const total=resumo.reduce((s,r)=>s+r.faturamento,0);
 const metaTotal=resumo.reduce((s,r)=>s+r.meta,0);
 const selecionada=resumo.find(r=>r.slug===unidade);
 const chartGeral=meses.map((mes,idx)=>({mes,total:resumo.reduce((s,r)=>s+r.mensal[idx].valor,0)}));
 const chart=selecionada?.mensal.map(m=>({mes:m.mes,total:m.valor}))??chartGeral;

 return <DashboardLayout><div className="mx-auto max-w-7xl space-y-6">
  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
   <div>{unidade&&<Button variant="ghost" className="mb-2 px-0" onClick={()=>setUnidade(null)}><ArrowLeft className="mr-2 h-4 w-4"/>Voltar ao grupo</Button>}<p className="text-sm font-medium text-blue-600">{selecionada?"Visão da unidade":"Visão executiva"}</p><h1 className="text-3xl font-bold tracking-[-0.04em] text-[#12233f]">{selecionada?selecionada.nome:"Dashboard Gerencial"}</h1><p className="mt-2 text-slate-500">{selecionada?"Indicadores acumulados e profissionais da unidade.":"Consolidado do grupo e visão individual por unidade."}</p></div>
   <select value={ano} onChange={e=>setAno(Number(e.target.value))} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"><option>{anoAtual}</option><option>{anoAtual-1}</option><option>{anoAtual-2}</option></select>
  </div>
  {isLoading?<Card className="premium-panel p-8 text-slate-500">Carregando consolidado...</Card>:<>
   <div className="grid gap-4 md:grid-cols-3">
    <Card className="premium-panel p-5"><DollarSign className="mb-3 h-5 w-5 text-blue-600"/><p className="text-sm text-slate-500">Faturamento acumulado</p><p className="mt-1 text-2xl font-bold text-[#12233f]">{money(selecionada?.faturamento??total)}</p></Card>
    <Card className="premium-panel p-5"><Target className="mb-3 h-5 w-5 text-blue-600"/><p className="text-sm text-slate-500">Meta acumulada</p><p className="mt-1 text-2xl font-bold text-[#12233f]">{money(selecionada?.meta??metaTotal)}</p></Card>
    <Card className="premium-panel p-5"><TrendingUp className="mb-3 h-5 w-5 text-blue-600"/><p className="text-sm text-slate-500">Atingimento</p><p className="mt-1 text-2xl font-bold text-[#12233f]">{(selecionada?.atingimento??(metaTotal?total/metaTotal*100:0)).toFixed(1)}%</p></Card>
   </div>

   <Card className="premium-panel p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-bold text-[#12233f]">Evolução mensal</h2><p className="text-sm text-slate-500">{selecionada?selecionada.nome:"Todas as unidades"} · {ano}</p></div><CalendarDays className="h-5 w-5 text-blue-600"/></div><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="mes"/><YAxis tickFormatter={(v)=>`${Math.round(v/1000)}k`}/><Tooltip formatter={(v:number)=>money(v)}/><Bar dataKey="total" name="Faturamento" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div></Card>

   {!selecionada?<div className="grid gap-4 lg:grid-cols-3">{resumo.map(r=><button key={r.slug} className="text-left" onClick={()=>setUnidade(r.slug)}><Card className="premium-panel h-full p-6 transition hover:-translate-y-0.5 hover:shadow-md">
    <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Unidade</p><h2 className="text-xl font-bold text-[#12233f]">{r.nome}</h2></div><Building2 className="h-6 w-6 text-blue-600"/></div>
    <div className="space-y-3"><div className="flex justify-between"><span className="text-slate-500">Faturamento</span><strong>{money(r.faturamento)}</strong></div><div className="flex justify-between"><span className="text-slate-500">Meta</span><strong>{money(r.meta)}</strong></div><div className="flex justify-between"><span className="text-slate-500">Atingimento</span><strong>{r.atingimento.toFixed(1)}%</strong></div></div>
    <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{width:`${Math.min(r.atingimento,100)}%`}}/></div><p className="mt-4 text-sm font-medium text-blue-600">Abrir unidade →</p>
   </Card></button>)}</div>:<>
    <div className="flex items-center gap-2"><Users className="h-5 w-5 text-blue-600"/><h2 className="text-xl font-bold text-[#12233f]">Profissionais · {selecionada.nome}</h2></div>
    <DashboardPerformanceProfissionais empresaSlug={selecionada.slug} dataInicio={dataInicio} dataFim={dataFim}/>
   </>}
  </>}
 </div></DashboardLayout>
}