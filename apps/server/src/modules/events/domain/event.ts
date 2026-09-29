export interface AppEvent<TPayload = unknown> {
  type: string;
  payload: TPayload;
  occurredAt: string;
}
