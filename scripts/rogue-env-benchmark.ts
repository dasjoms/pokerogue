import "./headless-globals";
import { benchmark } from "#env";

const steps = parseInt(process.argv[2] ?? process.env.ROGUE_BENCH_STEPS ?? "1000", 10);
const seed = process.env.ROGUE_SEED;

const result = await benchmark(steps, seed);
const seconds = (result.ms / 1000).toFixed(2);
const sps = result.sps.toFixed(2);
console.log(`Executed ${result.steps} steps in ${seconds}s (${sps} steps/s)`);
