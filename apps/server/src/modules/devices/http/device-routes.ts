import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { DeviceManager } from "../application/device-manager.js";

const commandSchema = z.object({
  name: z.string().min(1),
  parameters: z.record(z.string(), z.unknown()).optional()
});

const createDeviceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["light", "switch", "plug", "fan", "sensor"]),
  driverId: z.string().min(1),
  roomId: z.string().optional(),
  capabilities: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export function registerDeviceRoutes(
  app: FastifyInstance,
  deviceManager: DeviceManager
): void {
  app.get("/api/devices", async () => {
    return deviceManager.listDevices();
  });

  app.get("/api/devices/:id", async (request) => {
    const { id } = request.params as { id: string };

    return deviceManager.getDevice(id);
  });

  app.get("/api/devices/:id/state", async (request) => {
    const { id } = request.params as { id: string };

    return deviceManager.getDeviceState(id);
  });

  app.post("/api/devices/:id/commands", async (request, reply) => {
    const { id } = request.params as { id: string };

    const parsed = commandSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid command",
        code: "INVALID_INPUT",
        details: parsed.error.issues
      });
    }

    const state = await deviceManager.executeCommand(id, parsed.data);

    return {
      deviceId: id,
      state
    };
  });

  app.post("/api/devices", async (request, reply) => {
    const parsed = createDeviceSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid device",
        code: "INVALID_INPUT",
        details: parsed.error.issues
      });
    }

    const device = {
      ...parsed.data,
      createdAt: new Date().toISOString()
    };

    await deviceManager.registerDevice(device);

    return reply.status(201).send(device);
  });
}
