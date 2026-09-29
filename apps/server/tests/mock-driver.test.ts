import { describe, expect, it } from "vitest";
import { MockDriver } from "../src/modules/devices/infrastructure/mock-driver.js";
import { InvalidCommandError } from "../src/modules/devices/domain/errors.js";

const device = {
  id: "test-light",
  name: "Luz de Teste",
  type: "light" as const,
  driverId: "mock",
  capabilities: ["power"],
  metadata: {},
  createdAt: new Date().toISOString()
};

describe("MockDriver", () => {
  it("starts with power off", async () => {
    const driver = new MockDriver();

    await driver.initialize();

    const state = await driver.getState(device);

    expect(state.power).toBe(false);
  });

  it("turns a device on", async () => {
    const driver = new MockDriver();

    await driver.initialize();

    const state = await driver.executeCommand(device, {
      name: "set_power",
      parameters: {
        power: true
      }
    });

    expect(state.power).toBe(true);
  });

  it("toggles a device", async () => {
    const driver = new MockDriver();

    await driver.initialize();

    await driver.executeCommand(device, {
      name: "set_power",
      parameters: {
        power: true
      }
    });

    const state = await driver.executeCommand(device, {
      name: "toggle"
    });

    expect(state.power).toBe(false);
  });

  it("rejects an invalid set_power command", async () => {
    const driver = new MockDriver();

    await driver.initialize();

    await expect(
      driver.executeCommand(device, {
        name: "set_power",
        parameters: {
          power: "yes"
        }
      })
    ).rejects.toBeInstanceOf(InvalidCommandError);
  });

  it("does not restore previous state after releaseDevice", async () => {
    const driver = new MockDriver();

    await driver.initialize();

    await driver.executeCommand(device, {
      name: "set_power",
      parameters: {
        power: true
      }
    });

    await driver.releaseDevice(device.id);

    const state = await driver.getState(device);

    expect(state.power).toBe(false);
  });
});
