export function getPageNumbers(
  current: number,
  totalPages: number,
  maxVisible = 5,
): number[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (current <= 2) {
    return [1, 2, 3, 4, 5];
  }
  if (current >= totalPages - 1) {
    return Array.from({ length: 5 }, (_, i) => totalPages - 4 + i);
  }
  return [current - 2, current - 1, current, current + 1, current + 2];
}
