export interface SaleDebtShape {
  totalNgn: number;
  isCreditSale?: boolean;
  amountPaidNgn?: number;
  remainingBalanceNgn?: number;
}

/**
 * Outstanding debt for a credit sale.
 *
 * For a partial (incomplete) payment the stored `remainingBalanceNgn` is the
 * exact amount still owed, because `amountPaidNgn` reflects what was already
 * paid. For a legacy/full pay-on-credit sale `remainingBalanceNgn` may be 0
 * (nothing was recorded as a down payment), in which case the whole total is
 * still due, so we fall back to `totalNgn`.
 */
export function getSaleOutstanding(sale: SaleDebtShape): number {
  if (!sale.isCreditSale) return 0;
  if (sale.remainingBalanceNgn && sale.remainingBalanceNgn > 0) {
    return sale.remainingBalanceNgn;
  }
  return sale.totalNgn;
}