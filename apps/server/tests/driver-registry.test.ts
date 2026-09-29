import { describe, expect, it } from "vitest";
import { DriverRegistry } from "../src/modules/devices/application/driver-registry.js";
import {
  DriverAlreadyRegisteredError,
  DriverNotFoundError
} from "../src/modules/devices/domain/errors.js";
import { MockDriver } from "../src/modules/devices/infrastructure/mock-driver.js";

describe("DriverRegistry", () => {
  it("rejects a duplicate driver", () => {
    const registry = new DriverRegistry();
    const driver = new MockDriver();

    registry.register(driver);

    expect(() => registry.register(new MockDriver())).toThrow(
      DriverAlreadyRegisteredError
    );
  });

  it("rejects a missing driver", () => {
    const registry = new DriverRegistry();

    expect(() => registry.get("missing")).toThrow(DriverNotFoundError);
  });
});
