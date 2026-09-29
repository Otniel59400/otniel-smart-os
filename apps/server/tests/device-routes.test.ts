import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { createStubDriver } from "./helpers.js";

const testDevice = {
  id: "test-light",
  name: "Luz de Teste",
  type: "light" as const,
  driverId: "mock",
  capabilities: ["power"],
  metadata: {
    virtual: true
  }
};

async function createApp() {
  const context = await buildApp();

  context.deviceManager.registerDevice({
    ...testDevice,
    createdAt: new Date().toISOString()
  });

  return context;
}

describe("Device HTTP routes", () => {
  it("lists devices", async () => {
    const { app } = await createApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/devices"
    });

    expect(response.statusCode).toBe(200);

    const devices = response.json();

    expect(devices).toHaveLength(1);
    expect(devices[0].id).toBe("test-light");

    await app.close();
  });

  it("gets device state", async () => {
    const { app } = await createApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/devices/test-light/state"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      power: false
    });

    await app.close();
  });

  it("executes set_power command", async () => {
    const { app } = await createApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/devices/test-light/commands",
      payload: {
        name: "set_power",
        parameters: {
          power: true
        }
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      deviceId: "test-light",
      state: {
        power: true
      }
    });

    await app.close();
  });

  it("rejects an invalid command payload", async () => {
    const { app } = await createApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/devices/test-light/commands",
      payload: {
        name: "set_power",
        parameters: {
          power: "yes"
        }
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("INVALID_COMMAND");

    await app.close();
  });

  it("returns 404 for an unknown device", async () => {
    const { app } = await createApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/devices/unknown/state"
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe("DEVICE_NOT_FOUND");

    await app.close();
  });

  it("returns 404 when commanding an unknown device", async () => {
    const { app } = await createApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/devices/unknown/commands",
      payload: {
        name: "toggle"
      }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe("DEVICE_NOT_FOUND");

    await app.close();
  });

  it("returns 409 for a duplicate device", async () => {
    const { app } = await createApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/devices",
      payload: testDevice
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe("DEVICE_ALREADY_REGISTERED");

    await app.close();
  });

  it("returns 500 when the driver is not configured", async () => {
    const { app } = await createApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/devices",
      payload: {
        ...testDevice,
        id: "orphan-device",
        driverId: "missing-driver"
      }
    });

    expect(response.statusCode).toBe(500);
    expect(response.json().code).toBe("DRIVER_NOT_FOUND");

    await app.close();
  });

  it("returns 400 when the driver is incompatible", async () => {
    const { app } = await buildApp({
      additionalDrivers: [createStubDriver("reject", false)]
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/devices",
      payload: {
        ...testDevice,
        id: "rejected-device",
        driverId: "reject"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("DRIVER_INCOMPATIBLE");

    await app.close();
  });

  it("returns 400 for an unsupported command", async () => {
    const { app } = await createApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/devices/test-light/commands",
      payload: {
        name: "blink"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("UNSUPPORTED_COMMAND");

    await app.close();
  });

  it("returns 400 when the device lacks the required capability", async () => {
    const { app, deviceManager } = await buildApp();

    deviceManager.registerDevice({
      ...testDevice,
      id: "sensor-1",
      type: "sensor",
      capabilities: [],
      createdAt: new Date().toISOString()
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/devices/sensor-1/commands",
      payload: {
        name: "toggle"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("INSUFFICIENT_CAPABILITY");

    await app.close();
  });

  it("returns 400 for invalid input", async () => {
    const { app } = await createApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/devices",
      payload: {
        id: ""
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("INVALID_INPUT");

    await app.close();
  });
});
