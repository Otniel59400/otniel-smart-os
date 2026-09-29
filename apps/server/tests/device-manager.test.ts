import { describe, expect, it } from "vitest";
import { DeviceManager } from "../src/modules/devices/application/device-manager.js";
import { DriverRegistry } from "../src/modules/devices/application/driver-registry.js";
import {
  DeviceAlreadyRegisteredError,
  DeviceNotFoundError,
  DriverIncompatibleError,
  DriverNotFoundError,
  InsufficientCapabilityError,
  UnsupportedCommandError
} from "../src/modules/devices/domain/errors.js";
import { MockDriver } from "../src/modules/devices/infrastructure/mock-driver.js";
import { createStubDriver } from "./helpers.js";

const device = {
  id: "test-light",
  name: "Luz de Teste",
  type: "light" as const,
  driverId: "mock",
  capabilities: ["power"],
  metadata: {},
  createdAt: new Date().toISOString()
};

function createManager() {
  const registry = new DriverRegistry();
  registry.register(new MockDriver());

  const manager = new DeviceManager(registry);

  return { manager, registry };
}

describe("DeviceManager", () => {
  it("registers and lists devices", async () => {
    const { manager } = createManager();

    await manager.initialize();
    manager.registerDevice(device);

    expect(manager.listDevices()).toHaveLength(1);
    expect(manager.getDevice("test-light").name).toBe("Luz de Teste");
  });

  it("gets the device state", async () => {
    const { manager } = createManager();

    await manager.initialize();
    manager.registerDevice(device);

    const state = await manager.getDeviceState("test-light");

    expect(state.power).toBe(false);
  });

  it("executes commands through the driver", async () => {
    const { manager } = createManager();

    await manager.initialize();
    manager.registerDevice(device);

    const state = await manager.executeCommand("test-light", {
      name: "set_power",
      parameters: {
        power: true
      }
    });

    expect(state.power).toBe(true);
  });

  it("rejects unknown devices", async () => {
    const { manager } = createManager();

    await manager.initialize();

    await expect(
      manager.getDeviceState("unknown-device")
    ).rejects.toBeInstanceOf(DeviceNotFoundError);
  });

  it("rejects a duplicate device", async () => {
    const { manager } = createManager();

    await manager.initialize();
    manager.registerDevice(device);

    expect(() => manager.registerDevice(device)).toThrow(
      DeviceAlreadyRegisteredError
    );
  });

  it("rejects a missing driver", async () => {
    const { manager } = createManager();

    await manager.initialize();

    expect(() =>
      manager.registerDevice({
        ...device,
        id: "orphan",
        driverId: "missing-driver"
      })
    ).toThrow(DriverNotFoundError);
  });

  it("rejects an incompatible driver", async () => {
    const registry = new DriverRegistry();
    registry.register(createStubDriver("reject", false));

    const manager = new DeviceManager(registry);

    await manager.initialize();

    expect(() =>
      manager.registerDevice({
        ...device,
        driverId: "reject"
      })
    ).toThrow(DriverIncompatibleError);
  });

  it("rejects an unsupported command", async () => {
    const { manager } = createManager();

    await manager.initialize();
    manager.registerDevice(device);

    await expect(
      manager.executeCommand("test-light", {
        name: "blink"
      })
    ).rejects.toBeInstanceOf(UnsupportedCommandError);
  });

  it("rejects a command when the device lacks the required capability", async () => {
    const { manager } = createManager();

    await manager.initialize();
    manager.registerDevice({
      ...device,
      id: "sensor-1",
      type: "sensor",
      capabilities: []
    });

    await expect(
      manager.executeCommand("sensor-1", {
        name: "toggle"
      })
    ).rejects.toBeInstanceOf(InsufficientCapabilityError);
  });

  it("clears residual driver state when a device id is reused after removal", async () => {
    const { manager } = createManager();

    await manager.initialize();
    manager.registerDevice(device);

    await manager.executeCommand("test-light", {
      name: "set_power",
      parameters: {
        power: true
      }
    });

    await manager.removeDevice("test-light");
    manager.registerDevice(device);

    const state = await manager.getDeviceState("test-light");

    expect(state.power).toBe(false);
  });
});
