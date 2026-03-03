export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { seed } = await import("./db/seed");
    await seed().catch((err) => {
      console.error("[instrumentation] Seed failed:", err);
    });
  }
}
