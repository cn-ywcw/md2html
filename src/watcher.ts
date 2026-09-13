import { watch as createWatcher, type FSWatcher } from "node:fs";
import { basename, resolve } from "node:path";
import type { ConvertOptions, ConversionResult } from "./converter.js";
import { convertFile } from "./converter.js";

export interface WatchCallbacks {
  onSuccess: (result: ConversionResult) => void;
  onConversionError: (error: unknown) => void;
  onWatchError?: (error: unknown) => void;
}

export interface WatchHandle {
  closed: Promise<void>;
  close: () => void;
}

const DEBOUNCE_MS = 100;

export function watchInput(options: ConvertOptions, callbacks: WatchCallbacks): WatchHandle {
  const inputPath = resolve(options.inputPath);
  const inputFileName = basename(inputPath);

  let watcher: FSWatcher | undefined;
  let timer: NodeJS.Timeout | undefined;
  let conversionRunning = false;
  let conversionPending = false;
  let isClosed = false;
  let resolveClosed!: () => void;

  const closed = new Promise<void>((resolvePromise) => {
    resolveClosed = resolvePromise;
  });

  const close = (): void => {
    if (isClosed) {
      return;
    }

    isClosed = true;
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    watcher?.close();
    resolveClosed();
  };

  const runConversion = async (): Promise<void> => {
    if (isClosed) {
      return;
    }

    if (conversionRunning) {
      conversionPending = true;
      return;
    }

    conversionRunning = true;
    try {
      const result = await convertFile(options);
      if (!isClosed) {
        callbacks.onSuccess(result);
      }
    } catch (error) {
      if (!isClosed) {
        callbacks.onConversionError(error);
      }
    } finally {
      conversionRunning = false;
      if (conversionPending && !isClosed) {
        conversionPending = false;
        scheduleConversion();
      }
    }
  };

  const scheduleConversion = (): void => {
    if (isClosed) {
      return;
    }

    if (timer !== undefined) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      timer = undefined;
      void runConversion();
    }, DEBOUNCE_MS);
  };

  try {
    watcher = createWatcher(inputPath, (eventType, changedFileName) => {
      if (isClosed) {
        return;
      }

      const changedName = changedFileName?.toString();
      if (changedName !== undefined && basename(changedName) !== inputFileName) {
        return;
      }

      // Both change and rename events are useful here: many editors save by
      // writing a temporary file and replacing the original one.
      if (eventType === "change" || eventType === "rename") {
        scheduleConversion();
      }
    });

    watcher.on("error", (error) => {
      if (!isClosed) {
        callbacks.onWatchError?.(error);
      }
    });
  } catch (error) {
    close();
    throw error;
  }

  return { closed, close };
}




