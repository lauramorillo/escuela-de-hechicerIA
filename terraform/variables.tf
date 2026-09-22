variable "project_id" {
  description = "ID del proyecto en Google Cloud Platform"
  type        = string
  default     = "escuela-de-hechiceria"
}

variable "region" {
  description = "Región de GCP para el despliegue de recursos"
  type        = string
  default     = "europe-west1"
}

variable "app_name" {
  description = "Nombre base de la aplicación y recursos"
  type        = string
  default     = "escuela-de-hechiceria"
}

variable "active_workshop_id" {
  description = "ID del workshop activo para el aislamiento multitenant"
  type        = string
  default     = "test-2026"
}

variable "container_image" {
  description = "URL completa de la imagen de contenedor (ej. europe-west1-docker.pkg.dev/PROJECT/sombrero-repo/app:tag)"
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
}

variable "github_repository" {
  description = "Repositorio de GitHub en formato 'usuario/repo' autorizado para despliegues via Workload Identity Federation"
  type        = string
  default     = "lauramorillo/escuela-de-hechicerIA"
}
