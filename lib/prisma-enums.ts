export const CommissionStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  PAID: "PAID",
  CANCELED: "CANCELED",
} as const;
export type CommissionStatus =
  (typeof CommissionStatus)[keyof typeof CommissionStatus];

export const FulfillmentStatus = {
  PENDING: "PENDING",
  PREPARING: "PREPARING",
  SHIPPED: "SHIPPED",
  DELIVERY_REQUESTED: "DELIVERY_REQUESTED",
  DELIVERED: "DELIVERED",
  CANCELED: "CANCELED",
} as const;
export type FulfillmentStatus =
  (typeof FulfillmentStatus)[keyof typeof FulfillmentStatus];

export const OrderStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  CANCELED: "CANCELED",
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const SettlementStatus = {
  PENDING: "PENDING",
  AVAILABLE: "AVAILABLE",
  PAID: "PAID",
  CANCELED: "CANCELED",
} as const;
export type SettlementStatus =
  (typeof SettlementStatus)[keyof typeof SettlementStatus];

export const PayoutMethod = {
  BANK_TRANSFER: "BANK_TRANSFER",
  DLOCAL_GO: "DLOCAL_GO",
  MANUAL: "MANUAL",
} as const;
export type PayoutMethod = (typeof PayoutMethod)[keyof typeof PayoutMethod];

export const PayoutRequestKind = {
  SELLER: "SELLER",
  AFFILIATE: "AFFILIATE",
} as const;
export type PayoutRequestKind =
  (typeof PayoutRequestKind)[keyof typeof PayoutRequestKind];

export const PayoutRequestStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  CANCELED: "CANCELED",
} as const;
export type PayoutRequestStatus =
  (typeof PayoutRequestStatus)[keyof typeof PayoutRequestStatus];

export const Role = {
  SELLER: "SELLER",
  AFFILIATE: "AFFILIATE",
  ADMIN: "ADMIN",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const CommissionType = {
  PERCENT: "PERCENT",
  FIXED: "FIXED",
} as const;
export type CommissionType =
  (typeof CommissionType)[keyof typeof CommissionType];
