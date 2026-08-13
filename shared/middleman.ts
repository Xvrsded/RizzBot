export const MIDDLEMAN_TIERS = [
  { label: "Rp1.000 – Rp49.000", value: 1000 },
  { label: "Rp50.000 – Rp99.000", value: 50000 },
  { label: "Rp100.000 – Rp149.000", value: 100000 },
  { label: "Rp150.000 – Rp199.000", value: 150000 },
  { label: "Rp200.000 – Rp249.000", value: 200000 },
  { label: "Rp250.000 – Rp299.000", value: 250000 },
  { label: "Rp300.000 – Rp399.000", value: 300000 },
  { label: "Rp400.000 – Rp499.000", value: 400000 },
  { label: "Rp500.000 – Rp599.000", value: 500000 },
  { label: "Rp600.000 – Rp699.000", value: 600000 },
  { label: "Rp700.000 – Rp799.000", value: 700000 },
  { label: "Rp800.000 – Rp899.000", value: 800000 },
  { label: "Rp900.000 – Rp999.999", value: 900000 },
  { label: "Rp1.000.000+", value: 1000000 },
];

export interface MiddlemanFeeResult {
  transactionAmount: number;
  fee: number;
  total: number;
}

export function calculateMiddlemanFee(amount: number): MiddlemanFeeResult {
  let fee = 0;

  if (amount >= 1_000_000) {
    fee = 10000 + Math.floor((amount - 1_000_000) / 50000) * 1000;
  } else if (amount >= 300_000) {
    fee = 5000 + Math.floor((amount - 300_000) / 50000) * 1000;
  } else if (amount >= 200_000) {
    fee = 5000 + Math.floor((amount - 200_000) / 50000) * 1000;
  } else if (amount >= 150_000) {
    fee = 4000;
  } else if (amount >= 100_000) {
    fee = 3000;
  } else if (amount >= 50_000) {
    fee = 2000;
  } else {
    fee = 1000;
  }

  return {
    transactionAmount: amount,
    fee,
    total: amount + fee,
  };
}
