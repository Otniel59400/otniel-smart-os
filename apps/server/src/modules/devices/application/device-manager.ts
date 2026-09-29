import type { Device } from "../domain/device.js";
import type { DeviceCommand } from "../domain/device-command.js";
import type { DeviceState } from "../domain/device-state.js";
import {
  getRequiredCapabilities,
  missingCapabilities
} from "../domain/command-capabilities.js";
import {
  DeviceAlreadyRegisteredError,
  DeviceNotFoundError,
  DriverIncompatibleError,
  InsufficientCapabilityError,
  UnsupportedCommandError
} from "../domain/errors.js";
import type { EventBus } from "../../events/application/event-bus.js";
import {
  DeviceEventType,
  type DeviceRegisteredPayload,
  type DeviceRemovedPayload,
  type DeviceStateChangedPayload
} from "../../events/domain/device-events.js";
import { DriverRegistry } from "./driver-registry.js";

export class DeviceManager {
  private readonly devices = new Map<string, Device>();

  constructor(
    private readonly driverRegistry: DriverRegistry,
    private readonly eventBus?: EventBus
  ) {}

  async initialize(): Promise<void> {
    for (const driver of this.driverRegistry.list()) {
      await driver.initialize();
    }
  }

  async registerDevice(device: Device): Promise<void> {
    if (this.devices.has(device.id)) {
      throw new DeviceAlreadyRegisteredError(device.id);
    }

    const driver = this.driverRegistry.get(device.driverId);

    if (!driver.supports(device)) {
      throw new DriverIncompatibleError(device.driverId, device.id);
    }

    this.devices.set(device.id, device);

    await this.emit<DeviceRegisteredPayload>(DeviceEventType.Registered, {
      device
    });
  }

  getDevice(deviceId: string): Device {
    const device = this.devices.get(deviceId);

    if (!device) {
      throw new DeviceNotFoundError(deviceId);
    }

    return device;
  }

  listDevices(): Device[] {
    return [...this.devices.values()];
  }

  async removeDevice(deviceId: string): Promise<void> {
    const device = this.getDevice(deviceId);
    const driver = this.driverRegistry.get(device.driverId);

    await driver.releaseDevice(deviceId);
    this.devices.delete(deviceId);

    await this.emit<DeviceRemovedPayload>(DeviceEventType.Removed, {
      deviceId,
      device
    });
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
    const required = getRequiredCapabilities(command.name);

    if (!required) {
      throw new UnsupportedCommandError(command.name);
    }

    const missing = missingCapabilities(device, required);

    if (missing.length > 0) {
      throw new InsufficientCapabilityError(deviceId, command.name, missing);
    }

    const driver = this.driverRegistry.get(device.driverId);
    const state = await driver.executeCommand(device, command);

    await this.emit<DeviceStateChangedPayload>(DeviceEventType.StateChanged, {
      deviceId,
      state,
      device
    });

    return state;
  }

  async dispose(): Promise<void> {
    for (const driver of this.driverRegistry.list()) {
      await driver.dispose();
    }
  }

  private async emit<TPayload>(
    type: string,
    payload: TPayload
  ): Promise<void> {
    if (!this.eventBus) {
      return;
    }

    await this.eventBus.publish(type, payload);
  }
}
