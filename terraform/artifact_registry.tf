resource "google_artifact_registry_repository" "repo" {
  provider = google

  location      = var.region
  repository_id = "${var.app_name}-repo"
  description   = "Repositorio Docker para imágenes de ${var.app_name}"
  format        = "DOCKER"

  depends_on = [
    google_project_service.services["artifactregistry.googleapis.com"]
  ]
}
