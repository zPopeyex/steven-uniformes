import { getApp } from "firebase/app";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

let emulatorWired = false;

export function getFunctionsClient(app, opts = {}) {
  const theApp = app || getApp();
  const functions = getFunctions(theApp, "us-central1");

  // To avoid confusion, emulator is used only if explicitly forced via env or option
  const wantsEmu = opts.useEmulator === true || import.meta.env.VITE_FORCE_FUNCTIONS_EMULATOR === "1";

  if (wantsEmu && !emulatorWired) {
    try {
      const host = import.meta.env.VITE_FUNCTIONS_EMU_HOST || "127.0.0.1";
      const port = Number(import.meta.env.VITE_FUNCTIONS_EMU_PORT || 5001);
      connectFunctionsEmulator(functions, host, port);
      emulatorWired = true;
      // eslint-disable-next-line no-console
      console.info(`Functions emulator connected at ${host}:${port}`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Could not connect functions emulator", e);
    }
  }

  return functions;
}
