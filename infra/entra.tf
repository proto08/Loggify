data "azuread_client_config" "current" {
}

resource "random_uuid" "backend_scope_id" {
}

resource "azuread_application" "backend" {
    display_name = "${local.name_prefix}-backend"
    owners = [data.azuread_client_config.current.object_id]

    api {
        requested_access_token_version = 2
        oauth2_permission_scope {
          id = random_uuid.backend_scope_id.result
          value = "access_as_user"
          type = "User"
          enabled = true
          admin_consent_description  = "Allows the app to call the backend API on behalf of the signed-in user"
          admin_consent_display_name = "Access backend API"
          user_consent_description   = "Allow the app to call the backend API on your behalf"
          user_consent_display_name  = "Access backend API"
        }
    }
}

resource "azuread_service_principal" "backend" {
    client_id = azuread_application.backend.client_id
    owners = [data.azuread_client_config.current.object_id]
}

resource "azuread_application" "frontend" {
    display_name = "${local.name_prefix}-frontend"
    owners = [data.azuread_client_config.current.object_id]

    web {
        redirect_uris = ["http://localhost:3000/api/auth/callback/azure-ad"]

        implicit_grant {
          access_token_issuance_enabled = false
          id_token_issuance_enabled = true
        }
    }

    required_resource_access {
      resource_app_id = azuread_application.backend.client_id

      resource_access {
        id = random_uuid.backend_scope_id.result
        type = "Scope"
      }
    }
}

resource "azuread_service_principal" "frontend" {
    client_id = azuread_application.frontend.client_id
    owners = [data.azuread_client_config.current.object_id]  
}

resource "azuread_application_password" "frontend" {
    application_id = azuread_application.frontend.id
    display_name = "terraform-managed"
}