export type UnifiedStatus =
  | 'picked'
  | 'in_transit'
  | 'at_hub'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed_attempt'
  | 'rto'
  | 'unknown';

export type DelayReason =
  | 'stuck_at_hub'
  | 'failed_delivery'
  | 'address_issue'
  | 'rto'
  | 'missed_promise'
  | null;

export interface StatusEvent {
  at: Date;
  rawCode: string;
  location: string;
  remark: string;
  status: UnifiedStatus;
}

export interface Shipment {
  orderId: string;
  courier: string;
  originCity: string;
  destinationCity: string;
  pincode: string;
  createdAt: Date;
  promisedDate: Date | null;
  deliveredAt: Date | null;
  events: StatusEvent[];
  currentStatus: UnifiedStatus;
  isLate: boolean;
  delayReason: DelayReason;
  delayLabel: string | null;
}
