import { buildApp } from "./app.js";

const start = async () => {
  const { app, deviceManager } = await buildApp({
    logger: true,
    seedDemoDevices: true
  });

  const shutdown = async () => {
    await app.close();
    await deviceManager.dispose();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    await app.listen({
      host: "127.0.0.1",
      port: 3000
    });
  } catch (error) {
    app.log.error(error);
    await deviceManager.dispose();
    process.exit(1);
  }
};

start();
