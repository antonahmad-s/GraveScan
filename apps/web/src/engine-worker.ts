import { createQueuedMessageHandler, createWorkerHandler, type WorkerReply, type WorkerRequest } from "./worker-protocol.ts";

// Dedicated worker entry, bundled by `pnpm build` into /assets/worker.<hash>.js. Requests are
// handled one at a time in arrival order, so engine state changes never interleave.

type WorkerScope = {
  onmessage: ((event: { data: WorkerRequest }) => void) | null;
  postMessage: (message: WorkerReply) => void;
};

const scope = globalThis as unknown as WorkerScope;
const handle = createWorkerHandler();
const enqueue = createQueuedMessageHandler(handle, (reply) => scope.postMessage(reply));

scope.onmessage = (event) => {
  void enqueue(event.data);
};
