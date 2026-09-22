output "cloud_run_url" {
  description = "URL publica del servicio Cloud Run"
  value       = google_cloud_run_v2_service.app.uri
}

output "artifact_registry_repository" {
  description = "Ruta completa del repositorio en Artifact Registry"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.repo.repository_id}"
}

output "service_account_email" {
  description = "Email de la Service Account asignada al servicio"
  value       = google_service_account.cloud_run_sa.email
}

output "firestore_database_name" {
  description = "Nombre de la base de datos Firestore"
  value       = google_firestore_database.database.name
}

output "workload_identity_provider" {
  description = "Identificador completo del proveedor Workload Identity para GitHub Actions"
  value       = google_iam_workload_identity_pool_provider.github_provider.name
}

output "github_deployer_service_account" {
  description = "Email de la Service Account utilizada por GitHub Actions"
  value       = google_service_account.github_deployer.email
}
