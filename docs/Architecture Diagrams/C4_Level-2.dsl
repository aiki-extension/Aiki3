workspace "Aiki3 (Current)" "C4 Level 2 - Container Diagram: Aiki3 extension + custom Fastify/PostgreSQL backend" {

    model {

        // People

        user = person "User" "Installs the extension, registers with an invite code, and uses it to block procrastination sites."

        admin = person "Admin / Researcher" "Manages invite codes via the web UI. Reviews session data in the database."

        // Software System

        aikiSystem = softwareSystem "Aiki3" "Browser extension + custom Fastify/PostgreSQL backend for procrastination blocking and session tracking." {

            popupUI = container "Popup UI" "Browser-action popup. Shows timer and session progress. Toggles redirection on/off." "Svelte" {
                tags "Frontend"
            }

            settingsUI = container "Settings UI" "Options page. Handles registration and login. Configures sites, timers, operating hours, and invite code." "Svelte" {
                tags "Frontend"
            }

            backgroundWorker = container "Background Worker" "MV3 service worker. Handles all messages and port connections. Coordinates redirection, timers, and API calls." "JavaScript" {
                tags "Core"
            }

            apiHandler = container "API Handler" "Translates typed extension messages into HTTP calls to the backend API." "JavaScript module" {
                tags "Core"
            }

            contentScript = container "Content Script" "Injected into every page. Bootstraps overlays on load. Renders: redirect prompt, learning panel, content blocker, reward overlay." "JavaScript" {
                tags "Core"
            }

            extensionStorage = container "Extension Storage" "Local key-value store. Holds JWT, settings synced from the API, active sessions, daily progress, and feature flags." "browser.storage.local" {
                tags "Storage"
            }

            nginxProxy = container "Nginx Reverse Proxy" "TLS termination. Routes /ic-manager/* to the Invite Code Manager; all other traffic to the Fastify API." "Nginx" {
                tags "Infrastructure"
            }

            fastifyAPI = container "Fastify REST API" "Core backend. Exposes auth, user, and invite-code routes. JWT auth, AJV validation, rate limiting." "Node.js / Fastify / TypeScript" {
                tags "Backend"
            }

            featureToggleService = container "Feature Toggles" "Evaluates a user's invite code and returns a feature-flag map (e.g. redirect-prompt variant)." "TypeScript module" {
                tags "Backend"
            }

            postgresDB = container "PostgreSQL Database" "Relational store managed via Prisma. Tables: User, InviteCode, Website, UserTimeWastingSite, UserLearningSite, SiteSession, UserBehaviorLog." "PostgreSQL 15" {
                tags "Storage"
            }

            inviteCodeManager = container "Invite Code Manager" "Admin SPA. Lists, creates, updates, and deactivates invite codes via the Fastify API." "React / Vite" {
                tags "AdminUI"
            }
        }

        learningPlatform = softwareSystem "Learning Platform" "Third-party learning site configured by the user." {
            tags "External"
        }

        // Relationships

        user -> popupUI "Toggle redirection; view timer"
        user -> settingsUI "Register, log in, configure settings"
        admin -> inviteCodeManager "Manage invite codes"

        popupUI -> backgroundWorker "timer / on / off / originTab" "Runtime Port"
        popupUI -> extensionStorage "Read timer state"

        settingsUI -> backgroundWorker "api:* and refreshFilters messages" "runtime.sendMessage"
        settingsUI -> extensionStorage "Read cached settings"

        backgroundWorker -> apiHandler "Delegate api:* messages"
        backgroundWorker -> extensionStorage "Read / write runtime state"
        backgroundWorker -> contentScript "Overlay commands" "tabs.sendMessage"
        backgroundWorker -> learningPlatform "Redirect tab" "tabs.update"

        apiHandler -> nginxProxy "auth, user, settings, site endpoints" "HTTPS / JSON"

        contentScript -> backgroundWorker "User actions; timer poll" "Runtime Port"
        contentScript -> extensionStorage "Read site list and learning URI"

        nginxProxy -> fastifyAPI "Proxy /api/* traffic" "HTTP"
        nginxProxy -> inviteCodeManager "Proxy /ic-manager/* traffic" "HTTP"

        fastifyAPI -> featureToggleService "Build feature-flag map"
        fastifyAPI -> postgresDB "Read / write via Prisma" "SQL"

        inviteCodeManager -> nginxProxy "CRUD invite codes; login" "HTTPS / JSON"
    }

    views {

        // View 1: Extension containers only
        container aikiSystem "Aiki3_Current_Extension" "Extension containers and their interactions" {
            include popupUI
            include settingsUI
            include backgroundWorker
            include apiHandler
            include contentScript
            include extensionStorage
            include user
            include learningPlatform
            autolayout tb 120 80
        }

        // View 2: Backend containers only
        container aikiSystem "Aiki3_Current_Backend" "Backend containers and admin access" {
            include nginxProxy
            include fastifyAPI
            include featureToggleService
            include postgresDB
            include inviteCodeManager
            include apiHandler
            include admin
            autolayout tb 120 80
        }

        styles {
            element "Person" {
                shape Person
                background #1a4f8a
                color #ffffff
                fontSize 14
            }
            element "Container" {
                background #2e6da4
                color #ffffff
                fontSize 13
            }
            element "Frontend" {
                background #3a7ebf
                color #ffffff
                shape WebBrowser
                fontSize 13
            }
            element "Core" {
                background #1d5288
                color #ffffff
                fontSize 13
            }
            element "Storage" {
                background #5a5a5a
                color #ffffff
                shape Cylinder
                fontSize 13
            }
            element "Backend" {
                background #b05b10
                color #ffffff
                fontSize 13
            }
            element "Infrastructure" {
                background #3d3d3d
                color #ffffff
                shape RoundedBox
                fontSize 13
            }
            element "AdminUI" {
                background #5b3580
                color #ffffff
                shape WebBrowser
                fontSize 13
            }
            element "External" {
                background #6b6b6b
                color #ffffff
                shape RoundedBox
                fontSize 13
            }
            element "Software System" {
                background #1a4f8a
                color #ffffff
                fontSize 14
            }
            relationship "Relationship" {
                fontSize 12
                color #222222
                thickness 2
            }
        }

        theme default
    }
}
