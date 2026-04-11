export function logInfo(message: string, data?: Record<string, unknown>) {
  console.log(JSON.stringify({ level: "info", message, ...data }));
}

export function logError(message: string, data?: Record<string, unknown>) {
  console.error(JSON.stringify({ level: "error", message, ...data }));
}
