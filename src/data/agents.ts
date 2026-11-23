import type { IconName } from '@/components/icons';
import { modelById, type LocalModel } from './models';

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
  /** Modelo que usa el modo por defecto (PLAN, sección 3). */
  modelId: string;
}

export const MODES: Mode[] = [
  { id: 'general', label: 'General', icon: 'chat', hint: 'Conversación libre', modelId: 'lfm3-1.7b' },
  { id: 'plan', label: 'Planificación', icon: 'tasks', hint: 'Divide objetivos en pasos', modelId: 'lfm3-1.7b' },
  { id: 'build', label: 'Construcción', icon: 'box', hint: 'Arma proyectos completos', modelId: 'qwen3-1.7b' },
  { id: 'code', label: 'Programación', icon: 'term', hint: 'Escribe y explica código', modelId: 'qwen3-1.7b' },
  { id: 'debug', label: 'Depuración', icon: 'search', hint: 'Encuentra y corrige errores', modelId: 'qwen3-1.7b' },
  { id: 'research', label: 'Investigación', icon: 'folder', hint: 'Analiza fuentes y resume', modelId: 'lfm3-1.7b' },
  { id: 'fun', label: 'Diversión', icon: 'spark', hint: 'Juegos, historias, ideas', modelId: 'lfm3-1.7b' },
  { id: 'automation', label: 'Automatización', icon: 'sliders', hint: 'Tareas y scripts repetibles', modelId: 'lfm3-1.7b' },
  { id: 'red', label: 'Red Cyber', icon: 'chip', hint: 'Ofensiva autorizada (pentest, CTF)', modelId: 'cybersecqwen-4b' },
  { id: 'blue', label: 'Blue Cyber', icon: 'gear', hint: 'Defensa, hardening, detección', modelId: 'cybersecqwen-4b' },
];

export function modeById(id: ModeId): Mode {
  return MODES.find((m) => m.id === id) ?? MODES[0]!;
}

/** El modo elige el modelo (D1). */
export function modelForMode(id: ModeId): LocalModel {
  return modelById(modeById(id).modelId);
}
