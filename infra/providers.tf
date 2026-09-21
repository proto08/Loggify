terraform {
    required_version = ">=1.5.0"

    required_providers {
      azurerm = {
        source = "hashicorp/azurerm"
        version = "=5.0.0"
      }
      azuread = {
        source = "hashicorp/azuread"
        version = "~>3.1.0"
      }
      random = {
        source = "hashicorp/random"
        version = "~> 3.6"
      }
    }
}

provider "azurerm" {
    features {
    }
}

provider "azuread" {
}

