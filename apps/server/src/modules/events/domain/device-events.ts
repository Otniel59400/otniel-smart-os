import type { Device } from "../../devices/domain/device.js";
import type { DeviceState } from "../../devices/domain/device-state.js";

export const DeviceEventType = {
  Registered: "device.registered",
  StateChanged: "device.state.changed",
  Removed: "device.removed"
} as const;

export type DeviceEventType =
  (typeof DeviceEventType)[keyof typeof DeviceEventType];

export interface DeviceRegisteredPayload {
  device: Device;
}

export interface DeviceStateChangedPayload {
  deviceId: string;
  state: DeviceState;
  device: Device;
}

export interface DeviceRemovedPayload {
  deviceId: string;
  device: Device;
}
