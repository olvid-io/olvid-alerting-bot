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

// app/plugins/lucide.ts
// Centralized Lucide icon registration. Every icon used in the app is
// registered as a global Vue component here — templates can then reference
// them as <LucidePencil />, <LucideTrash2 />, etc. without per-file imports.
//
// Why the `Lucide` prefix:
//   - Makes intent obvious in templates ("this is an icon").
//   - Avoids collisions with domain components (e.g. a future <Mail /> or
//     <Circle /> component won't clash with the icon).
//
// Adding a new icon:
//   1. import it from "@lucide/vue" below.
//   2. add it to the `icons` map with the Lucide<Name> key.
// Tree-shaking is automatic — only imported icons ship in the bundle.

import {
    Pencil,
    SquarePen,
    Trash2,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Redo2,
    CircleCheck,
    Info,
    Circle,
    X,
    Plus,
    Copy,
    EllipsisVertical,
    UserCog,
    ArrowLeftRight,
    Play,
    Mail,
    SquareMousePointer,
    Moon,
    Sun,
    Globe,
    User,
    Bell,
    CircleQuestionMark,
    Link,
    Pipette,
    ArrowLeft,
    ArrowRight,
    List,
    Check, KeyRound
} from "@lucide/vue";

const icons = {
    LucidePencil: Pencil,
    LucideSquarePen: SquarePen,
    LucideTrash2: Trash2,
    LucideChevronLeft: ChevronLeft,
    LucideChevronRight: ChevronRight,
    LucideChevronDown: ChevronDown,
    LucideRedo: Redo2,
    LucideCircleCheck: CircleCheck,
    LucideInfo: Info,
    LucideCircle: Circle,
    LucideX: X,
    LucidePlus: Plus,
    LucideCopy: Copy,
    LucideEllipsisVertical: EllipsisVertical,
    LucideArrowLeftRight: ArrowLeftRight,
    LucideArrowLeft: ArrowLeft,
    LucideArrowRight: ArrowRight,
    LucidePlay: Play,
    LucideMail: Mail,
    LucideLink: Link,
    LucideSquareMousePointer: SquareMousePointer,
    LucideMoon: Moon,
    LucideSun: Sun,
    LucideGlobe: Globe,
    LucideUser: User,
    LucideUserCog: UserCog,
    LucideBell: Bell,
    LucideCircleQuestionMark: CircleQuestionMark,
    LucidePipette: Pipette,
    LucideList: List,
    LucideCheck: Check,
    LucideKeyRound: KeyRound,
};

export default defineNuxtPlugin((nuxtApp) => {
    for (const [name, component] of Object.entries(icons)) {
        nuxtApp.vueApp.component(name, component);
    }
});
