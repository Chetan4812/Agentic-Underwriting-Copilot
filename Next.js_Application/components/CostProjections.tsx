'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings2, Coins, Database, Users, ChevronDown, ChevronUp } from 'lucide-react';

interface RunVariables {
  calls: number;
  tokens: number;
  pricePerMUsd: number;
  retriesRs: number;
  infraHostCostRs: number;
  infraOutcomes: number;
  humanMins: number;
  humanRateRsHr: number;
  humanTriggerPct: number;
}

export function CostProjections() {
  const [currency, setCurrency] = useState<'Rs' | 'USD'>('Rs');
  const exchangeRate = 83; // 1 USD = 83 INR

  // State for Average Run
  const [avgVars, setAvgVars] = useState<RunVariables>({
    calls: 7,
    tokens: 4000,
    pricePerMUsd: 0.15, // $0.15 per 1M tokens (e.g. Gemini 1.5 Flash / GPT-4o-mini mix)
    retriesRs: 0.11, // Flat average retry cost in Rs
    infraHostCostRs: 8300, // Rs 8,300/month (approx $100/mo)
    infraOutcomes: 10000, // 10k applications/month
    humanMins: 5,
    humanRateRsHr: 900, // Rs 900/hour underwriter rate
    humanTriggerPct: 10, // 10% escalation rate
  });

  // State for Worst-case Run
  const [worstVars, setWorstVars] = useState<RunVariables>({
    calls: 11, // more agents called + critic retries
    tokens: 15000, // larger token payload
    pricePerMUsd: 6.00, // $6.00 per 1M tokens (e.g. Claude 3.5 Sonnet / GPT-4o)
    retriesRs: 12.50, // Heavy retries + fallback service
    infraHostCostRs: 8300,
    infraOutcomes: 1000, // Low outcome volume (1k/month) spikes unit infra cost
    humanMins: 15, // Long complex manual review
    humanRateRsHr: 900,
    humanTriggerPct: 100, // 100% trigger/escalation in worst-case
  });

  const [showAvgSettings, setShowAvgSettings] = useState(false);
  const [showWorstSettings, setShowWorstSettings] = useState(false);

  // Helper calculation logic
  const calculateCosts = (vars: RunVariables) => {
    // Model token cost (USD) = (calls * tokens * pricePerMUsd) / 1,000,000
    const tokenCostUsd = (vars.calls * vars.tokens * vars.pricePerMUsd) / 1000000;
    const tokenCostRs = tokenCostUsd * exchangeRate;

    // Retries + fallback cost
    const retriesRs = vars.retriesRs;
    const retriesUsd = retriesRs / exchangeRate;

    // Infra cost = Host Cost / Outcomes
    const infraRs = vars.infraHostCostRs / vars.infraOutcomes;
    const infraUsd = infraRs / exchangeRate;

    // Human minutes cost = mins * (hourly_rate / 60) * (trigger_percentage / 100)
    const humanCostRs = vars.humanMins * (vars.humanRateRsHr / 60) * (vars.humanTriggerPct / 100);
    const humanCostUsd = humanCostRs / exchangeRate;

    // Total Cost
    const totalRs = tokenCostRs + retriesRs + infraRs + humanCostRs;
    const totalUsd = tokenCostUsd + retriesUsd + infraUsd + humanCostUsd;

    return {
      tokens: currency === 'Rs' ? tokenCostRs : tokenCostUsd,
      retries: currency === 'Rs' ? retriesRs : retriesUsd,
      infra: currency === 'Rs' ? infraRs : infraUsd,
      human: currency === 'Rs' ? humanCostRs : humanCostUsd,
      total: currency === 'Rs' ? totalRs : totalUsd,
    };
  };

  const avgCosts = calculateCosts(avgVars);
  const worstCosts = calculateCosts(worstVars);

  const formatPrice = (val: number) => {
    if (currency === 'Rs') {
      return `Rs ${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      return `$${val.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
    }
  };

  const formatTotal = (val: number) => {
    if (currency === 'Rs') {
      return `Rs ${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  const handleAvgChange = (key: keyof RunVariables, val: number) => {
    setAvgVars(prev => ({ ...prev, [key]: Number.isNaN(val) ? 0 : val }));
  };

  const handleWorstChange = (key: keyof RunVariables, val: number) => {
    setWorstVars(prev => ({ ...prev, [key]: Number.isNaN(val) ? 0 : val }));
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Unit Cost Projections</h2>
          <p className="text-xs text-muted-foreground">Compare simulated model, infra, and human resource costs per processed application outcome.</p>
        </div>
        <div className="flex items-center space-x-1.5 rounded-lg border border-border bg-card p-1">
          <button
            onClick={() => setCurrency('Rs')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
              currency === 'Rs'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            INR (Rs)
          </button>
          <button
            onClick={() => setCurrency('USD')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
              currency === 'USD'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            USD ($)
          </button>
        </div>
      </div>

      {/* Main comparative cost table card */}
      <Card className="relative overflow-hidden border border-border/80 bg-gradient-to-b from-card to-background shadow-md">
        {/* Glowing visual indicators */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-teal-400/35 via-primary/50 to-amber-500/35" />

        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold tracking-wide text-foreground">Lending Copilot Run Cost Comparison</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">Comparative cost analysis mapping exact components for standard vs. edge-case workflows.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Mockup Comparison Table */}
          <div className="overflow-hidden rounded-lg border border-border/40 bg-black/20">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/40 bg-muted/30 text-muted-foreground font-semibold">
                  <th className="p-3 w-[40%]">Cost line</th>
                  <th className="p-3 text-right">Average run</th>
                  <th className="p-3 text-right">Worst-case run</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="p-3 font-medium">
                    Model tokens (calls × tokens × price)
                    <span className="block text-[10px] text-muted-foreground mt-0.5">
                      Avg: {avgVars.calls} calls, {avgVars.tokens / 1000}k tok | Worst: {worstVars.calls} calls, {worstVars.tokens / 1000}k tok
                    </span>
                  </td>
                  <td className="p-3 text-right font-semibold text-teal-400">{formatPrice(avgCosts.tokens)}</td>
                  <td className="p-3 text-right font-semibold text-amber-500">{formatPrice(worstCosts.tokens)}</td>
                </tr>
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="p-3 font-medium">
                    Retries + fallback runs
                    <span className="block text-[10px] text-muted-foreground mt-0.5">
                      Model outages and critic self-correction cycles
                    </span>
                  </td>
                  <td className="p-3 text-right font-semibold text-teal-400">{formatPrice(avgCosts.retries)}</td>
                  <td className="p-3 text-right font-semibold text-amber-500">{formatPrice(worstCosts.retries)}</td>
                </tr>
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="p-3 font-medium">
                    Infra (endpoint hours ÷ monthly outcomes)
                    <span className="block text-[10px] text-muted-foreground mt-0.5">
                      Monthly Host Cost (Rs {avgVars.infraHostCostRs.toLocaleString()}) divided by volume
                    </span>
                  </td>
                  <td className="p-3 text-right font-semibold text-teal-400">{formatPrice(avgCosts.infra)}</td>
                  <td className="p-3 text-right font-semibold text-amber-500">{formatPrice(worstCosts.infra)}</td>
                </tr>
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="p-3 font-medium">
                    Human minutes at H gates (mins × rate × trigger %)
                    <span className="block text-[10px] text-muted-foreground mt-0.5">
                      Avg: {avgVars.humanTriggerPct}% review risk | Worst: {worstVars.humanTriggerPct}% review risk
                    </span>
                  </td>
                  <td className="p-3 text-right font-semibold text-teal-400">{formatPrice(avgCosts.human)}</td>
                  <td className="p-3 text-right font-semibold text-amber-500">{formatPrice(worstCosts.human)}</td>
                </tr>
                <tr className="bg-primary/5 text-foreground font-bold border-t-2 border-border/80">
                  <td className="p-4 text-sm">Cost per outcome</td>
                  <td className="p-4 text-right text-sm text-teal-400 drop-shadow-[0_0_12px_rgba(45,212,191,0.15)]">{formatTotal(avgCosts.total)}</td>
                  <td className="p-4 text-right text-sm text-amber-500 drop-shadow-[0_0_12px_rgba(245,158,11,0.15)]">{formatTotal(worstCosts.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Grid for parameter settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Average Run Settings */}
            <div className="border border-border/30 rounded-lg overflow-hidden bg-muted/10">
              <button
                onClick={() => setShowAvgSettings(!showAvgSettings)}
                className="w-full flex items-center justify-between p-3 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors bg-muted/20"
              >
                <span className="flex items-center gap-1.5 text-teal-400">
                  <Settings2 className="h-3.5 w-3.5" />
                  Adjust Average Run Variables
                </span>
                {showAvgSettings ? <ChevronUp className="h-3.5 w-3.5 text-teal-400" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              {showAvgSettings && (
                <div className="p-4 grid grid-cols-2 gap-4 bg-muted/5 border-t border-border/20">
                  <div className="space-y-1.5">
                    <Label htmlFor="avg-calls" className="text-[10px] tracking-normal font-semibold">LLM Calls</Label>
                    <Input
                      id="avg-calls"
                      type="number"
                      min="0"
                      value={avgVars.calls}
                      onChange={e => handleAvgChange('calls', parseInt(e.target.value))}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="avg-tokens" className="text-[10px] tracking-normal font-semibold">Avg Tokens / Call</Label>
                    <Input
                      id="avg-tokens"
                      type="number"
                      min="0"
                      value={avgVars.tokens}
                      onChange={e => handleAvgChange('tokens', parseInt(e.target.value))}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="avg-price" className="text-[10px] tracking-normal font-semibold">Model 1M Cost ($)</Label>
                    <Input
                      id="avg-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={avgVars.pricePerMUsd}
                      onChange={e => handleAvgChange('pricePerMUsd', parseFloat(e.target.value))}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="avg-retries" className="text-[10px] tracking-normal font-semibold">Retries (Rs)</Label>
                    <Input
                      id="avg-retries"
                      type="number"
                      step="0.05"
                      min="0"
                      value={avgVars.retriesRs}
                      onChange={e => handleAvgChange('retriesRs', parseFloat(e.target.value))}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="avg-infra-cost" className="text-[10px] tracking-normal font-semibold">Monthly Host Cost (Rs)</Label>
                    <Input
                      id="avg-infra-cost"
                      type="number"
                      min="0"
                      value={avgVars.infraHostCostRs}
                      onChange={e => handleAvgChange('infraHostCostRs', parseInt(e.target.value))}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="avg-infra-outcomes" className="text-[10px] tracking-normal font-semibold">Monthly Volumes</Label>
                    <Input
                      id="avg-infra-outcomes"
                      type="number"
                      min="1"
                      value={avgVars.infraOutcomes}
                      onChange={e => handleAvgChange('infraOutcomes', parseInt(e.target.value))}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="avg-human-mins" className="text-[10px] tracking-normal font-semibold">Human Mins</Label>
                    <Input
                      id="avg-human-mins"
                      type="number"
                      min="0"
                      value={avgVars.humanMins}
                      onChange={e => handleAvgChange('humanMins', parseInt(e.target.value))}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="avg-human-rate" className="text-[10px] tracking-normal font-semibold">Reviewer Rate (Rs/hr)</Label>
                    <Input
                      id="avg-human-rate"
                      type="number"
                      min="0"
                      value={avgVars.humanRateRsHr}
                      onChange={e => handleAvgChange('humanRateRsHr', parseInt(e.target.value))}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="avg-human-trigger" className="text-[10px] tracking-normal font-semibold text-teal-400">Escalation Trigger Rate (%)</Label>
                    <div className="flex items-center space-x-3">
                      <input
                        id="avg-human-trigger-range"
                        type="range"
                        min="0"
                        max="100"
                        value={avgVars.humanTriggerPct}
                        onChange={e => handleAvgChange('humanTriggerPct', parseInt(e.target.value))}
                        className="w-full accent-teal-400 text-teal-400 bg-transparent"
                      />
                      <span className="text-xs font-semibold text-teal-400 w-10 text-right">{avgVars.humanTriggerPct}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Worst-case Run Settings */}
            <div className="border border-border/30 rounded-lg overflow-hidden bg-muted/10">
              <button
                onClick={() => setShowWorstSettings(!showWorstSettings)}
                className="w-full flex items-center justify-between p-3 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors bg-muted/20"
              >
                <span className="flex items-center gap-1.5 text-amber-500">
                  <Settings2 className="h-3.5 w-3.5" />
                  Adjust Worst-case Run Variables
                </span>
                {showWorstSettings ? <ChevronUp className="h-3.5 w-3.5 text-amber-500" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              {showWorstSettings && (
                <div className="p-4 grid grid-cols-2 gap-4 bg-muted/5 border-t border-border/20">
                  <div className="space-y-1.5">
                    <Label htmlFor="worst-calls" className="text-[10px] tracking-normal font-semibold">LLM Calls</Label>
                    <Input
                      id="worst-calls"
                      type="number"
                      min="0"
                      value={worstVars.calls}
                      onChange={e => handleWorstChange('calls', parseInt(e.target.value))}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="worst-tokens" className="text-[10px] tracking-normal font-semibold">Avg Tokens / Call</Label>
                    <Input
                      id="worst-tokens"
                      type="number"
                      min="0"
                      value={worstVars.tokens}
                      onChange={e => handleWorstChange('tokens', parseInt(e.target.value))}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="worst-price" className="text-[10px] tracking-normal font-semibold">Model 1M Cost ($)</Label>
                    <Input
                      id="worst-price"
                      type="number"
                      step="0.1"
                      min="0"
                      value={worstVars.pricePerMUsd}
                      onChange={e => handleWorstChange('pricePerMUsd', parseFloat(e.target.value))}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="worst-retries" className="text-[10px] tracking-normal font-semibold">Retries (Rs)</Label>
                    <Input
                      id="worst-retries"
                      type="number"
                      step="0.5"
                      min="0"
                      value={worstVars.retriesRs}
                      onChange={e => handleWorstChange('retriesRs', parseFloat(e.target.value))}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="worst-infra-cost" className="text-[10px] tracking-normal font-semibold">Monthly Host Cost (Rs)</Label>
                    <Input
                      id="worst-infra-cost"
                      type="number"
                      min="0"
                      value={worstVars.infraHostCostRs}
                      onChange={e => handleWorstChange('infraHostCostRs', parseInt(e.target.value))}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="worst-infra-outcomes" className="text-[10px] tracking-normal font-semibold">Monthly Volumes</Label>
                    <Input
                      id="worst-infra-outcomes"
                      type="number"
                      min="1"
                      value={worstVars.infraOutcomes}
                      onChange={e => handleWorstChange('infraOutcomes', parseInt(e.target.value))}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="worst-human-mins" className="text-[10px] tracking-normal font-semibold flex items-center gap-1">
                      Human Mins
                    </Label>
                    <Input
                      id="worst-human-mins"
                      type="number"
                      min="0"
                      value={worstVars.humanMins}
                      onChange={e => handleWorstChange('humanMins', parseInt(e.target.value))}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="worst-human-rate" className="text-[10px] tracking-normal font-semibold">Reviewer Rate (Rs/hr)</Label>
                    <Input
                      id="worst-human-rate"
                      type="number"
                      min="0"
                      value={worstVars.humanRateRsHr}
                      onChange={e => handleWorstChange('humanRateRsHr', parseInt(e.target.value))}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="worst-human-trigger" className="text-[10px] tracking-normal font-semibold text-amber-500">Escalation Trigger Rate (%)</Label>
                    <div className="flex items-center space-x-3">
                      <input
                        id="worst-human-trigger-range"
                        type="range"
                        min="0"
                        max="100"
                        value={worstVars.humanTriggerPct}
                        onChange={e => handleWorstChange('humanTriggerPct', parseInt(e.target.value))}
                        className="w-full accent-amber-500 text-amber-500 bg-transparent"
                      />
                      <span className="text-xs font-semibold text-amber-500 w-10 text-right">{worstVars.humanTriggerPct}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}
