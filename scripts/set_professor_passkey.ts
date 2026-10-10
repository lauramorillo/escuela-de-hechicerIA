import { dbService } from "../db.ts";

async function main() {
  const newPasskey = process.argv[2]?.trim();

  if (!newPasskey) {
    const currentPasskey = await dbService.getProfessorPasskey();
    console.log(`\n🔐 Contraseña actual del Panel de Profesora en Firestore: \x1b[33m${currentPasskey}\x1b[0m`);
    console.log(`\n💡 Para cambiarla (sin subirla al repositorio público), ejecuta:\n   npm run professor-passkey <tu-nueva-contraseña>\n`);
    return;
  }

  console.log(`⏳ Actualizando contraseña de Profesora en Firestore...`);
  await dbService.setProfessorPasskey(newPasskey);

  const verified = await dbService.getProfessorPasskey();
  console.log(`✅ ¡Contraseña de Profesora fijada con éxito a: \x1b[32m${verified}\x1b[0m!\n`);
}

main().catch((err) => {
  console.error("❌ Error al actualizar la contraseña de Profesora:", err);
  process.exit(1);
});
