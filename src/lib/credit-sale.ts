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

/**
 * Net a customer's store credit against their debt: a debtor balance cancels
 * against wallet credit first, so a customer never shows both a credit and a
 * debit at once. Returns the netted credit and netted debit (at most one is
 * ever non-zero).
 *
 *   credit = 5000, debit = 3000  ->  { credit: 2000, debit: 0 }
 *   credit = 2000, debit = 5000  ->  { credit: 0,    debit: 3000 }
 */
export function netCustomerBalance(credit: number, debit: number): { credit: number; debit: number } {
  const c = Math.max(0, Number(credit) || 0);
  const d = Math.max(0, Number(debit) || 0);
  if (c >= d) return { credit: c - d, debit: 0 };
  return { credit: 0, debit: d - c };
}