resource "azurerm_log_analytics_workspace" "this" {
    name = "log-${local.name_prefix}"
    resource_group_name = azurerm_resource_group.this.name
    location = azurerm_resource_group.this.location
    sku = "PerGB2018"
    retention_in_days = 30
}

resource "azurerm_container_app_environment" "this" {
  name = "cae-${local.name_prefix}"
  resource_group_name = azurerm_resource_group.this.name
  location = azurerm_resource_group.this.location
  log_analytics_workspace_id = azurerm_log_analytics_workspace.this.id
  logs_destination = "log-analytics"
}   

resource "azurerm_container_app" "frontend" {
    name = "ca-${local.name_prefix}-web"
    resource_group_name = azurerm_resource_group.this.name
    container_app_environment_id = azurerm_container_app_environment.this.id
    revision_mode = "Single"
    
    identity {
      type = "UserAssigned"
      identity_ids = [azurerm_user_assigned_identity.app.id]
    }
    
    registry {
      server = azurerm_container_registry.acr.login_server
      identity = azurerm_user_assigned_identity.app.id
    }

    template {
      min_replicas = 0
      max_replicas = 1

      container {
        name = "nextjs"
        image = "${azurerm_container_registry.acr.login_server}/frontend:latest"
        cpu = 0.25
        memory = "0.5Gi"
      }
    }

    ingress {
      external_enabled = true
      target_port = 3000

      traffic_weight {
        percentage = 100
        latest_revision = true
      }
    }

    depends_on = [azurerm_role_assignment.acr_pull]
}

