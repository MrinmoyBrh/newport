export interface Principle {
  number: string;
  title: string;
  subtitle: string;
  description: string;
  codeAccent: string;
}

export const principles: Principle[] = [
  {
    number: '01',
    title: 'Failure as a First-Class State',
    subtitle: 'Resilience By Design',
    description: 'Upstream services will fail, network partitions will occur, and rate limits will be reached. Rather than treating failures as exceptions, systems must incorporate stateful circuit breakers (CLOSED / OPEN / HALF_OPEN), automated fallbacks, and dead-letter queues into the core control loop.',
    codeAccent: 'circuitBreaker.getState() !== "OPEN" ? execute() : fallback();'
  },
  {
    number: '02',
    title: 'Asynchronous Backpressure',
    subtitle: 'Decoupling Ingress From Compute',
    description: 'A backend that accepts burst traffic synchronously will inevitably suffer memory exhaustion and worker starvation. Decoupling ingress via persistent distributed task queues (BullMQ/Redis) ensures predictable compute latency and guaranteed delivery under extreme spikes.',
    codeAccent: 'aiQueue.add("job", payload, { attempts: 3, backoff: "exponential" });'
  },
  {
    number: '03',
    title: 'Idempotency & Cryptographic Verifiability',
    subtitle: 'Zero Duplication, Zero Ambiguity',
    description: 'Every distributed mutation must be repeatable without side effects. Redundant webhooks are deduplicated via atomic distributed locks, files are verified end-to-end using SHA-256 content hashes, and repetitive queries are deterministically resolved.',
    codeAccent: 'const hash = crypto.createHash("sha256").update(normalized).digest("hex");'
  },
  {
    number: '04',
    title: 'Zero-Trust Sandboxing',
    subtitle: 'Strict Operational Boundaries',
    description: 'Untrusted user input and arbitrary execution must be treated as hostile. Workloads run inside air-gapped, ephemeral Docker sandboxes stripped of networking (NetworkDisabled: true), memory-capped, CPU-throttled, and executed under unprivileged system users.',
    codeAccent: 'createContainer({ NetworkDisabled: true, Memory: 128MB, AutoRemove: true });'
  },
  {
    number: '05',
    title: 'Observability Over Guesswork',
    subtitle: 'Verifiable Operational Telemetry',
    description: 'Distributed architectures cannot be diagnosed through speculation. Real-time telemetry, structured schema migrations, token quota auditing, and synchronized pub/sub event logs deliver absolute clarity into system throughput and latency distribution.',
    codeAccent: 'pool.query("INSERT INTO usage_logs (latency_ms, tokens) VALUES (...)");'
  }
];
