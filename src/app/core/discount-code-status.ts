export interface DiscountCodeStatusMeta {
  label: string;
  tone: 'active' | 'used' | 'expired' | 'revoked' | 'unknown';
  canRedeem: boolean;
}

export function discountCodeStatus(status: number | string | null | undefined): DiscountCodeStatusMeta {
  const normalized = normalizeStatus(status);

  switch (normalized) {
    case 1:
    case 'active':
      return { label: 'فعّال', tone: 'active', canRedeem: true };
    case 2:
    case 'used':
      return { label: 'مستخدم', tone: 'used', canRedeem: false };
    case 3:
    case 'expired':
      return { label: 'منتهي', tone: 'expired', canRedeem: false };
    case 4:
    case 'revoked':
      return { label: 'ملغي', tone: 'revoked', canRedeem: false };
    default:
      return { label: 'غير معروف', tone: 'unknown', canRedeem: false };
  }
}

function normalizeStatus(status: number | string | null | undefined): number | string {
  if (typeof status === 'number') return status;
  const raw = String(status ?? '').trim();
  if (!raw) return '';
  const asNumber = Number(raw);
  return Number.isFinite(asNumber) ? asNumber : raw.toLowerCase();
}

export function discountCodeMobile(row: {
  mobile?: string | null;
  phoneNumber?: string | null;
}): string {
  return row.mobile?.trim() || row.phoneNumber?.trim() || '—';
}
