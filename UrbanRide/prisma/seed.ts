async function main(): Promise<void> {
  // Intentionally empty: application seed data belongs to future domain modules.
  console.info('Database seed structure is ready; no data was inserted.');
}

main().catch((error: unknown) => {
  console.error('Database seed failed.', error);
  process.exitCode = 1;
});
