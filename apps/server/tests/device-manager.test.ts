import { describe, expect, it } from "vitest";
import { DeviceManager } from "../src/modules/devices/application/device-manager.js";
import { DriverRegistry } from "../src/modules/devices/application/driver-registry.js";
import { MockDriver } from "../src/modules/devices/infrastructure/mock-driver.js";

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
    ).rejects.toThrow('Device "unknown-device" not found');
  });
});
