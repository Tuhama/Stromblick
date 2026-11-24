import { configureForStrictCsp } from "./strict-csp";

// Imported first in main.tsx. The shared schemas are created while the other imports load, and Zod
// decides at that moment whether to compile them, so the switch has to be flipped before that.
configureForStrictCsp();
