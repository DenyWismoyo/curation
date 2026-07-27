const { performance } = require('perf_hooks');

const chunks = Array.from({length: 5}, (_, i) => [1,2,3,4,5,6,7,8,9,10]);

const getDocsMock = async (chunk) => {
  await new Promise(resolve => setTimeout(resolve, 50));
  return chunk.map(id => ({ id, data: () => ({ val: id }) }));
};

async function sequentialFetch() {
  const start = performance.now();
  let fetchedModules = [];
  for (const chunk of chunks) {
    const snapTpls = await getDocsMock(chunk);
    snapTpls.forEach(t => fetchedModules.push({ id: t.id, ...t.data() }));
  }
  const end = performance.now();
  console.log(`Sequential Fetch (Baseline): ${end - start}ms`);
  return fetchedModules;
}

async function parallelFetch() {
  const start = performance.now();
  const fetchPromises = chunks.map(async (chunk) => {
    const snapTpls = await getDocsMock(chunk);
    return snapTpls.map(t => ({ id: t.id, ...t.data() }));
  });

  const results = await Promise.all(fetchPromises);
  const fetchedModules = results.flat();
  const end = performance.now();
  console.log(`Parallel Fetch (Optimized): ${end - start}ms`);
  return fetchedModules;
}

async function run() {
  console.log("Running simulation of chunk fetching...");
  await sequentialFetch();
  await parallelFetch();
}

run();
