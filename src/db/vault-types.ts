import type { ChatRepo } from './repo';

/**
 * Resultado del arranque del almacenamiento:
 * - ready: base abierta.
 * - locked: hay una copia restaurada y un sobre con contraseña de copia → pedir la contraseña.
 * - unreadable: hay una copia restaurada pero sin sobre → solo se puede empezar de cero.
 */
export type BootResult =
  | { state: 'ready'; repo: ChatRepo }
  | { state: 'locked' }
  | { state: 'unreadable' }
  | { state: 'error'; message: string };

export class WrongPasswordError extends Error {
  constructor() {
    super('Contraseña de copia incorrecta');
    this.name = 'WrongPasswordError';
  }
}
