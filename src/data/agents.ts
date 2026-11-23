import type { IconName } from '@/components/icons';
import type { LevelId } from './models';

export type ModeId =
  | 'general'
  | 'plan'
  | 'build'
  | 'code'
  | 'debug'
  | 'research'
  | 'fun'
  | 'automation'
  | 'red'
  | 'blue';

export interface Mode {
  id: ModeId;
  label: string;
  icon: IconName;
  hint: string;
}

export const MODES: Mode[] = [
  { id: 'general', label: 'General', icon: 'chat', hint: 'Conversación libre' },
  { id: 'plan', label: 'Planificación', icon: 'tasks', hint: 'Divide objetivos en pasos' },
  { id: 'build', label: 'Construcción', icon: 'box', hint: 'Arma proyectos completos' },
  { id: 'code', label: 'Programación', icon: 'term', hint: 'Escribe y explica código' },
  { id: 'debug', label: 'Depuración', icon: 'search', hint: 'Encuentra y corrige errores' },
  { id: 'research', label: 'Investigación', icon: 'folder', hint: 'Analiza fuentes y resume' },
  { id: 'fun', label: 'Diversión', icon: 'spark', hint: 'Juegos, historias, ideas' },
  { id: 'automation', label: 'Automatización', icon: 'sliders', hint: 'Tareas y scripts repetibles' },
  { id: 'red', label: 'Red Cyber', icon: 'chip', hint: 'Ofensiva autorizada (pentest, CTF)' },
  { id: 'blue', label: 'Blue Cyber', icon: 'gear', hint: 'Defensa, hardening, detección' },
];

export interface Level {
  id: LevelId;
  label: string;
  hint: string;
}

export const LEVELS: Level[] = [
  { id: 'lite', label: 'Fire Lite', hint: 'Rápido y ligero' },
  { id: 'pro', label: 'Fire Pro', hint: 'Equilibrado, con herramientas' },
  { id: 'max', label: 'Fire Max', hint: 'Máxima capacidad' },
];

export function modeById(id: ModeId): Mode {
  return MODES.find((m) => m.id === id) ?? MODES[0]!;
}

export function levelById(id: LevelId): Level {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0]!;
}
