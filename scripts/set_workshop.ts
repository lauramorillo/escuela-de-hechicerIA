import { dbService } from "../db.ts";

async function main() {
  const newWorkshopId = process.argv[2]?.trim();

  if (!newWorkshopId) {
    const current = await dbService.getEffectiveWorkshopId();
    console.log(`\n📌 Taller activo actualmente en Firestore: \x1b[32m${current}\x1b[0m`);
    console.log(`\n💡 Para cambiarlo, ejecuta:\n   npm run workshop <nombre-del-taller>\n`);
    return;
  }

  console.log(`⏳ Cambiando taller activo a: \x1b[33m${newWorkshopId}\x1b[0m...`);
  await dbService.setActiveWorkshopId(newWorkshopId);
  await dbService.ensureHousesInitialized(newWorkshopId);

  const verified = await dbService.getEffectiveWorkshopId();
  console.log(`✅ ¡Taller activo actualizado con éxito en Firestore!: \x1b[32m${verified}\x1b[0m\n`);
}

main().catch((err) => {
  console.error("❌ Error al actualizar el taller en Firestore:", err);
  process.exit(1);
});
