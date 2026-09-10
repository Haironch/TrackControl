export const round2 = (n: number) => Math.round(n * 100) / 100;
export const sum = (values: number[]) => round2(values.reduce((a, b) => a + b, 0));
export const pct = (part: number, total: number) => (total === 0 ? 0 : Math.round((part / total) * 1000) / 10);
