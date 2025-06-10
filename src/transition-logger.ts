import { type SerializedState } from "#app/utils/serialize";
import type { RogueAction } from "#app/rogue-env";

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
}
