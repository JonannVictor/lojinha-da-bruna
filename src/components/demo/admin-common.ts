"use client";

import { createDemoAdminActions } from "@/lib/demo/admin-actions";
import { MAX_DEMO_IMAGES_PER_PRODUCT, type OrderStatus } from "@/lib/demo/model";
import { DEMO_STORAGE_BUDGET } from "@/lib/demo/storage";
import { demoRepository } from "@/lib/demo/store";

/** Panel actions bound to the browser repository. */
export const demoActions = createDemoAdminActions(demoRepository);

/**
 * Photos are stored as text in localStorage, so they are kept small: about
 * 800 px and up to 200 KB each (≈270 thousand characters once encoded).
 */
export const DEMO_IMAGE_LIMITS = {
  maxDimension: 800,
  maxBytes: 200 * 1024,
  maxImages: MAX_DEMO_IMAGES_PER_PRODUCT,
};

export function storageUsagePercent(size: number): number {
  return Math.min(100, Math.floor((size / DEMO_STORAGE_BUDGET) * 100));
}

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : dateTime.format(date);
}

export const orderStatusStyles: Record<OrderStatus, string> = {
  pending: "bg-warning-soft text-warning",
  confirmed: "bg-accent-soft text-accent",
  fulfilled: "bg-success-soft text-success",
  cancelled: "bg-surface-muted text-muted",
};
