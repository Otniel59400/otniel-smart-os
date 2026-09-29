export class DomainError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = new.target.name;
    this.code = code;
  }
}

export class DeviceNotFoundError extends DomainError {
  constructor(deviceId: string) {
    super("DEVICE_NOT_FOUND", `Device "${deviceId}" not found`);
  }
}

export class DriverNotFoundError extends DomainError {
  constructor(driverId: string) {
    super("DRIVER_NOT_FOUND", `Driver "${driverId}" not found`);
  }
}

export class DeviceAlreadyRegisteredError extends DomainError {
  constructor(deviceId: string) {
    super("DEVICE_ALREADY_REGISTERED", `Device "${deviceId}" already registered`);
  }
}

export class DriverAlreadyRegisteredError extends DomainError {
  constructor(driverId: string) {
    super("DRIVER_ALREADY_REGISTERED", `Driver "${driverId}" already registered`);
  }
}

export class DriverIncompatibleError extends DomainError {
  constructor(driverId: string, deviceId: string) {
    super(
      "DRIVER_INCOMPATIBLE",
      `Driver "${driverId}" does not support device "${deviceId}"`
    );
  }
}

export class UnsupportedCommandError extends DomainError {
  constructor(commandName: string) {
    super("UNSUPPORTED_COMMAND", `Unsupported command "${commandName}"`);
  }
}

export class InsufficientCapabilityError extends DomainError {
  constructor(deviceId: string, commandName: string, missing: readonly string[]) {
    super(
      "INSUFFICIENT_CAPABILITY",
      `Device "${deviceId}" lacks capabilities required by command "${commandName}": ${missing.join(", ")}`
    );
  }
}

export class InvalidCommandError extends DomainError {
  constructor(message: string) {
    super("INVALID_COMMAND", message);
  }
}
