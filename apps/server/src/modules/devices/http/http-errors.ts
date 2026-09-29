import type { FastifyInstance } from "fastify";
import { DomainError } from "../domain/errors.js";

const STATUS_BY_CODE: Record<string, number> = {
  DEVICE_NOT_FOUND: 404,
  DEVICE_ALREADY_REGISTERED: 409,
  DRIVER_NOT_FOUND: 500,
  DRIVER_ALREADY_REGISTERED: 500,
  DRIVER_INCOMPATIBLE: 400,
  UNSUPPORTED_COMMAND: 400,
  INSUFFICIENT_CAPABILITY: 400,
  INVALID_COMMAND: 400
};

export function registerHttpErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof DomainError) {
      const status = STATUS_BY_CODE[error.code] ?? 500;

      return reply.status(status).send({
        error: error.message,
        code: error.code
      });
    }

    app.log.error(error);

    return reply.status(500).send({
      error: "Internal server error",
      code: "INTERNAL_ERROR"
    });
  });
}
