import { createWorkerHandler, type WorkerReply, type WorkerRequest } from "./worker-protocol.ts";

// Dedicated worker entry, bundled by `pnpm build` into /assets/worker.<hash>.js. Requests are
// handled one at a time in arrival order, so engine state changes never interleave.

type WorkerScope = {
  onmessage: ((event: { data: WorkerRequest }) => void) | null;
  postMessage: (message: WorkerReply) => void;
};

const scope = globalThis as unknown as WorkerScope;
const handle = createWorkerHandler();
let queue: Promise<void> = Promise.resolve();

scope.onmessage = (event) => {
  queue = queue.then(async () => scope.postMessage(await handle(event.data)));
};
