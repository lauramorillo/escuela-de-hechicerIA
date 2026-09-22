resource "google_firestore_database" "database" {
  provider = google

  project                 = var.project_id
  name                    = "(default)"
  location_id             = var.region
  type                    = "FIRESTORE_NATIVE"
  delete_protection_state = "DELETE_PROTECTION_DISABLED"

  depends_on = [
    google_project_service.services["firestore.googleapis.com"]
  ]
}
