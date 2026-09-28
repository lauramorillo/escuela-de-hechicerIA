import { dbService } from "../db.ts";

async function main() {
  const newWorkshopId = process.argv[2]?.trim();
  const newPasskey = process.argv[3]?.trim();

  if (!newWorkshopId) {
    const currentWorkshop = await dbService.getEffectiveWorkshopId();
    const currentPasskey = await dbService.getWorkshopPasskey();

    console.log(`\n🏰 \x1b[1mEstado de Acceso a la Escuela de HechicerIA\x1b[0m`);
    console.log(`-----------------------------------------------`);
    console.log(`📌 Taller activo en Firestore : \x1b[32m${currentWorkshop}\x1b[0m`);
    console.log(`🔑 Palabra clave de acceso     : \x1b[33m${currentPasskey || "(ninguna / acceso libre)"}\x1b[0m`);
    console.log(`\n💡 Comandos útiles:`);
    console.log(`   npm run workshop <nuevo-taller>                -> Cambia el taller`);
    console.log(`   npm run workshop <nuevo-taller> <palabra-clave> -> Cambia taller y palabra clave`);
    console.log(`   npm run passkey <palabra-clave>                -> Cambia solo la palabra clave\n`);
    return;
  }

  console.log(`⏳ Cambiando taller activo a: \x1b[33m${newWorkshopId}\x1b[0m...`);
  await dbService.setActiveWorkshopId(newWorkshopId);
  await dbService.ensureHousesInitialized(newWorkshopId);

  if (newPasskey !== undefined) {
    await dbService.setWorkshopPasskey(newPasskey);
    console.log(`🔑 Palabra clave actualizada a: \x1b[33m${newPasskey}\x1b[0m`);
  }

  const verifiedWorkshop = await dbService.getEffectiveWorkshopId();
  const verifiedPasskey = await dbService.getWorkshopPasskey();

  console.log(`\n✅ ¡Configuración actualizada en Firestore!`);
  console.log(`   - Taller: \x1b[32m${verifiedWorkshop}\x1b[0m`);
  console.log(`   - Palabra Clave: \x1b[33m${verifiedPasskey || "(ninguna)"}\x1b[0m\n`);
}

main().catch((err) => {
  console.error("❌ Error al actualizar la configuración en Firestore:", err);
  process.exit(1);
});
