import type { Device } from "./device.js";

/**
 * Maps command names to the capabilities a device must declare.
 * Command names are not assumed to match capability names.
 */
export const COMMAND_REQUIRED_CAPABILITIES: Readonly<
  Record<string, readonly string[]>
> = {
  set_power: ["power"],
  toggle: ["power"]
};

export function getRequiredCapabilities(
  commandName: string
): readonly string[] | undefined {
  return COMMAND_REQUIRED_CAPABILITIES[commandName];
}

export function missingCapabilities(
  device: Device,
  required: readonly string[]
): string[] {
  return required.filter((capability) => !device.capabilities.includes(capability));
}
