/*
 * Olvid Alerting
 * Copyright © 2026 Olvid SAS
 *
 * Olvid Alerting is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License, version 3,
 * as published by the Free Software Foundation.
 *
 * Olvid Alerting is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Olvid Alerting. If not, see <https://www.gnu.org/licenses/>.
 */

// Applies a persisted dark/light theme to <html data-theme="…"> on boot.
// Token sheets in assets/css/tokens.css react to this attribute, so flipping
// it re-paints the entire app without a reload.
//
// To toggle from a component:
//   const { $theme } = useNuxtApp()
//   $theme.set('light')   // or 'dark'
//   $theme.toggle()
//
// When you install @nuxtjs/color-mode, replace this with the conventional
// useColorMode() composable.

type ThemeName = "dark" | "light";

const STORAGE_KEY = "theme";
const DEFAULT_THEME: ThemeName = "dark";

function readPersisted(): ThemeName {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw === "light" || raw === "dark" ? raw : DEFAULT_THEME;
    } catch {
        return DEFAULT_THEME;
    }
}

function apply(theme: ThemeName) {
    document.documentElement.setAttribute("data-theme", theme);
    try {
        localStorage.setItem(STORAGE_KEY, theme);
    } catch {
        clientLogger.warn("Error while saving theme", theme);
    }
}

export default defineNuxtPlugin(() => {
    apply(readPersisted());

    return {
        provide: {
            theme: {
                get current(): ThemeName {
                    return (
                        (document.documentElement.getAttribute(
                            "data-theme",
                        ) as ThemeName) ?? DEFAULT_THEME
                    );
                },
                set(theme: ThemeName) {
                    apply(theme);
                },
                toggle() {
                    apply(this.current === "dark" ? "light" : "dark");
                },
            },
        },
    };
});
