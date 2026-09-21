resource "azurerm_postgresql_flexible_server" "this" {
  name                = "psq-${local.name_prefix}"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  version             = "18"

  storage_mb = 32768 # 32MB
  sku_name   = "B_Standard_B1ms"
  zone       = "1"

  delegated_subnet_id = azurerm_subnet.postgres.id
  private_dns_zone_id = azurerm_private_dns_zone.postgres.id

  public_network_access_enabled = false

  authentication {
    active_directory_auth_enabled = true
    password_auth_enabled         = false
  }
  depends_on = [azurerm_private_dns_zone_virtual_network_link.postgres]
}

resource "azurerm_private_dns_zone" "postgres" {
  name                = "privatelink.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.this.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgres" {
  name                = "vnet-link-postgres"
  private_dns_zone_id = azurerm_private_dns_zone.postgres.id
  virtual_network_id  = azurerm_virtual_network.this.id
}

resource "azurerm_postgresql_flexible_server_active_directory_administrator" "this" {
  server_name         = azurerm_postgresql_flexible_server.this.name
  resource_group_name = azurerm_resource_group.this.name
  tenant_id           = data.azuread_client_config.current.tenant_id
  object_id           = azurerm_user_assigned_identity.backend_app.principal_id
  principal_name      = azurerm_user_assigned_identity.backend_app.name
  principal_type      = "ServicePrincipal"
}