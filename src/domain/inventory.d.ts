import type { Action, Role, Stock, Totals, WarehouseState } from "./types";
export function qty(value: number): string;
export function grams(value: unknown): number;
export function seed(): WarehouseState;
export function stock(state: WarehouseState, id: string): Stock;
export function totals(state: WarehouseState): Totals;
export function validate(state: unknown): true;
export function transition(
  previous: WarehouseState,
  action: Action,
  role?: Role,
  now?: string,
): WarehouseState;
