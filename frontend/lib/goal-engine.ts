export const calculateGoalSIP = (targetAmount: number, years: number, sector: string) => {
  const inflationMap: Record<string, number> = {
    Education: 10,
    Medical: 14,
    Lifestyle: 6,
    General: 4
  };

  const rateOfInflation = (inflationMap[sector] || 5) / 100;
  const expectedReturn = 0.12; // 12% average for Equity SIPs

  // 1. Calculate Future Value (Adjusted for Inflation)
  const futureValue = targetAmount * Math.pow(1 + rateOfInflation, years);

  // 2. Calculate Monthly SIP required
  const i = expectedReturn / 12;
  const n = years * 12;
  const sipAmount = futureValue * (i / (Math.pow(1 + i, n) - 1));

  return {
    futureValue: Math.round(futureValue),
    sipAmount: Math.round(sipAmount),
    inflationApplied: inflationMap[sector]
  };
};