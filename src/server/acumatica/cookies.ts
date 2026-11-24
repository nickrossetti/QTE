export function cookieHeaderFromSetCookie(setCookies: string[]): string {
  const pairs: string[] = [];
  for (const header of setCookies) {
    const pair = header.split(";")[0]?.trim();
    if (pair && pair.includes("=")) pairs.push(pair);
  }
  return pairs.join("; ");
}

export function redactSecret(message: string, secret: string): string {
  if (!secret || secret.length < 3) return message;
  return message.split(secret).join("••••");
}
