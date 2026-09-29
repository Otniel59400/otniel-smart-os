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

  app.get("/api/devices/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      return deviceManager.getDevice(id);
    } catch (error) {
      return reply.status(404).send({
        error: error instanceof Error ? error.message : "Device not found"
      });
    }
  });

  app.get("/api/devices/:id/state", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      return await deviceManager.getDeviceState(id);
    } catch (error) {
      return reply.status(404).send({
        error: error instanceof Error ? error.message : "Device not found"
      });
    }
  });

  app.post("/api/devices/:id/commands", async (request, reply) => {
    const { id } = request.params as { id: string };

    const parsed = commandSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid command",
        details: parsed.error.issues
      });
    }

    try {
      const state = await deviceManager.executeCommand(id, parsed.data);

      return {
        deviceId: id,
        state
      };
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : "Command failed"
      });
    }
  });

  app.post("/api/devices", async (request, reply) => {
    const parsed = createDeviceSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid device",
        details: parsed.error.issues
      });
    }

    try {
      const device = {
        ...parsed.data,
        createdAt: new Date().toISOString()
      };

      deviceManager.registerDevice(device);

      return reply.status(201).send(device);
    } catch (error) {
      return reply.status(400).send({
        error: error instanceof Error ? error.message : "Device registration failed"
      });
    }
  });
}
