// Deliberately outside AuthProvider/client.ts to avoid a circular import between them.
// The response interceptor calls emitUnauthorized() on 401; AuthProvider registers a handler
// that clears state and bounces to Login immediately - this is the fix for v1's bug where the
// app kept making unauthenticated calls on a logged-in navigator until the user force-restarted.
type Handler = () => void;

let handler: Handler | null = null;

export function onUnauthorized(fn: Handler): void {
  handler = fn;
}

export function emitUnauthorized(): void {
  handler?.();
}
