export type DeviceType =
  | "light"
  | "switch"
  | "plug"
  | "fan"
  | "sensor";

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  driverId: string;
  roomId?: string;
  capabilities: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
}
