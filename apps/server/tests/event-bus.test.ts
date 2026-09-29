import { describe, expect, it, vi } from "vitest";
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

  it("executa múltiplos handlers na ordem de inscrição", async () => {
    const bus = new EventBus();
    const order: number[] = [];

    bus.subscribe("test.event", async () => {
      await Promise.resolve();
      order.push(1);
    });

    bus.subscribe("test.event", () => {
      order.push(2);
    });

    bus.subscribe("test.event", () => {
      order.push(3);
    });

    await bus.publish("test.event", {});

    expect(order).toEqual([1, 2, 3]);
  });

  it("rejeita o publish quando um handler lança um erro", async () => {
    const bus = new EventBus();
    const error = new Error("subscriber failed");

    bus.subscribe("test.event", () => {
      throw error;
    });

    await expect(bus.publish("test.event", {})).rejects.toBe(error);
  });

  it("preserva o erro original do handler", async () => {
    const bus = new EventBus();
    const error = new Error("original error");

    bus.subscribe("test.event", async () => {
      throw error;
    });

    await expect(bus.publish("test.event", {})).rejects.toBe(error);
  });

  it("interrompe os handlers seguintes após uma falha", async () => {
    const bus = new EventBus();
    const calls: string[] = [];

    bus.subscribe("test.event", () => {
      calls.push("first");
      throw new Error("failed");
    });

    bus.subscribe("test.event", () => {
      calls.push("second");
    });

    await expect(bus.publish("test.event", {})).rejects.toThrow("failed");

    expect(calls).toEqual(["first"]);
  });

  it("não falha quando o evento não possui subscribers", async () => {
    const bus = new EventBus();

    await expect(
      bus.publish("event.without.subscribers", {
        value: 123
      })
    ).resolves.toBeUndefined();
  });

  it("mantém handlers de eventos diferentes isolados", async () => {
    const bus = new EventBus();

    const stateChanged = vi.fn();
    const registered = vi.fn();

    bus.subscribe("device.state.changed", stateChanged);
    bus.subscribe("device.registered", registered);

    await bus.publish("device.state.changed", {
      deviceId: "test-light"
    });

    expect(stateChanged).toHaveBeenCalledTimes(1);
    expect(registered).not.toHaveBeenCalled();
  });

  it("permite cancelar uma inscrição específica sem remover outras", async () => {
    const bus = new EventBus();

    const first = vi.fn();
    const second = vi.fn();

    const unsubscribeFirst = bus.subscribe("test.event", first);
    bus.subscribe("test.event", second);

    unsubscribeFirst();

    await bus.publish("test.event", {});

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
