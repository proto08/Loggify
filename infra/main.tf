resource "random_string" "suffix" {
    length = 5
    special = false
    upper = false
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
  short_name = replace("${var.project_name}${var.environment}${random_string.suffix.result}", "-", "")
}

resource "azurerm_resource_group" "this" {
    name = "rg-${local.name_prefix}"
    location = var.location
}

resource "azurerm_container_registry" "acr" {
    name = "acr${local.short_name}"
    resource_group_name = azurerm_resource_group.this.name
    location = azurerm_resource_group.this.location
    sku = "Basic"
    admin_enabled = false
}

resource "azurerm_storage_account" "this" {
    name = "st${local.short_name}"
    resource_group_name = azurerm_resource_group.this.name
    location = azurerm_resource_group.this.location
    account_tier = "Standard"
    account_replication_type = "LRS"
}

resource "azurerm_storage_container" "app_data" {
    name = "app-data"
    storage_account_id = azurerm_storage_account.this.id
    container_access_type = "private"
}