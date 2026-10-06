import { exampleNames } from "./fixture-cases.ts";

/** Only supported design types appear on home; diagnostic cases stay in detail. */
export const galleryGroups = [
  {
    title: "Flow & logic",
    types: [
      { name: "Flowchart", keyword: "flowchart", description: "Steps, decisions and connections" },
      {
        name: "Sequence",
        keyword: "sequenceDiagram",
        description: "Messages between participants",
      },
      { name: "State", keyword: "stateDiagram-v2", description: "States and their transitions" },
      { name: "Mindmap", keyword: "mindmap", description: "Ideas in a branching tree" },
    ],
  },
  {
    title: "Models & relationships",
    types: [
      { name: "Class", keyword: "classDiagram", description: "Classes, members and relations" },
      { name: "ER", keyword: "erDiagram", description: "Entities and cardinalities" },
      { name: "GitGraph", keyword: "gitGraph", description: "Branches, commits and merges" },
    ],
  },
  {
    title: "Time & experience",
    types: [
      { name: "Gantt", keyword: "gantt", description: "Tasks, dates and milestones" },
      { name: "Timeline", keyword: "timeline", description: "Periods and key events" },
      { name: "Journey", keyword: "journey", description: "Activities, actors and scores" },
    ],
  },
  {
    title: "Data & comparison",
    types: [
      { name: "Pie", keyword: "pie", description: "Parts of a whole" },
      {
        name: "Quadrant",
        keyword: "quadrantChart",
        description: "Positions across two dimensions",
      },
      { name: "XY", keyword: "xychart-beta", description: "Bars and lines on shared axes" },
    ],
  },
] as const;

export type GalleryType = (typeof galleryGroups)[number]["types"][number];
export type GalleryTypeName = GalleryType["name"];
export const galleryTypes = galleryGroups.flatMap<GalleryType>((group) => group.types);
export type GalleryRoute = { screen: "home" } | { screen: "detail"; type: GalleryTypeName };
export type GalleryAction = { type: "home" } | { type: "open"; diagram: GalleryTypeName };

export function detailIndexForType(type: GalleryTypeName): number {
  const index = exampleNames.indexOf(type);
  if (index < 0) throw new Error(`Missing gallery fixture: ${type}`);
  return index;
}

export function galleryNavigation(_route: GalleryRoute, action: GalleryAction): GalleryRoute {
  if (action.type === "home") return { screen: "home" };
  detailIndexForType(action.diagram);
  return { screen: "detail", type: action.diagram };
}

/** Native modal/share surfaces and auxiliary QA screens keep their own Back handling. */
export function detailBackEnabled(
  platform: string,
  modalOpen: boolean,
  auxiliaryOpen: boolean,
): boolean {
  return platform === "android" && !modalOpen && !auxiliaryOpen;
}

/** Testable native subscription boundary; the detail effect owns its cleanup. */
export function subscribeDetailBack(
  backHandler: {
    addEventListener(event: "hardwareBackPress", handler: () => boolean): { remove(): void };
  },
  onHome: () => void,
): () => void {
  const subscription = backHandler.addEventListener("hardwareBackPress", () => {
    onHome();
    return true;
  });
  return () => subscription.remove();
}
