/** Texto listo para leer en voz alta: sin bloques de código, marcas de formato, citas ni enlaces. */
export function toSpeech(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`/g, '')
    .replace(/\*\*|__|[*_#>]/g, '')
    .replace(/\[(\d+)\]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 700);
}
