import type { DeviceDriver } from "../domain/device-driver.js";
import {
  DriverAlreadyRegisteredError,
  DriverNotFoundError
} from "../domain/errors.js";

export class DriverRegistry {
  private readonly drivers = new Map<string, DeviceDriver>();

  register(driver: DeviceDriver): void {
    if (this.drivers.has(driver.id)) {
      throw new DriverAlreadyRegisteredError(driver.id);
    }

    this.drivers.set(driver.id, driver);
  }

  get(driverId: string): DeviceDriver {
    const driver = this.drivers.get(driverId);

    if (!driver) {
      throw new DriverNotFoundError(driverId);
    }

    return driver;
  }

  has(driverId: string): boolean {
    return this.drivers.has(driverId);
  }

  list(): DeviceDriver[] {
    return [...this.drivers.values()];
  }
}
