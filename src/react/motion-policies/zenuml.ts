import { sequenceMotion } from "./sequence.ts";
import type { DiagramMotionPolicy } from "../motion-policy.ts";

/** ZenUML's synchronous calls, returns and notes use their native sequence semantics. */
export const zenumlMotion: DiagramMotionPolicy = (scene) => sequenceMotion(scene);
