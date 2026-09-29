import type { DeviceDriver } from "../domain/device-driver.js";

export class DriverRegistry {
  private readonly drivers = new Map<string, DeviceDriver>();

  register(driver: DeviceDriver): void {
    if (this.drivers.has(driver.id)) {
      throw new Error(`Driver "${driver.id}" already registered`);
    }

    this.drivers.set(driver.id, driver);
  }

  get(driverId: string): DeviceDriver {
    const driver = this.drivers.get(driverId);

    if (!driver) {
      throw new Error(`Driver "${driverId}" not found`);
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
