import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { UnifiedDomain } from '../types/models';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function expiryTone(domain: UnifiedDomain): 'normal' | 'warning' | 'danger' | 'expired' {
  if (domain.expired || (domain.remainingDays !== null && domain.remainingDays < 0)) return 'expired';
  if (domain.remainingDays !== null && domain.remainingDays <= 7) return 'danger';
  if (domain.remainingDays !== null && domain.remainingDays <= 30) return 'warning';
  return 'normal';
}

export function downloadText(filename: string, content: string, mime = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
