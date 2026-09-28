import { dbService } from "../db.ts";

async function main() {
  console.log("🧹 Buscando y eliminando workshops de test en Firestore...");
  const deleted = await dbService.cleanAllTestWorkshops();
  if (deleted.length === 0) {
    console.log("✨ No se encontraron workshops de test para eliminar.");
  } else {
    console.log(`✅ Se eliminaron ${deleted.length} workshops de test con éxito:`);
    deleted.forEach((id) => console.log(`   - ${id}`));
  }
}

main().catch((err) => {
  console.error("❌ Error al limpiar datos de test:", err);
  process.exit(1);
});
