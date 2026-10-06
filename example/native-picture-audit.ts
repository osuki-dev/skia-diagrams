import { type SkPicture } from "react-native-skia";

/** Retain actual committed hook wrappers and probe their native disposed state.
 * Holding JS references prevents GC from masquerading as explicit cleanup.
 * Superseded-before-commit wrappers and native reference counts remain outside
 * this public API audit; these are NOT allocation/byte counts. */
export function startPictureAudit() {
  const observed = new Set<SkPicture>();
  return {
    observe: (picture: SkPicture) => {
      observed.add(picture);
    },
    snapshot: () => {
      let disposedAccessRejected = 0;
      for (const picture of observed) {
        try {
          picture.serialize();
        } catch {
          disposedAccessRejected++;
        }
      }
      return {
        observedCommittedWrappers: observed.size,
        disposedAccessRejected,
        accessibleWrappers: observed.size - disposedAccessRejected,
        note: "Native serialize rejection with JS references retained, not factory/effect counts or allocated native Picture bytes",
      };
    },
    stop: () => {},
  };
}
