import { describe, expect, it } from "vitest";
import { APP_VERSION, buildApp } from "../src/app.js";

describe("buildApp", () => {
  it("creates a Fastify app with an initialized device manager", async () => {
    const { app, deviceManager, driverRegistry } = await buildApp();

    expect(app).toBeDefined();
    expect(deviceManager.listDevices()).toHaveLength(0);
    expect(driverRegistry.has("mock")).toBe(true);

    await app.close();
  });

  it("exposes system status without demo devices", async () => {
    const { app } = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/system/status"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "online",
      version: APP_VERSION,
      devices: 0
    });
    expect(typeof response.json().uptime).toBe("number");

    await app.close();
  });

  it("seeds demo devices when requested", async () => {
    const { app, deviceManager } = await buildApp({
      seedDemoDevices: true
    });

    expect(deviceManager.listDevices()).toHaveLength(3);

    const response = await app.inject({
      method: "GET",
      url: "/api/system/status"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().devices).toBe(3);

    await app.close();
  });
});
