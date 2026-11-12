/** Never turn committed acceptance into a client-visible failure. */
export async function afterAcceptance(operation: string, run: () => unknown | Promise<unknown>): Promise<void> {
  try { await run(); }
  catch { console.error("[accepted-record] Ancillary operation deferred", { operation }); }
}
