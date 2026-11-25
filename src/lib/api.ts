export async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (response.status === 401 && typeof window !== "undefined") {
    window.location.href = "/sign-in?expired=1";
    throw new Error("Your session expired. Sign in again. The quote is still on this device.");
  }
  if (!response.ok) {
    throw new Error(data.error || "Something went wrong. Try again.");
  }
  return data as T;
}
