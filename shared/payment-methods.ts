export interface PaymentMethod {
  name: string;
  number: string;
}

export const GIFT_PAYMENT_METHODS: readonly PaymentMethod[] = [
  { name: "DANA", number: "081375968788" },
  { name: "SEABANK", number: "901563272058" },
  { name: "GOPAY", number: "089699878167" },
] as const;
