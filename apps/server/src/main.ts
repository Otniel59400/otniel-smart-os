import Fastify from "fastify";
import { DriverRegistry } from "./modules/devices/application/driver-registry.js";
import { DeviceManager } from "./modules/devices/application/device-manager.js";
import { MockDriver } from "./modules/devices/infrastructure/mock-driver.js";
import { registerDeviceRoutes } from "./modules/devices/http/device-routes.js";

const app = Fastify({
  logger: true
});

const driverRegistry = new DriverRegistry();
const mockDriver = new MockDriver();

driverRegistry.register(mockDriver);

const deviceManager = new DeviceManager(driverRegistry);

const demoDevices = [
  {
    id: "light-bedroom",
    name: "Luz do Quarto",
    type: "light" as const,
    driverId: "mock",
    roomId: "bedroom",
    capabilities: ["power"],
    metadata: {
      virtual: true
    },
    createdAt: new Date().toISOString()
  },
  {
    id: "plug-tv",
    name: "Tomada da TV",
    type: "plug" as const,
    driverId: "mock",
    roomId: "living-room",
    capabilities: ["power"],
    metadata: {
      virtual: true
    },
    createdAt: new Date().toISOString()
  },
  {
    id: "fan-bedroom",
    name: "Ventoinha do Quarto",
    type: "fan" as const,
    driverId: "mock",
    roomId: "bedroom",
    capabilities: ["power"],
    metadata: {
      virtual: true
    },
    createdAt: new Date().toISOString()
  }
];

app.get("/api/system/status", async () => {
  return {
    status: "online",
    version: "0.1.0",
    uptime: process.uptime(),
    devices: deviceManager.listDevices().length
  };
});

registerDeviceRoutes(app, deviceManager);

const start = async () => {
  try {
    await deviceManager.initialize();

    for (const device of demoDevices) {
      deviceManager.registerDevice(device);
    }

    await app.listen({
      host: "127.0.0.1",
      port: 3000
    });
  } catch (error) {
    app.log.error(error);
    await deviceManager.dispose();
    process.exit(1);
  }
};

const shutdown = async () => {
  await app.close();
  await deviceManager.dispose();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start();
