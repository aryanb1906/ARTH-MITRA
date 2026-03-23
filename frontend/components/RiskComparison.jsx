'use client'

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, AlertTriangle, Scale, Target } from 'lucide-react';

const RiskComparison = ({ specificSchemes = [], userRiskProfile = "Moderate" }) => {

  const formatRupee = (num) => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(Math.abs(num));

  const formatYAxis = (value) => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
    return `₹${value}`;
  };

  const { chartData, totalInvested, totalProfit, totalLoss } = useMemo(() => {
    if (!specificSchemes || specificSchemes.length === 0) {
      return { chartData: [], totalInvested: 0, totalProfit: 0, totalLoss: 0 };
    }

    let totalInvested = 0, totalProfit = 0, totalLoss = 0;

    const fundBars = specificSchemes.map((scheme) => {
      const invested = Math.round(Number(scheme.amount) || 0);
      // trailing5Y and maxRisk are attached by Python from recommended_funds.txt
      const trailing5Y = Number(scheme.trailing5Y) || 0.10;
      const maxRisk    = Number(scheme.maxRisk)    || 0.20;

      const profit = Math.round(invested * (1 + trailing5Y));
      const loss   = Math.round(invested * (1 - maxRisk));

      totalInvested += invested;
      totalProfit   += profit;
      totalLoss     += loss;

      return {
        shortName: scheme.name.split(" ").slice(0, 3).join(" ") + "...",
        fullName: scheme.name,
        category: scheme.category,
        "Max Loss": loss,
        "Invested": invested,
        "Est. Profit": profit,
      };
    });

    fundBars.push({
      shortName: "Total",
      fullName: "Combined Portfolio Summary",
      category: "Overall",
      "Max Loss": totalLoss,
      "Invested": totalInvested,
      "Est. Profit": totalProfit,
    });

    return { chartData: fundBars, totalInvested, totalProfit, totalLoss };
  }, [specificSchemes]);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-xl w-64">
        <p className="font-bold text-slate-900 text-sm mb-1">{d.fullName}</p>
        <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">{d.category}</p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-emerald-600 font-medium flex items-center gap-1.5"><TrendingUp size={13}/> Est. Profit</span>
            <span className="font-bold text-emerald-700">{formatRupee(d["Est. Profit"])}</span>
          </div>
          <div className="flex justify-between text-sm bg-slate-50 p-1.5 rounded-lg">
            <span className="text-slate-600 font-medium flex items-center gap-1.5"><Target size={13}/> Invested</span>
            <span className="font-bold text-slate-800">{formatRupee(d["Invested"])}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-rose-500 font-medium flex items-center gap-1.5"><AlertTriangle size={13}/> Max Loss</span>
            <span className="font-bold text-rose-600">{formatRupee(d["Max Loss"])}</span>
          </div>
        </div>
      </div>
    );
  };

  if (chartData.length === 0) return null;

  return (
    <div className="w-full bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm mt-8">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Scale className="text-blue-600" /> Historical Stress Test
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Per-fund breakdown — invested, best case, and worst case crash scenario.
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-xl flex items-center gap-3">
          <span className="text-xs text-blue-600 font-bold uppercase tracking-wider">Profile</span>
          <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></div>
          <span className="text-sm font-black text-blue-900">{userRiskProfile}</span>
        </div>
      </div>

      <div className="h-[400px] w-full mb-8">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 20 }} barGap={4}>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" opacity={0.6} />
            <XAxis dataKey="shortName" axisLine={false} tickLine={false} dy={15}
              tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }} />
            <YAxis tickFormatter={formatYAxis} axisLine={false} tickLine={false} dx={-10}
              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
            <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle"
              formatter={(value) => <span className="text-slate-600 font-bold text-xs ml-1">{value}</span>} />
            <Bar dataKey="Max Loss"    fill="#ef4444" radius={[6,6,0,0]} maxBarSize={40} animationDuration={1200} />
            <Bar dataKey="Invested"    fill="#94a3b8" radius={[6,6,0,0]} maxBarSize={40} animationDuration={1200} />
            <Bar dataKey="Est. Profit" fill="#10b981" radius={[6,6,0,0]} maxBarSize={40} animationDuration={1200} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-slate-100">
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1.5 mb-1">
            <Target size={13}/> Total Invested
          </span>
          <span className="text-2xl font-black text-slate-800 block mt-1">{formatRupee(totalInvested)}</span>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-center">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest flex items-center justify-center gap-1.5 mb-1">
            <TrendingUp size={13}/> Best Case Total
          </span>
          <span className="text-2xl font-black text-emerald-700 block mt-1">{formatRupee(totalProfit)}</span>
        </div>
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 text-center">
          <span className="text-xs font-bold text-rose-500 uppercase tracking-widest flex items-center justify-center gap-1.5 mb-1">
            <AlertTriangle size={13}/> Worst Case Total
          </span>
          <span className="text-2xl font-black text-rose-600 block mt-1">{formatRupee(totalLoss)}</span>
        </div>
      </div>
    </div>
  );
};

export default RiskComparison;