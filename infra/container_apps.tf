resource "azurerm_log_analytics_workspace" "this" {
  name                = "log-${local.name_prefix}"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

resource "azurerm_container_app_environment" "this" {
  name                       = "cae-${local.name_prefix}"
  resource_group_name        = azurerm_resource_group.this.name
  location                   = azurerm_resource_group.this.location
  log_analytics_workspace_id = azurerm_log_analytics_workspace.this.id
  logs_destination           = "log-analytics"

  infrastructure_subnet_id = azurerm_subnet.apps.id
  workload_profile {
    name                  = "Consumption"
    workload_profile_type = "Consumption"
  }
}

resource "azurerm_container_app" "frontend" {
  name                         = "ca-${local.name_prefix}-web"
  resource_group_name          = azurerm_resource_group.this.name
  container_app_environment_id = azurerm_container_app_environment.this.id
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.app.id]
  }

  registry {
    server   = azurerm_container_registry.acr.login_server
    identity = azurerm_user_assigned_identity.app.id
  }

  secret {
    name                = "azure-ad-client-secret"
    key_vault_secret_id = azurerm_key_vault_secret.frontend_client_secret.versionless_id
    identity            = azurerm_user_assigned_identity.app.id
  }

  template {
    min_replicas = 0
    max_replicas = 1

    container {
      name   = "nextjs"
      image  = "${azurerm_container_registry.acr.login_server}/frontend:latest"
      cpu    = 0.25
      memory = "0.5Gi"

      dynamic "env" {
        for_each = local.frontend_env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      env {
        name        = "AZURE_AD_CLIENT_SECRET"
        secret_name = "azure-ad-client-secret"
      }
    }
  }

  ingress {
    external_enabled = true
    target_port      = 3000

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  depends_on = [
    azurerm_role_assignment.acr_pull,
    azurerm_role_assignment.kv_secrets_user_managed_identity,
    azurerm_key_vault_secret.frontend_client_secret
  ]
}

resource "azurerm_container_app" "backend" {
  name                         = "ca-${local.name_prefix}-api"
  resource_group_name          = azurerm_resource_group.this.name
  container_app_environment_id = azurerm_container_app_environment.this.id
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.backend_app.id]
  }

  registry {
    server   = azurerm_container_registry.acr.login_server
    identity = azurerm_user_assigned_identity.backend_app.id
  }

  template {
    min_replicas = 0
    max_replicas = 1

    container {
      name   = "fastapi"
      image  = "${azurerm_container_registry.acr.login_server}/backend:latest"
      cpu    = 0.25
      memory = "0.5Gi"

      dynamic "env" {
        for_each = local.backend_env_vars
        content {
          name  = env.key
          value = env.value
        }
      }
    }
  }

  ingress {
    external_enabled = false
    target_port      = 8000

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  depends_on = [
    azurerm_role_assignment.acr_pull,
    azurerm_role_assignment.blob_contributor
  ]
}

