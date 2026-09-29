import Fastify, { type FastifyInstance } from "fastify";
import type { Device } from "./modules/devices/domain/device.js";
import type { DeviceDriver } from "./modules/devices/domain/device-driver.js";
import { DeviceManager } from "./modules/devices/application/device-manager.js";
import { DriverRegistry } from "./modules/devices/application/driver-registry.js";
import { registerDeviceRoutes } from "./modules/devices/http/device-routes.js";
import { registerHttpErrorHandler } from "./modules/devices/http/http-errors.js";
import { MockDriver } from "./modules/devices/infrastructure/mock-driver.js";

export const APP_VERSION = "0.1.0";

export const demoDevices: Device[] = [
  {
    id: "light-bedroom",
    name: "Luz do Quarto",
    type: "light",
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
    type: "plug",
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
    type: "fan",
    driverId: "mock",
    roomId: "bedroom",
    capabilities: ["power"],
    metadata: {
      virtual: true
    },
    createdAt: new Date().toISOString()
  }
];

export interface DeviceRuntime {
  driverRegistry: DriverRegistry;
  deviceManager: DeviceManager;
  mockDriver: MockDriver;
}

export interface BuildAppOptions {
  logger?: boolean;
  seedDemoDevices?: boolean;
  runtime?: DeviceRuntime;
  additionalDrivers?: DeviceDriver[];
}

export interface AppContext {
  app: FastifyInstance;
  deviceManager: DeviceManager;
  driverRegistry: DriverRegistry;
}

export function createDeviceRuntime(
  additionalDrivers: DeviceDriver[] = []
): DeviceRuntime {
  const driverRegistry = new DriverRegistry();
  const mockDriver = new MockDriver();

  driverRegistry.register(mockDriver);

  for (const driver of additionalDrivers) {
    driverRegistry.register(driver);
  }

  const deviceManager = new DeviceManager(driverRegistry);

  return {
    driverRegistry,
    deviceManager,
    mockDriver
  };
}

export function seedDemoDevices(deviceManager: DeviceManager): void {
  for (const device of demoDevices) {
    deviceManager.registerDevice(device);
  }
}

export async function buildApp(
  options: BuildAppOptions = {}
): Promise<AppContext> {
  const runtime =
    options.runtime ?? createDeviceRuntime(options.additionalDrivers);

  const app = Fastify({
    logger: options.logger ?? false
  });

  registerHttpErrorHandler(app);

  app.get("/api/system/status", async () => {
    return {
      status: "online",
      version: APP_VERSION,
      uptime: process.uptime(),
      devices: runtime.deviceManager.listDevices().length
    };
  });

  registerDeviceRoutes(app, runtime.deviceManager);

  await runtime.deviceManager.initialize();

  if (options.seedDemoDevices) {
    seedDemoDevices(runtime.deviceManager);
  }

  return {
    app,
    deviceManager: runtime.deviceManager,
    driverRegistry: runtime.driverRegistry
  };
}
