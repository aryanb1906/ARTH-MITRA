'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BrainCircuit, TrendingUp, ShieldCheck, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function GoalPlanner() {
  const router = useRouter();
  const [target, setTarget] = useState<number>(1000000);
  const [years, setYears] = useState<number>(3);
  const [sector, setSector] = useState<string>("Lifestyle");
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  const runAudit = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/finance/check-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal_type: sector, amount: target, years: years }),
      });
      const data = await response.json();
      setAiResult(data);
    } catch (err) {
      console.error("Audit failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-8">
      <div className="flex items-center gap-3 border-b pb-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <BrainCircuit className="text-primary w-10 h-10" />
        <div>
          <h1 className="text-3xl font-bold">AI Goal Planner</h1>
          <p className="text-muted-foreground italic">2026 Sectoral Inflation Adjusted</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-2">
          <CardHeader><CardTitle className="text-lg">1. Set Your Objective</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold">Goal Category</label>
              <Select onValueChange={setSector} defaultValue={sector}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Education">🎓 Higher Education (10.5% Inf.)</SelectItem>
                  <SelectItem value="Medical">🏥 Specialized Medical (14% Inf.)</SelectItem>
                  <SelectItem value="Lifestyle">🚗 Car / Travel (6% Inf.)</SelectItem>
                  <SelectItem value="General">💰 General / Retirement (4.5% Inf.)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">Today's Price (₹)</label>
              <Input type="number" value={target} onChange={(e) => setTarget(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">Time Horizon (Years)</label>
              <Input type="number" value={years} onChange={(e) => setYears(Number(e.target.value))} />
            </div>
            <Button onClick={runAudit} className="w-full h-12 text-lg font-bold" disabled={loading}>
              {loading ? "Calculating..." : "Run AI Audit"}
            </Button>
          </CardContent>
        </Card>

        {aiResult ? (
          <div className="space-y-6">
            <Card className="bg-primary/5 border-primary border-2 shadow-lg">
              <CardHeader>
                <CardTitle className="text-primary flex items-center gap-2">
                  <TrendingUp size={20}/> Adjusted Target
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">In {years} years, your goal will cost:</p>
                <h2 className="text-4xl font-black">₹{aiResult.future_value.toLocaleString('en-IN')}</h2>
                <div className="p-4 bg-primary text-primary-foreground rounded-xl">
                  <p className="text-xs font-bold uppercase opacity-80">Required Monthly SIP</p>
                  <h2 className="text-4xl font-black mt-1">₹{aiResult.sip_amount.toLocaleString('en-IN')}</h2>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50/50">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center gap-2 font-bold text-orange-700">
                  <ShieldCheck size={18} /> AI Asset Recommendation
                </div>
                <p className="text-sm leading-relaxed text-orange-900">{aiResult.advice}</p>
                <div className="flex gap-4 mt-2">
                  {Object.entries(aiResult.allocation).map(([asset, weight]) => (
                    <div key={asset} className="bg-white px-3 py-1 rounded-full border text-xs font-bold">
                      {asset}: {weight as string}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 text-muted-foreground">
            <AlertCircle size={48} className="mb-4 opacity-20" />
            <p>Enter your goal details to see the AI reality check.</p>
          </div>
        )}
      </div>
    </div>
  );
}