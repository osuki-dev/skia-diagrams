/** Fit may be smaller than 0.5 for large scenes, but 1x/6x always mean absolute
 * scene-point scale, not six times a tiny thumbnail. These functions are also
 * worklets so gestures do not send every pointer frame back to JavaScript. */
export function clampViewerZoom(scale: number, fit: number): number {
  "worklet";
  return Math.max(Math.min(0.5, fit), Math.min(6, scale));
}
export function panLimit(sceneSize: number, viewportSize: number, scale: number): number {
  "worklet";
  return Math.max(viewportSize * 0.15, (sceneSize * scale - viewportSize) / 2);
}
export function inlineViewport(
  bounds: { width: number; height: number },
  maxWidth: number,
  window: { width: number; height: number },
  minScale = 1,
  maxHeight?: number,
  fitToViewport = false,
) {
  const availableWidth = Math.max(
    1,
    Math.min(Number.isFinite(maxWidth) ? maxWidth : window.width, window.width),
  );
  const availableHeight =
    maxHeight !== undefined || fitToViewport
      ? Math.max(1, Math.min(Number.isFinite(maxHeight) ? maxHeight! : 600, window.height))
      : bounds.height > 1200
        ? 420
        : Math.max(1, bounds.height);
  const scale = fitToViewport
    ? Math.min(1, availableWidth / bounds.width, availableHeight / bounds.height)
    : Math.min(
        1,
        Math.max(Number.isFinite(minScale) ? minScale : 1, availableWidth / bounds.width),
      );
  const contentWidth = bounds.width * scale,
    contentHeight = bounds.height * scale;
  return {
    width: availableWidth,
    height: Math.max(1, Math.min(contentHeight, availableHeight)),
    contentWidth,
    contentHeight,
    overflow: contentWidth > availableWidth + 0.5 || contentHeight > availableHeight + 0.5,
    scale,
  };
}
