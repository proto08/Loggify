resource "azurerm_key_vault" "this" {
  name                = "kv${local.short_name}"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  tenant_id           = data.azuread_client_config.current.tenant_id
  sku_name            = "standard"

  rbac_authorization_enabled = true
  purge_protection_enabled   = false
}

resource "azurerm_role_assignment" "kv_secrets_officer_terraform" {
  scope                = azurerm_key_vault.this.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azuread_client_config.current.object_id
}

resource "azurerm_role_assignment" "kv_secrets_user_managed_identity" {
  scope                = azurerm_key_vault.this.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

resource "time_sleep" "wait_for_kv_rbac" {
  depends_on      = [azurerm_role_assignment.kv_secrets_officer_terraform]
  create_duration = "30s"
}

resource "azurerm_key_vault_secret" "frontend_client_secret" {
  name         = "azure-ad-client-secret"
  value        = azuread_application_password.frontend.value
  key_vault_id = azurerm_key_vault.this.id

  depends_on = [time_sleep.wait_for_kv_rbac]
}