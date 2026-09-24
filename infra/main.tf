resource "random_string" "suffix" {
  length  = 5
  special = false
  upper   = false
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
  short_name  = replace("${var.project_name}${var.environment}${random_string.suffix.result}", "-", "")

  frontend_env_vars = {
    API_URL            = "https://${azurerm_container_app.backend.ingress[0].fqdn}"
    AZURE_AD_CLIENT_ID = azuread_application.frontend.client_id
    AZURE_AD_TENANT_ID = data.azuread_client_config.current.tenant_id
  }

  backend_env_vars = {
    AZURE_STORAGE_ACCOUNT_NAME = azurerm_storage_account.this.name
    AZURE_CLIENT_ID            = azurerm_user_assigned_identity.backend_app.client_id
    POSTGRES_HOST              = azurerm_postgresql_flexible_server.this.fqdn
    POSTGRES_DB                = "postgres"
    ENTRA_TENANT_ID            = data.azuread_client_config.current.tenant_id
    ENTRA_BACKEND_CLIENT_ID    = azuread_application.backend.client_id
  }
}

resource "azurerm_resource_group" "this" {
  name     = "rg-${local.name_prefix}"
  location = var.location
}

resource "azurerm_container_registry" "acr" {
  name                = "acr${local.short_name}"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  sku                 = "Basic"
  admin_enabled       = false
}

resource "azurerm_storage_account" "this" {
  name                     = "st${local.short_name}"
  resource_group_name      = azurerm_resource_group.this.name
  location                 = azurerm_resource_group.this.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_storage_container" "app_data" {
  name                  = "app-data"
  storage_account_id    = azurerm_storage_account.this.id
  container_access_type = "private"
}