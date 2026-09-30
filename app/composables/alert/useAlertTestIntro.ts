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

import { ref, watch, type ComputedRef } from "vue";

/**
 * Test-runner intro dialog with a "don't show again" localStorage gate.
 *
 * First run shows the explainer; ticking the checkbox stores a flag and
 * subsequent runs skip straight to the AlertTestRunner. The runner itself
 * is a child component whose exposed `run()` is called via `testRunnerRef`.
 *
 * Split out of AlertView so the container doesn't own three refs, a
 * localStorage helper, and two side-effect handlers just for this flow.
 */
const TEST_INTRO_SKIP_KEY = "0";

export const useAlertTestIntro = (canTest: ComputedRef<boolean>) => {
    const showingTestIntro = ref(false);
    const testIntroDontShowAgain = ref(false);
    const testRunnerRef = ref<{ run: () => Promise<void> } | null>(null);

    // Reset the "don't show again" checkbox every time the intro reopens so
    // a previous session's tick doesn't leak into the current one.
    watch(showingTestIntro, (isOpen) => {
        if (isOpen) testIntroDontShowAgain.value = false;
    });

    const isSuppressed = (): boolean => {
        if (typeof window === "undefined") return false;
        try {
            return window.localStorage.getItem(TEST_INTRO_SKIP_KEY) === "1";
        } catch {
            // Private mode / storage disabled — always show the intro.
            return false;
        }
    };

    const onTest = () => {
        if (!canTest.value) return;
        if (isSuppressed()) {
            testRunnerRef.value?.run();
        } else {
            showingTestIntro.value = true;
        }
    };

    const onTestIntroConfirm = () => {
        const dontShowAgain = testIntroDontShowAgain.value;
        showingTestIntro.value = false;
        if (dontShowAgain && typeof window !== "undefined") {
            try {
                window.localStorage.setItem(TEST_INTRO_SKIP_KEY, "1");
            } catch {
                // Best effort — if storage is unavailable the user just sees the
                // intro again next time. Not worth surfacing an error.
            }
        }
        testRunnerRef.value?.run();
    };

    const cancelTestIntro = () => {
        showingTestIntro.value = false;
    };

    return {
        showingTestIntro,
        testIntroDontShowAgain,
        testRunnerRef,
        onTest,
        onTestIntroConfirm,
        cancelTestIntro,
    };
};
