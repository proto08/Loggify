resource "azuread_application" "github_ci" {
    display_name = "${local.name_prefix}-github-ci"
    owners = [data.azuread_client_config.current.object_id]
}

resource "azuread_service_principal" "github_ci" {
    client_id = azuread_application.github_ci.client_id
    owners = [data.azuread_client_config.current.object_id]
}

resource "azuread_application_federated_identity_credential" "github_main" {
    application_id = azuread_application.github_ci.id
    display_name = "github-main-branch"
    description = "GitHub Actions on proto08/Loggify, main branch only"

    issuer = "https://token.actions.githubusercontent.com"
    audiences = ["api://AzureADTokenExchange"]
    subject = "repo:proto08/Loggify:ref:refs/heads/main"
}

resource "azurerm_role_assignment" "github_ci_acr_push" {
    scope = azurerm_container_registry.acr.id
    role_definition_name = "AcrPush"
    principal_id = azuread_service_principal.github_ci.object_id
}

resource "azurerm_role_assignment" "github_ci_acr_reader" {
    scope = azurerm_container_registry.acr.id
    role_definition_name = "Reader"
    principal_id = azuread_service_principal.github_ci.object_id
}
resource "azurerm_role_assignment" "github_ci_container_apps" {
    scope = azurerm_resource_group.this.id
    role_definition_name = "Container Apps Contributor"
    principal_id = azuread_service_principal.github_ci.object_id
}

