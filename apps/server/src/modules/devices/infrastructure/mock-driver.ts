import type { Device } from "../domain/device.js";
import type { DeviceCommand } from "../domain/device-command.js";
import type { DeviceDriver } from "../domain/device-driver.js";
import type { DeviceState } from "../domain/device-state.js";

export class MockDriver implements DeviceDriver {
  readonly id = "mock";

  private readonly states = new Map<string, DeviceState>();

  async initialize(): Promise<void> {
    this.states.clear();
  }

  supports(device: Device): boolean {
    return device.driverId === this.id;
  }

  async getState(device: Device): Promise<DeviceState> {
    return this.states.get(device.id) ?? {
      power: false
    };
  }

  async executeCommand(
    device: Device,
    command: DeviceCommand
  ): Promise<DeviceState> {
    const currentState = await this.getState(device);

    switch (command.name) {
      case "set_power": {
        const power = command.parameters?.power;

        if (typeof power !== "boolean") {
          throw new Error('Command "set_power" requires a boolean "power" parameter');
        }

        const newState: DeviceState = {
          ...currentState,
          power
        };

        this.states.set(device.id, newState);

        return newState;
      }

      case "toggle": {
        const newState: DeviceState = {
          ...currentState,
          power: !Boolean(currentState.power)
        };

        this.states.set(device.id, newState);

        return newState;
      }

      default:
        throw new Error(`Unsupported command "${command.name}"`);
    }
  }

  async dispose(): Promise<void> {
    this.states.clear();
  }
}
