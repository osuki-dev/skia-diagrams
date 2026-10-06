import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/** Reanimated's startup snapshot is supplemented by the live native preference. */
export function useReducedDiagramMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    let receivedLivePreference = false;
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (value) => {
      receivedLivePreference = true;
      if (mounted) setReduced(value);
    });
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted && !receivedLivePreference) setReduced(value);
      })
      .catch(() => {});
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}
