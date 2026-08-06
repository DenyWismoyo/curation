const { performance } = require('perf_hooks');

// Mock latency
const networkLatency = 50;

async function mockUpdateDoc() {
  return new Promise(resolve => setTimeout(resolve, networkLatency));
}

async function mockBatchCommit() {
  return new Promise(resolve => setTimeout(resolve, networkLatency));
}

async function runBenchmark(numItems) {
  console.log(`Benchmarking with ${numItems} items...`);

  // Benchmark Promise.all (N concurrent network requests)
  const startPromise = performance.now();
  const promises = [];
  for (let i = 0; i < numItems; i++) {
    promises.push(mockUpdateDoc());
  }
  await Promise.all(promises);
  const endPromise = performance.now();
  console.log(`Promise.all time: ${(endPromise - startPromise).toFixed(2)}ms`);

  // Benchmark Batch (1 network request)
  // We simulate building the batch (instant) and 1 commit request
  const startBatch = performance.now();
  let batch = [];
  for (let i = 0; i < numItems; i++) {
    batch.push({ id: i });
  }
  await mockBatchCommit();
  const endBatch = performance.now();
  console.log(`Batch commit time: ${(endBatch - startBatch).toFixed(2)}ms`);
}

runBenchmark(100);
