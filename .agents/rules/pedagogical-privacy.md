# Regla de Privacidad Pedagógica y Repositorio Público

## Contexto y Alcance
El repositorio `escuela-de-hechicerIA` es de código abierto y de libre acceso para los alumnos y asistentes al taller. Su propósito es formativo y experimental.

## Directrices Obligatorias para Cualquier Agente de IA

1. **Protección de Soluciones y Respuestas:**
   - NUNCA incluir en el código fuente, comentarios, documentación (`AGENTS.md`, `README.md`), plantillas, tests ni respuestas por defecto las soluciones completas de los desafíos del taller.
   - En particular:
     - No detallar listas de casos o números de cámaras afectadas ni importes exactos de las pruebas.
     - No proporcionar planes de batalla completos de Tool Calling ni argumentos mágicos ya resueltos.
     - No incluir las directivas de ataque o defensa de Prompt Injection listas para copiar.

2. **Mensajes de Commit Neutros (`git commit`):**
   - Los mensajes de commit deben ser técnicos, descriptivos y convencionales (`feat:`, `fix:`, `docs:`, `chore:`).
   - NUNCA utilizar expresiones que indiquen que se están eliminando o escondiendo respuestas (ej: "eliminar soluciones", "quitar respuestas", "limpiar secretos").
   - Utilizar fórmulas profesionales y genéricas, como: `docs: actualizar documentación técnica` o `feat: actualizar dinámicas del aula`.

3. **Desacoplamiento Estricto:**
   - La verdad evaluadora, rúbricas de comprobación y baterías de prueba residen exclusivamente en el microservicio desacoplado `escuela-de-hechicerIA-profesores`.
