import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { dbService } from "../db.ts";
import { getGatekeeperStatus, verifyGatekeeperPasskey } from "../src/controllers/gatekeeperController.ts";

function createMockRes() {
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
    cookie(name: string, value: string) {
      this.headers["set-cookie"] = `${name}=${value}`;
      return this;
    },
  };
  return res;
}

describe("Gatekeeper - Control de Acceso por Palabra Clave", () => {
  const testPasskey = "Alohomora2026";

  beforeEach(async () => {
    await dbService.setWorkshopPasskey(testPasskey);
  });

  afterAll(async () => {
    await dbService.setWorkshopPasskey("alohomora");
  });

  it("debe indicar que el acceso está bloqueado si no hay cookie de pase válida", async () => {
    const req: any = { cookies: {} };
    const res = createMockRes();

    await getGatekeeperStatus(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.required).toBe(true);
    expect(res.body.authenticated).toBe(false);
    expect(res.body.workshopId).toBeDefined();
  });

  it("debe rechazar un intento con palabra clave incorrecta con 401", async () => {
    const req: any = { body: { passkey: "AvadaKedavra" } };
    const res = createMockRes();

    await verifyGatekeeperPasskey(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toContain("incorrecta");
  });

  it("debe validar con éxito la palabra clave de forma case-insensitive y devolver la cookie", async () => {
    const req: any = { body: { passkey: "  alohomora2026  " } };
    const res = createMockRes();

    await verifyGatekeeperPasskey(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(res.headers["set-cookie"]).toContain("workshop_gate_pass");

    // Verificar que una petición subsiguiente con la cookie es autenticada
    const workshopId = res.body.workshopId;
    const cookieReq: any = {
      cookies: {
        workshop_gate_pass: { workshopId, passkey: "alohomora2026" },
      },
    };
    const statusRes = createMockRes();
    await getGatekeeperStatus(cookieReq, statusRes);

    expect(statusRes.statusCode).toBe(200);
    expect(statusRes.body.required).toBe(true);
    expect(statusRes.body.authenticated).toBe(true);
  });

  it("debe permitir acceso directo si la palabra clave está desactivada", async () => {
    await dbService.setWorkshopPasskey("");
    const req: any = { cookies: {} };
    const res = createMockRes();

    await getGatekeeperStatus(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.required).toBe(false);
    expect(res.body.authenticated).toBe(true);
  });
});
