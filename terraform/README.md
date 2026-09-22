# Despliegue con Terraform y Cloud Run

Esta carpeta contiene la definición de infraestructura como código (IaC) para desplegar el **Sombrero Seleccionador** en Google Cloud Platform.

---

## Recursos Gestionados

- **APIs**: Cloud Run, Artifact Registry, Firestore, Cloud Text-to-Speech, Vertex AI, Cloud Build, IAM Credentials, STS.
- **Artifact Registry**: Repositorio Docker (`escuela-de-hechiceria-repo`).
- **Cloud Firestore**: Modo Nativo en la región configurada.
- **IAM & Workload Identity Federation (WIF)**: 
  - Service Account de runtime (`escuela-de-hechiceria-sa`) con roles de mínimo privilegio.
  - Service Account de despliegue (`escuela-de-hechiceria-deployer`) para CI/CD.
  - Pool y proveedor OIDC para autenticar GitHub Actions sin contraseñas ni archivos JSON.
- **Cloud Run (v2)**: Servicio serverless escalable a 0 con acceso público HTTPS.

---

## Flujo de Despliegue Inicial (Paso a Paso)

### 1. Autenticación en Google Cloud

```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project escuela-de-hechiceria
```

### 2. Configuración de Variables

Copia el archivo de ejemplo y ajusta los valores necesarios:

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

### 3. Crear Repositorio y Workload Identity Federation

Para que GitHub Actions pueda compilar y subir la primera imagen antes de levantar Cloud Run:

```bash
terraform init
terraform apply \
  -target=google_artifact_registry_repository.repo \
  -target=google_service_account_iam_member.wif_binding \
  -target=google_service_account_iam_member.deployer_act_as_app_sa \
  -target=google_project_iam_member.deployer_roles
```

Obtén los valores generados:
```bash
terraform output workload_identity_provider
terraform output github_deployer_service_account
```

### 4. Configurar GitHub Actions

En tu repositorio de GitHub (**Settings > Secrets and variables > Actions**), añade estas dos variables o secretos:

- `WIF_PROVIDER`: El valor obtenido de `terraform output workload_identity_provider`
- `WIF_SERVICE_ACCOUNT`: El valor obtenido de `terraform output github_deployer_service_account`

Haz un `git push origin main` para que GitHub Actions compile y suba la primera versión de la imagen Docker.

### 5. Desplegar el resto de la Infraestructura (Cloud Run)

Una vez que la imagen ya existe en Artifact Registry:

```bash
terraform apply
```

> [!NOTE]
> **Si la base de datos Firestore `(default)` ya existe en tu proyecto**:
> Antes de ejecutar `terraform apply`, importa la base de datos existente al estado de Terraform:
> ```bash
> terraform import google_firestore_database.database "(default)"
> ```
