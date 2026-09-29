import type { Device } from "../domain/device.js";
import type { DeviceCommand } from "../domain/device-command.js";
import type { DeviceState } from "../domain/device-state.js";
import { DriverRegistry } from "./driver-registry.js";

export class DeviceManager {
  private readonly devices = new Map<string, Device>();

  constructor(
    private readonly driverRegistry: DriverRegistry
  ) {}

  async initialize(): Promise<void> {
    for (const driver of this.driverRegistry.list()) {
      await driver.initialize();
    }
  }

  registerDevice(device: Device): void {
    if (this.devices.has(device.id)) {
      throw new Error(`Device "${device.id}" already registered`);
    }

    const driver = this.driverRegistry.get(device.driverId);

    if (!driver.supports(device)) {
      throw new Error(
        `Driver "${device.driverId}" does not support device "${device.id}"`
      );
    }

    this.devices.set(device.id, device);
  }

  getDevice(deviceId: string): Device {
    const device = this.devices.get(deviceId);

    if (!device) {
      throw new Error(`Device "${deviceId}" not found`);
    }

    return device;
  }

  listDevices(): Device[] {
    return [...this.devices.values()];
  }

  removeDevice(deviceId: string): void {
    if (!this.devices.delete(deviceId)) {
      throw new Error(`Device "${deviceId}" not found`);
    }
  }

  async getDeviceState(deviceId: string): Promise<DeviceState> {
    const device = this.getDevice(deviceId);
    const driver = this.driverRegistry.get(device.driverId);

    return driver.getState(device);
  }

  async executeCommand(
    deviceId: string,
    command: DeviceCommand
  ): Promise<DeviceState> {
    const device = this.getDevice(deviceId);
    const driver = this.driverRegistry.get(device.driverId);

    return driver.executeCommand(device, command);
  }

  async dispose(): Promise<void> {
    for (const driver of this.driverRegistry.list()) {
      await driver.dispose();
    }
  }
}
