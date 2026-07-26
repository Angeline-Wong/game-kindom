const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

export function toChineseNumber(value: number) {
  const integer = Math.max(0, Math.floor(value));
  if (integer < 10) return digits[integer];
  if (integer < 20) return `十${integer % 10 ? digits[integer % 10] : ''}`;
  if (integer < 100) return `${digits[Math.floor(integer / 10)]}十${integer % 10 ? digits[integer % 10] : ''}`;
  return String(integer);
}
