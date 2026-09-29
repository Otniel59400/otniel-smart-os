import type { AppEvent } from "../domain/event.js";

export type EventHandler<TPayload = unknown> = (
  event: AppEvent<TPayload>
) => void | Promise<void>;

export class EventBus {
  private readonly handlers = new Map<string, Set<EventHandler>>();

  subscribe<TPayload>(
    eventType: string,
    handler: EventHandler<TPayload>
  ): () => void {
    const handlers =
      this.handlers.get(eventType) ?? new Set<EventHandler>();

    handlers.add(handler as EventHandler);
    this.handlers.set(eventType, handlers);

    return () => {
      handlers.delete(handler as EventHandler);

      if (handlers.size === 0) {
        this.handlers.delete(eventType);
      }
    };
  }

  async publish<TPayload>(
    type: string,
    payload: TPayload
  ): Promise<void> {
    const event: AppEvent<TPayload> = {
      type,
      payload,
      occurredAt: new Date().toISOString()
    };

    const handlers = this.handlers.get(type);

    if (!handlers) {
      return;
    }

    for (const handler of handlers) {
      await handler(event);
    }
  }
}
