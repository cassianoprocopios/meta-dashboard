import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Building2, DollarSign, Target, TrendingUp } from "lucide-react";

const nomes: Record<string,string> = { MORUMBI:"Morumbi", MASCOTE:"Mascote", SERAPHINE:"Lephyne" };
const money=(v:number)=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});

export default function DashboardGerencial(){
 const anoAtual=new Date().getFullYear();
 const [ano,setAno]=useState(anoAtual);
 const {data,isLoading}=trpc.meta.historicoAnual.useQuery({ano});
 const resumo=useMemo(()=>{
  if(!data) return [];
  const hoje=new Date();
  const slugs=Array.from(new Set((data.faturamentos??[]).map((f:any)=>f.empresaSlug))) as string[];
  return slugs.map(slug=>{
   const fats=(data.faturamentos??[]).filter((f:any)=>{
    const [a,m,d]=f.data.split("-").map(Number);
    return f.empresaSlug===slug && a===ano && new Date(a,m-1,d)<=hoje;
   });
   const faturamento=fats.reduce((s:number,f:any)=>s+[f.cat1,f.cat2,f.cat3,f.cat4,f.cat5,f.cat6,f.cat7,f.cat8,f.cat9].reduce((x:number,v:any)=>x+parseFloat(v||"0"),0),0);
   const metas=(data.metas??[]).filter((m:any)=>m.empresaSlug===slug && m.ano===ano);
   const meta=metas.reduce((s:number,m:any)=>s+parseFloat(m.metaMensal||"0"),0);
   return {slug,nome:nomes[slug]??slug,faturamento,meta,atingimento:meta?faturamento/meta*100:0};
  }).sort((a,b)=>b.faturamento-a.faturamento);
 },[data,ano]);
 const total=resumo.reduce((s,r)=>s+r.faturamento,0);
 const metaTotal=resumo.reduce((s,r)=>s+r.meta,0);
 return <DashboardLayout><div className="mx-auto max-w-7xl space-y-6">
  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
   <div><p className="text-sm font-medium text-blue-600">Visão executiva</p><h1 className="text-3xl font-bold tracking-[-0.04em] text-[#12233f]">Dashboard Gerencial</h1><p className="mt-2 text-slate-500">Consolidado do grupo e visão individual por unidade.</p></div>
   <select value={ano} onChange={e=>setAno(Number(e.target.value))} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"><option>{anoAtual}</option><option>{anoAtual-1}</option><option>{anoAtual-2}</option></select>
  </div>
  {isLoading?<Card className="premium-panel p-8 text-slate-500">Carregando consolidado...</Card>:<>
   <div className="grid gap-4 md:grid-cols-3">
    <Card className="premium-panel p-5"><DollarSign className="mb-3 h-5 w-5 text-blue-600"/><p className="text-sm text-slate-500">Faturamento acumulado</p><p className="mt-1 text-2xl font-bold text-[#12233f]">{money(total)}</p></Card>
    <Card className="premium-panel p-5"><Target className="mb-3 h-5 w-5 text-blue-600"/><p className="text-sm text-slate-500">Meta acumulada</p><p className="mt-1 text-2xl font-bold text-[#12233f]">{money(metaTotal)}</p></Card>
    <Card className="premium-panel p-5"><TrendingUp className="mb-3 h-5 w-5 text-blue-600"/><p className="text-sm text-slate-500">Atingimento consolidado</p><p className="mt-1 text-2xl font-bold text-[#12233f]">{metaTotal?(total/metaTotal*100).toFixed(1):"0.0"}%</p></Card>
   </div>
   <div className="grid gap-4 lg:grid-cols-3">{resumo.map(r=><Card key={r.slug} className="premium-panel p-6">
    <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Unidade</p><h2 className="text-xl font-bold text-[#12233f]">{r.nome}</h2></div><Building2 className="h-6 w-6 text-blue-600"/></div>
    <div className="space-y-3"><div className="flex justify-between"><span className="text-slate-500">Faturamento</span><strong>{money(r.faturamento)}</strong></div><div className="flex justify-between"><span className="text-slate-500">Meta</span><strong>{money(r.meta)}</strong></div><div className="flex justify-between"><span className="text-slate-500">Atingimento</span><strong>{r.atingimento.toFixed(1)}%</strong></div></div>
    <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{width:`${Math.min(r.atingimento,100)}%`}}/></div>
   </Card>)}</div>
  </>}
 </div></DashboardLayout>
}