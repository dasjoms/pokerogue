import type { SerializedState } from "#app/utils/serialize";
import { promises as fs } from "node:fs";
import { resolve } from "node:path";

export interface TransitionRecord {
  state: SerializedState;
  action: number;
  reward: number;
  nextState: SerializedState;
  done: boolean;
}

export default class TransitionLogger {
  private records: TransitionRecord[] = [];

  log(record: TransitionRecord): void {
    this.records.push(record);
  }

  clear(): void {
    this.records = [];
  }

  getRecords(): TransitionRecord[] {
    return this.records;
  }

  toJSON(): string {
    return JSON.stringify(this.records);
  }

  /**
   * Write the current log to a file in JSON format.
   */
  async saveToFile(path: string): Promise<void> {
    const file = resolve(path);
    await fs.writeFile(file, this.toJSON(), "utf8");
  }

  /**
   * Load transition records from a JSON file, replacing existing records.
   */
  async loadFromFile(path: string): Promise<void> {
    const file = resolve(path);
    const text = await fs.readFile(file, "utf8");
    this.records = JSON.parse(text) as TransitionRecord[];
  }
}
