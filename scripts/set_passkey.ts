import { dbService } from "../db.ts";

async function main() {
  const newPasskey = process.argv[2]?.trim();

  if (newPasskey === undefined) {
    const currentPasskey = await dbService.getWorkshopPasskey();
    console.log(`\n🔑 Palabra clave actual en Firestore: \x1b[33m${currentPasskey || "(ninguna / acceso libre)"}\x1b[0m`);
    console.log(`\n💡 Para cambiarla, ejecuta:\n   npm run passkey <nueva-palabra-clave>\n   (O escribe "" para desactivar la protección)\n`);
    return;
  }

  console.log(`⏳ Actualizando palabra clave en Firestore...`);
  await dbService.setWorkshopPasskey(newPasskey);

  const verified = await dbService.getWorkshopPasskey();
  if (verified) {
    console.log(`✅ ¡Palabra clave fijada con éxito a: \x1b[32m${verified}\x1b[0m!\n`);
  } else {
    console.log(`🔓 ¡Protección por palabra clave desactivada! (Acceso libre a todos los usuarios).\n`);
  }
}

main().catch((err) => {
  console.error("❌ Error al actualizar la palabra clave en Firestore:", err);
  process.exit(1);
});
