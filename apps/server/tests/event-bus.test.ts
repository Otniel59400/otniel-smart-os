import { describe, expect, it } from "vitest";
import { EventBus } from "../src/modules/events/application/event-bus.js";

describe("EventBus", () => {
  it("publica um evento para os inscritos", async () => {
    const bus = new EventBus();

    const received: unknown[] = [];

    bus.subscribe("device.state.changed", (event) => {
      received.push(event);
    });

    await bus.publish("device.state.changed", {
      deviceId: "test-light",
      state: {
        power: true
      }
    });

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      type: "device.state.changed",
      payload: {
        deviceId: "test-light",
        state: {
          power: true
        }
      }
    });
  });

  it("não entrega eventos para outro tipo de evento", async () => {
    const bus = new EventBus();

    let called = false;

    bus.subscribe("device.registered", () => {
      called = true;
    });

    await bus.publish("device.state.changed", {
      deviceId: "test-light"
    });

    expect(called).toBe(false);
  });

  it("permite cancelar uma inscrição", async () => {
    const bus = new EventBus();

    let count = 0;

    const unsubscribe = bus.subscribe("device.state.changed", () => {
      count++;
    });

    await bus.publish("device.state.changed", {});
    unsubscribe();
    await bus.publish("device.state.changed", {});

    expect(count).toBe(1);
  });

  it("suporta handlers assíncronos", async () => {
    const bus = new EventBus();

    let result = "";

    bus.subscribe("test.event", async () => {
      await Promise.resolve();
      result = "completed";
    });

    await bus.publish("test.event", {});

    expect(result).toBe("completed");
  });
});
