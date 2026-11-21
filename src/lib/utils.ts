import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatDateOnly(dateString: string | Date | null | undefined): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * Formats a Date or ISO string into a local 'YYYY-MM-DDTHH:mm' string
 * suitable for <input type="datetime-local" /> in the user's browser local timezone.
 */
export function toLocalDateTimeString(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

export function normalizeStudentId(id: string): string {
  return id.trim().toLowerCase().replace(/\s+/g, "");
}

/**
 * Automatically formats DIU Student ID into XXX-XX-XXX pattern.
 * If the trailing segment is 1-9 (1 digit), automatically prefixes 2 zeros (00X).
 * If the trailing segment is 10-99 (2 digits), automatically prefixes 1 zero (0XX).
 */
export function formatStudentId(val: string): string {
  if (!val) return "";
  const trimmed = val.trim();

  // Normalize delimiters to dash
  const normalized = trimmed.replace(/[\s\.]+/g, "-");

  // Check if split with dashes
  const parts = normalized.split("-");
  if (parts.length === 3) {
    const [p1, p2, p3] = parts;
    if (/^\d{3}$/.test(p1) && /^\d{2}$/.test(p2) && /^\d{1,3}$/.test(p3)) {
      const paddedLast = p3.padStart(3, "0");
      return `${p1}-${p2}-${paddedLast}`;
    }
  }

  // Check pure digits (6 to 8 digits)
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 6 && digits.length <= 8) {
    const p1 = digits.slice(0, 3);
    const p2 = digits.slice(3, 5);
    const p3 = digits.slice(5);
    if (p3.length >= 1 && p3.length <= 3) {
      const paddedLast = p3.padStart(3, "0");
      return `${p1}-${p2}-${paddedLast}`;
    }
  }

  return trimmed;
}
