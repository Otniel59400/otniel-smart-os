import { describe, expect, it } from "vitest";
import Fastify from "fastify";
import { DriverRegistry } from "../src/modules/devices/application/driver-registry.js";
import { DeviceManager } from "../src/modules/devices/application/device-manager.js";
import { MockDriver } from "../src/modules/devices/infrastructure/mock-driver.js";
import { registerDeviceRoutes } from "../src/modules/devices/http/device-routes.js";

function createApp() {
  const app = Fastify();

  const registry = new DriverRegistry();
  registry.register(new MockDriver());

  const manager = new DeviceManager(registry);

  const device = {
    id: "test-light",
    name: "Luz de Teste",
    type: "light" as const,
    driverId: "mock",
    capabilities: ["power"],
    metadata: {
      virtual: true
    },
    createdAt: new Date().toISOString()
  };

  manager.initialize();
  manager.registerDevice(device);

  registerDeviceRoutes(app, manager);

  return app;
}

describe("Device HTTP routes", () => {
  it("lists devices", async () => {
    const app = createApp();

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
    const app = createApp();

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
    const app = createApp();

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

  it("rejects an invalid command", async () => {
    const app = createApp();

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

    await app.close();
  });

  it("returns 404 for an unknown device", async () => {
    const app = createApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/devices/unknown/state"
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });
});
