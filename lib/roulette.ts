export type BetType =
  | "straight"
  | "split"
  | "street"
  | "corner"
  | "sixline"
  | "column"
  | "dozen"
  | "red"
  | "black"
  | "odd"
  | "even"
  | "low"
  | "high"
  | "zero";

export interface Bet {
  id: string;
  type: BetType;
  numbers: number[];
  amount: number;
  label: string;
  payout: number; // multiplier
}

export interface ChipPlacement {
  betKey: string;
  numbers: number[];
  amount: number;
  type: BetType;
  label: string;
  payout: number;
}

// European roulette: 0-36
export const ROULETTE_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30,
  8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7,
  28, 12, 35, 3, 26,
];

export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export const BLACK_NUMBERS = new Set([
  2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
]);

export function getNumberColor(n: number): "red" | "black" | "green" {
  if (n === 0) return "green";
  if (RED_NUMBERS.has(n)) return "red";
  return "black";
}

// Returns index in ROULETTE_NUMBERS array
export function getWheelIndex(number: number): number {
  return ROULETTE_NUMBERS.indexOf(number);
}

export function calculatePayout(bets: ChipPlacement[], winningNumber: number): number {
  let total = 0;
  for (const bet of bets) {
    if (bet.numbers.includes(winningNumber)) {
      total += bet.amount * bet.payout + bet.amount; // win + return stake
    }
  }
  return total;
}

export function calculateTotalBet(bets: ChipPlacement[]): number {
  return bets.reduce((sum, b) => sum + b.amount, 0);
}

export function getPayoutMultiplier(type: BetType): number {
  switch (type) {
    case "straight": return 35;
    case "split": return 17;
    case "street": return 11;
    case "corner": return 8;
    case "sixline": return 5;
    case "column": return 2;
    case "dozen": return 2;
    case "zero": return 35;
    case "red":
    case "black":
    case "odd":
    case "even":
    case "low":
    case "high": return 1;
    default: return 1;
  }
}

// Spin result: returns winning number
export function spinWheel(): number {
  return ROULETTE_NUMBERS[Math.floor(Math.random() * ROULETTE_NUMBERS.length)];
}

// Calculate exact angle of a number on the wheel
export function getAngleForNumber(number: number): number {
  const index = ROULETTE_NUMBERS.indexOf(number);
  if (index === -1) return 0;
  const segmentAngle = 360 / ROULETTE_NUMBERS.length;
  return index * segmentAngle;
}
