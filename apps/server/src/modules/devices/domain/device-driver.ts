import type { Device } from "./device.js";
import type { DeviceCommand } from "./device-command.js";
import type { DeviceState } from "./device-state.js";

export interface DeviceDriver {
  readonly id: string;

  initialize(): Promise<void>;

  supports(device: Device): boolean;

  getState(device: Device): Promise<DeviceState>;

  executeCommand(
    device: Device,
    command: DeviceCommand
  ): Promise<DeviceState>;

  releaseDevice(deviceId: string): Promise<void>;

  dispose(): Promise<void>;
}
