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
import { EventBus } from "../src/modules/events/application/event-bus.js";
import {
  DeviceEventType,
  type DeviceRegisteredPayload,
  type DeviceRemovedPayload,
  type DeviceStateChangedPayload
} from "../src/modules/events/domain/device-events.js";
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

function createManager(eventBus?: EventBus) {
  const registry = new DriverRegistry();
  registry.register(new MockDriver());

  const manager = new DeviceManager(registry, eventBus);

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
    await manager.registerDevice(device);

    await expect(manager.registerDevice(device)).rejects.toBeInstanceOf(
      DeviceAlreadyRegisteredError
    );
  });

  it("rejects a missing driver", async () => {
    const { manager } = createManager();

    await manager.initialize();

    await expect(
      manager.registerDevice({
        ...device,
        id: "orphan",
        driverId: "missing-driver"
      })
    ).rejects.toBeInstanceOf(DriverNotFoundError);
  });

  it("rejects an incompatible driver", async () => {
    const registry = new DriverRegistry();
    registry.register(createStubDriver("reject", false));

    const manager = new DeviceManager(registry);

    await manager.initialize();

    await expect(
      manager.registerDevice({
        ...device,
        driverId: "reject"
      })
    ).rejects.toBeInstanceOf(DriverIncompatibleError);
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

  it("publishes device.registered after a successful registration", async () => {
    const eventBus = new EventBus();
    const { manager } = createManager(eventBus);
    const received: DeviceRegisteredPayload[] = [];

    eventBus.subscribe<DeviceRegisteredPayload>(
      DeviceEventType.Registered,
      (event) => {
        received.push(event.payload);
      }
    );

    await manager.initialize();
    await manager.registerDevice(device);

    expect(received).toHaveLength(1);
    expect(received[0]?.device).toEqual(device);
  });

  it("publishes device.state.changed after a successful command", async () => {
    const eventBus = new EventBus();
    const { manager } = createManager(eventBus);
    const received: DeviceStateChangedPayload[] = [];

    eventBus.subscribe<DeviceStateChangedPayload>(
      DeviceEventType.StateChanged,
      (event) => {
        received.push(event.payload);
      }
    );

    await manager.initialize();
    await manager.registerDevice(device);

    const state = await manager.executeCommand("test-light", {
      name: "set_power",
      parameters: {
        power: true
      }
    });

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({
      deviceId: "test-light",
      state,
      device
    });
  });

  it("publishes device.removed after a successful removal", async () => {
    const eventBus = new EventBus();
    const { manager } = createManager(eventBus);
    const received: DeviceRemovedPayload[] = [];

    eventBus.subscribe<DeviceRemovedPayload>(
      DeviceEventType.Removed,
      (event) => {
        received.push(event.payload);
      }
    );

    await manager.initialize();
    await manager.registerDevice(device);
    await manager.removeDevice("test-light");

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({
      deviceId: "test-light",
      device
    });
  });

  it("does not publish success events when an operation fails", async () => {
    const eventBus = new EventBus();
    const { manager } = createManager(eventBus);
    const registered: DeviceRegisteredPayload[] = [];
    const stateChanged: DeviceStateChangedPayload[] = [];
    const removed: DeviceRemovedPayload[] = [];

    eventBus.subscribe<DeviceRegisteredPayload>(
      DeviceEventType.Registered,
      (event) => {
        registered.push(event.payload);
      }
    );
    eventBus.subscribe<DeviceStateChangedPayload>(
      DeviceEventType.StateChanged,
      (event) => {
        stateChanged.push(event.payload);
      }
    );
    eventBus.subscribe<DeviceRemovedPayload>(
      DeviceEventType.Removed,
      (event) => {
        removed.push(event.payload);
      }
    );

    await manager.initialize();

    await expect(
      manager.registerDevice({
        ...device,
        driverId: "missing-driver"
      })
    ).rejects.toBeInstanceOf(DriverNotFoundError);

    await manager.registerDevice(device);

    await expect(
      manager.executeCommand("test-light", {
        name: "blink"
      })
    ).rejects.toBeInstanceOf(UnsupportedCommandError);

    await expect(manager.removeDevice("unknown-device")).rejects.toBeInstanceOf(
      DeviceNotFoundError
    );

    expect(registered).toHaveLength(1);
    expect(registered[0]?.device.id).toBe("test-light");
    expect(stateChanged).toHaveLength(0);
    expect(removed).toHaveLength(0);
  });
});
