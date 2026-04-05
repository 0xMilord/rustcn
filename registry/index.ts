/**
 * Component registry — simple mapping layer.
 * Not a platform. Just a registry. Add -> it works.
 */

import REGISTRY from './registry.json' assert { type: 'json' };

export interface ComponentEntry {
  version: string;
  description: string;
  files: string[];
  engine?: string;
  fallback?: string;
  path: string;
}

export interface EngineEntry {
  version: string;
  path: string;
  threshold: number;
}

export interface Registry {
  version: string;
  components: Record<string, ComponentEntry>;
  engines: Record<string, EngineEntry>;
}

export const registry = REGISTRY as unknown as Registry;

export function getComponent(name: string): ComponentEntry | undefined {
  return registry.components[name];
}

export function getEngine(name: string): EngineEntry | undefined {
  return registry.engines[name];
}

export function listComponents(): string[] {
  return Object.keys(registry.components);
}

export function listEngines(): string[] {
  return Object.keys(registry.engines);
}
