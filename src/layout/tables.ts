import type { Node, TextMeasurer } from "../types.ts";

export function entityHeader(node: Node): string {
  return typeof node.metadata?.headerLabel === "string"
    ? node.metadata.headerLabel
    : node.attributes
      ? node.label.split("\n")[0]
      : node.label;
}

/** Measure each ER cell with the exact weight used by native text replay. */
export function entityTable(
  node: Node,
  measure: TextMeasurer,
  fontSize: number,
  headerSize: number,
  paddingX: number,
  paddingY: number,
  rowGap: number,
  maxWidth?: number,
) {
  const attributes = node.attributes ?? [];
  const stackedComments = maxWidth !== undefined && attributes.some((row) => row.comment);
  const columns: (keyof NonNullable<Node["attributes"]>[number])[] = [
    ...(attributes.some((row) => row.key) ? ["key" as const] : []),
    "name",
    "type",
    ...(!stackedComments && attributes.some((row) => row.comment) ? ["comment" as const] : []),
  ];
  let cells = attributes.map((row) =>
    columns.map((column) =>
      measure(row[column], { fontSize, fontWeight: column === "key" ? 600 : 400 }),
    ),
  );
  const widths = columns.map(
    (_, index) => Math.max(0, ...cells.map((row) => row[index].width)) + paddingX * 2,
  );
  if (
    maxWidth !== undefined &&
    fontSize >= 18 &&
    widths.reduce((sum, width) => sum + width, 0) > maxWidth
  ) {
    const title = entityHeader(node);
    const headerHeight =
      measure(title, { fontSize: headerSize, fontWeight: 600, maxWidth: maxWidth - paddingX * 2 })
        .height +
      paddingY * 2;
    const keyOnOwnLine = attributes.map(
      (row) =>
        Boolean(row.key) &&
        measure(row.name, { fontSize }).width +
          measure(row.key, { fontSize, fontWeight: 600 }).width +
          12 >
          maxWidth - paddingX * 2,
    );
    const primaryHeights = attributes.map((row, index) => {
      const key = row.key ? measure(row.key, { fontSize, fontWeight: 600 }).width + 12 : 0;
      if (keyOnOwnLine[index])
        return (
          measure(row.key, { fontSize, fontWeight: 600 }).height +
          6 +
          measure(row.name, { fontSize, maxWidth: maxWidth - paddingX * 2 }).height
        );
      return Math.max(
        measure(row.name, { fontSize, maxWidth: maxWidth - paddingX * 2 - key }).height,
        row.key ? measure(row.key, { fontSize, fontWeight: 600 }).height : 0,
      );
    });
    const dataHeights = attributes.map(
      (row, index) =>
        primaryHeights[index] +
        measure(row.type, { fontSize, maxWidth: maxWidth - paddingX * 2 }).height +
        6 +
        paddingY * 2 +
        rowGap,
    );
    const rowHeights = dataHeights.map(
      (height, index) =>
        height +
        (attributes[index].comment
          ? measure(attributes[index].comment, { fontSize, maxWidth: maxWidth - paddingX * 2 })
              .height +
            paddingY * 2
          : 0),
    );
    return {
      title,
      columns,
      widths: [maxWidth],
      rowHeights,
      dataHeights,
      primaryHeights,
      keyOnOwnLine,
      stackedAttributes: true,
      stackedComments: true,
      headerHeight,
      width: maxWidth,
      height: headerHeight + rowHeights.reduce((sum, height) => sum + height, 0),
    };
  }
  if (maxWidth !== undefined && widths.reduce((sum, width) => sum + width, 0) > maxWidth) {
    const keyIndex = columns.indexOf("key");
    const keyWidth = keyIndex < 0 ? 0 : Math.min(widths[keyIndex], paddingX * 2 + fontSize * 1.8);
    const flexible = columns.length - (keyIndex < 0 ? 0 : 1);
    const flexibleWidth = Math.max(fontSize + paddingX * 2, (maxWidth - keyWidth) / flexible);
    for (const [index] of columns.entries())
      widths[index] = index === keyIndex ? keyWidth : flexibleWidth;
    cells = attributes.map((row) =>
      columns.map((column, index) =>
        measure(row[column], {
          fontSize,
          fontWeight: column === "key" ? 600 : 400,
          maxWidth: Math.max(fontSize, widths[index] - paddingX * 2),
        }),
      ),
    );
  }
  const title = entityHeader(node);
  const header = measure(title, {
    fontSize: headerSize,
    fontWeight: 600,
    ...(maxWidth === undefined ? {} : { maxWidth: maxWidth - paddingX * 2 }),
  });
  const headerHeight = header.height + paddingY * 2;
  const dataHeights = cells.map(
    (row) => Math.max(0, ...row.map((cell) => cell.height)) + paddingY * 2 + rowGap,
  );
  const comments = stackedComments
    ? attributes.map((row) =>
        row.comment
          ? measure(row.comment, { fontSize, maxWidth: maxWidth! - paddingX * 2 })
          : undefined,
      )
    : [];
  const rowHeights = dataHeights.map(
    (height, index) => height + (comments[index] ? comments[index]!.height + paddingY * 2 : 0),
  );
  const width = Math.max(
    80,
    header.width + paddingX * 2,
    widths.reduce((sum, column) => sum + column, 0),
  );
  const nameColumn = columns.indexOf("name");
  if (nameColumn >= 0)
    widths[nameColumn] += width - widths.reduce((sum, column) => sum + column, 0);
  return {
    title,
    columns,
    widths,
    rowHeights,
    dataHeights,
    stackedComments,
    stackedAttributes: false,
    primaryHeights: [],
    keyOnOwnLine: [],
    headerHeight,
    width,
    height: headerHeight + rowHeights.reduce((sum, row) => sum + row, 0),
  };
}
