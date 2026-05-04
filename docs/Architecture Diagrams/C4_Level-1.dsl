workspace "Aiki" "C4 Level 1 - System Context Diagram" {

    model {

        # People
        user = person "User" "A person who wants to stay focused. Installs the Aiki browser extension on Firefox or Chrome."

        # Aiki System
        aiki = softwareSystem "Aiki" "Browser extension and backend that intercepts visits to time-wasting sites and redirects users to learning activities. Runs partly inside the user's browser (extension) and partly on a VPS (REST API + database)."

        # External Systems
        dockerHub   = softwareSystem "Docker Hub"     "Container image registry. Stores built backend images pushed by the CI/CD pipeline." "External"
        ghActions   = softwareSystem "GitHub Actions" "CI/CD pipeline. Builds and pushes backend container images on push to main, then deploys to the VPS via SSH." "External"
        letsEncrypt = softwareSystem "Let's Encrypt"  "Certificate authority. Issues and renews TLS certificates used by the backend to serve HTTPS traffic on aiki.zeeguu.dev." "External"

        # Relationships
        user        -> aiki         "Installs and configures"
        aiki        -> user         "Extension intercepts distracting site visits and redirects to learning activities"

        aiki        -> dockerHub    "Backend pulls container images from on deploy"           "Docker Hub API"
        aiki        -> letsEncrypt  "Backend obtains and renews TLS certificates from"        "ACME / HTTPS"

        ghActions   -> aiki         "Builds, tests, and deploys backend to"           "SSH + Docker Compose"
        ghActions   -> dockerHub    "Pushes built container images to"                "Docker Hub API"
    }

    views {

        systemContext aiki "AikiSystemContext" {
            title "Aiki - C4 Level 1: System Context Diagram"
            include *
            autoLayout tb
        }

        styles {
            element "Person" {
                shape Person
                background #08427B
                color #ffffff
            }
            element "Software System" {
                background #1168BD
                color #ffffff
            }
            element "External" {
                background #999999
                color #ffffff
            }
        }
    }
}
