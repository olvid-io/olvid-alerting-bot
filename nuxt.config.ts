// https://nuxt.com/docs/api/configuration/nuxt-config
import { resolve } from "path";

export default defineNuxtConfig({
    typescript: {
        tsConfig: {
            compilerOptions: {
                useUnknownInCatchVariables: true,
            },
        },
    },

    compatibilityDate: "2025-07-15",
    devtools: { enabled: false },


    // Global stylesheet — design tokens + shared component classes. Loaded
    // before any component-scoped <style>, so scoped rules can still override.
    css: ["~/assets/css/main.css"],


    app: {
        head: {
            link: [
                { rel: 'icon', type: 'image/x-icon', href: '/olvid_icon.png' }
            ]
        }
    },

    // Components live in domain subfolders for organization but keep flat,
    // unprefixed names in templates (<Stepper />, <BundleCard />, <AlertEditor />…).
    // `pathPrefix: false` makes Nuxt skip the directory name when synthesizing
    // the component name. TODO is this breaking the convention and nuxt good practives?
    components: [
        { path: "~/components/alert", pathPrefix: false },
        { path: "~/components/alert-list", pathPrefix: false },
        { path: "~/components/alert-wizard", pathPrefix: false },
        { path: "~/components/alert-wizard/bundle", pathPrefix: false },
        { path: "~/components/alert-wizard/bundle/format-editor", pathPrefix: false },
        { path: "~/components/alert-wizard/condition", pathPrefix: false },
        { path: "~/components/alert-wizard/input-source", pathPrefix: false },
        { path: "~/components/alert-wizard/monitoring", pathPrefix: false },
        { path: "~/components/alert-wizard/payload", pathPrefix: false },
        { path: "~/components/alert-wizard/steps", pathPrefix: false },
        { path: "~/components/misc", pathPrefix: false },
        { path: "~/components/popup", pathPrefix: false },
        { path: "~/components/topbar", pathPrefix: false },
        { path: "~/components/user", pathPrefix: false },
        { path: "~/components/panel", pathPrefix: false },
        { path: "~/components", pathPrefix: false },
    ],

    alias: {
        // autoimport works for pages components etc but not necessarily for every other folder
        "@": resolve(__dirname, "/"),
    },

    // Auto-import nested composables
    imports: {
        dirs: [
            "~/composables/**"
        ]
    },

    // Auto-import the layered server-side architecture.
    nitro: {
        imports: {
            dirs: [
                "server/db",
                "server/repositories",
                "server/services",
                "server/clients",
                // Strategy + Factory folders — one object per Source / Formatting
                // value. Registered here so the factories resolve without imports.
                "server/services/dispatchers",
                "server/services/formatters",
                "server/services/testers",
            ],
        },


        experimental: { tasks: true, openAPI: false }, // Internal heartbeat that conditionally triggers the activation of scheduled alerts
        scheduledTasks: {
            "* * * * *": ["heartbeat"],
        },


    },

    modules: ["@nuxtjs/i18n", "@nuxt/eslint", "nuxt-auth-utils"],

    runtimeConfig: {
        // NUXT_SESSION_PASSWORD (≥32 chars) signs the session cookie; refusing
        // to boot with an empty value is the correct behavior — the auth flow
        // is unusable without it, so surface the misconfig loudly at start.
        session: {
            password: '',
            name: 'alert-session',
            cookie: {
                maxAge: 60 * 60 * 8, // 8 hours
                // nuxt-auth-utils forces `secure: true` when NODE_ENV=production.
                // Modern browsers refuse Secure cookies over plain HTTP, with
                // `localhost` as the sole exception — so a prod-mode container
                // accessed from a LAN IP would silently drop the cookie and login
                // does nothing. Set to `false` for LAN / HTTP dev; put TLS in
                // front (Caddy / nginx) for real deployments and flip this back
                // to `true` (or drop the override entirely).
                secure: false,
            },
        },
        public: {
            // Origin used to build absolute links in outgoing verification /
            // invitation emails. If unset at runtime the auth endpoints fall
            // back to the request's own host header.
            baseUrl: '',
        },
    },

    i18n: {
        bundle: {
            optimizeTranslationDirective: false
        },
        locales: [
            { code: "en", name: "English", file: "en.json", language: "en-US" },
            { code: "fr", name: "Français", file: "fr.json", language: "fr-FR" },
        ],
        defaultLocale: "en",

        strategy: "no_prefix",

        detectBrowserLanguage: {
            useCookie: true,
        },
    },
});
