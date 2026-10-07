import { describe, it, expect } from "vitest";
import { parseRoute, getPathForState } from "../src/App.tsx";

describe("Frontend SPA Routing (Estandarizado en Inglés)", () => {
  it("debe parsear rutas de clases específicas canónicas en inglés", () => {
    expect(parseRoute("/classes/defense")).toEqual({
      state: "class_detail",
      classId: "defense",
    });

    expect(parseRoute("/classes/transfiguration")).toEqual({
      state: "class_detail",
      classId: "transfiguration",
    });

    expect(parseRoute("/classes/battle")).toEqual({
      state: "class_detail",
      classId: "battle",
    });
  });

  it("debe parsear rutas con barra final sin romper el path", () => {
    expect(parseRoute("/classes/defense/")).toEqual({
      state: "class_detail",
      classId: "defense",
    });

    expect(parseRoute("/classes/")).toEqual({
      state: "classes_hub",
      classId: null,
    });
  });

  it("debe dirigir a classes_hub si la clase no existe en el catálogo", () => {
    expect(parseRoute("/classes/voldemort_secret")).toEqual({
      state: "classes_hub",
      classId: null,
    });
  });

  it("debe parsear el hub de clases general", () => {
    expect(parseRoute("/classes")).toEqual({
      state: "classes_hub",
      classId: null,
    });
  });

  it("debe parsear la pantalla de resultado del sombrero", () => {
    expect(parseRoute("/result")).toEqual({
      state: "result",
      classId: null,
    });
  });

  it("debe parsear la raíz como ceremonia del sombrero si el usuario no tiene casa", () => {
    expect(parseRoute("/")).toEqual({
      state: "welcome",
      classId: null,
    });

    expect(parseRoute("/ruta-desconocida")).toEqual({
      state: "welcome",
      classId: null,
    });
  });

  it("debe generar los paths canónicos correctos mediante getPathForState", () => {
    expect(getPathForState("class_detail", "defense")).toBe("/classes/defense");
    expect(getPathForState("class_detail", "transfiguration")).toBe("/classes/transfiguration");
    expect(getPathForState("class_detail", "battle")).toBe("/classes/battle");
    expect(getPathForState("class_detail", "unknown")).toBe("/classes");
    expect(getPathForState("classes_hub", null)).toBe("/classes");
    expect(getPathForState("result", null)).toBe("/result");
    expect(getPathForState("welcome", null)).toBe("/");
  });
});
