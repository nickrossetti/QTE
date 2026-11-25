export function odataString(value: string): string {
  return value.replace(/'/g, "''").replace(/[\u0000-\u001f]/g, "");
}
