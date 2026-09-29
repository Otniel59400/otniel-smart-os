import type { Device } from "../src/modules/devices/domain/device.js";
import type { DeviceDriver } from "../src/modules/devices/domain/device-driver.js";
import type { DeviceState } from "../src/modules/devices/domain/device-state.js";

export function createStubDriver(
  id: string,
  supportsDevice: boolean
): DeviceDriver {
  return {
    id,
    async initialize() {},
    supports(_device: Device) {
      return supportsDevice;
    },
    async getState() {
      return { power: false } satisfies DeviceState;
    },
    async executeCommand() {
      return { power: false } satisfies DeviceState;
    },
    async releaseDevice() {},
    async dispose() {}
  };
}
