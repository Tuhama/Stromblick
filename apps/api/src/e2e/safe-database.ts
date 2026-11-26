/**
 * The end-to-end server deletes every row before it seeds. Refuse any database that is not a
 * throwaway one on this machine, so a wrong DATABASE_URL (Neon, say) can never be emptied.
 */
export function assertThrowawayDatabase(url: string): void {
  const parsed = new URL(url);
  const local = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(parsed.hostname);
  const name = parsed.pathname.replace(/^\//, "");
  if (!local || !/(^|_)(e2e|test)$/.test(name)) {
    throw new Error(
      "The end-to-end server empties its database. It only runs against localhost and a database " +
        `whose name ends in _e2e or _test, not ${parsed.hostname}/${name}.`,
    );
  }
}
