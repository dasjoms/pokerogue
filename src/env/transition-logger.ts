import type { SerializedState } from "#app/utils/serialize";
import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";

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
  async saveToFile(path: string, compress = false): Promise<void> {
    const file = resolve(path);
    const data = this.toJSON();
    if (compress) {
      const buf = gzipSync(data);
      await fs.writeFile(file, buf);
    } else {
      await fs.writeFile(file, data, "utf8");
    }
  }

  /**
   * Load transition records from a JSON file, replacing existing records.
   */
  async loadFromFile(path: string): Promise<void> {
    const file = resolve(path);
    const buf = await fs.readFile(file);
    let text: string;
    try {
      text = gunzipSync(buf).toString("utf8");
    } catch {
      text = buf.toString("utf8");
    }
    this.records = JSON.parse(text) as TransitionRecord[];
  }
}
