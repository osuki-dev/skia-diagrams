import { DemoButton as Button } from "./demo-button.tsx";
import { MotionPressable as Pressable } from "./motion.tsx";
import { useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import type { DiagramTheme } from "@osuki-dev/skia-diagrams";
import { galleryGroups, type GalleryTypeName } from "./gallery-navigation.ts";
import { ThemeModeToggle } from "./theme-mode-toggle.tsx";

// Frozen, small image assets. No parser, layout, Skia Canvas or Picture on home.
const thumbnails: Record<GalleryTypeName, number> = {
  Flowchart: require("./assets/gallery/Flowchart.png"),
  Sequence: require("./assets/gallery/Sequence.png"),
  Class: require("./assets/gallery/Class.png"),
  State: require("./assets/gallery/State.png"),
  ER: require("./assets/gallery/ER.png"),
  Gantt: require("./assets/gallery/Gantt.png"),
  Pie: require("./assets/gallery/Pie.png"),
  GitGraph: require("./assets/gallery/GitGraph.png"),
  Mindmap: require("./assets/gallery/Mindmap.png"),
  Timeline: require("./assets/gallery/Timeline.png"),
  Journey: require("./assets/gallery/Journey.png"),
  Quadrant: require("./assets/gallery/Quadrant.png"),
  XY: require("./assets/gallery/XY.png"),
};

export function GalleryHome({
  theme,
  dark,
  onThemeChange,
  onOpen,
  onEditTheme,
  onOfficialExamples,
}: {
  theme: DiagramTheme;
  dark: boolean;
  onThemeChange: (dark: boolean) => void;
  onOpen: (type: GalleryTypeName) => void;
  onEditTheme: () => void;
  onOfficialExamples: () => void;
}) {
  const [category, setCategory] = useState("All");
  const order: GalleryTypeName[] = [
    "Flowchart",
    "Sequence",
    "Class",
    "State",
    "ER",
    "Gantt",
    "Pie",
    "GitGraph",
    "Mindmap",
    "Timeline",
    "Journey",
    "Quadrant",
    "XY",
  ];
  const groups =
    category === "All"
      ? [
          {
            title: "",
            types: galleryGroups
              .flatMap((group) => [...group.types])
              .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name)),
          },
        ]
      : galleryGroups.filter(
          (_, index) =>
            category === "All" ||
            (category === "Relationships" && index <= 1) ||
            (category === "Time" && index === 2) ||
            (category === "Data" && index === 3),
        );
  return (
    <View style={{ flex: 1, backgroundColor: theme.nodeFill }}>
      <ScrollView testID="gallery-home" contentContainerStyle={{ padding: 16, gap: 24 }}>
        <View style={{ gap: 8 }}>
          <View
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
          >
            <View style={{ gap: 2 }}>
              <Text
                style={{
                  color: theme.nodeText,
                  fontSize: 12,
                  fontWeight: "600",
                  letterSpacing: 1.2,
                }}
              >
                OSUKI
              </Text>
              <Text style={{ color: theme.mutedText, fontSize: 11, letterSpacing: 1.8 }}>
                DIAGRAMS
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                minHeight: 44,
              }}
            >
              <ThemeModeToggle
                testID="home-theme-mode"
                theme={theme}
                dark={dark}
                onChange={onThemeChange}
              />
              <Pressable
                testID="home-theme-editor"
                accessibilityRole="button"
                accessibilityLabel="Customize theme"
                onPress={onEditTheme}
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  justifyContent: "center",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: theme.gridStroke,
                  borderRadius: 22,
                }}
              >
                <Text style={{ color: theme.nodeText, fontSize: 18 }}>◉</Text>
              </Pressable>
            </View>
          </View>
          <Text style={{ color: theme.nodeText, fontSize: 28, fontWeight: "600" }}>
            Diagram library
          </Text>
          <Text style={{ color: theme.mutedText ?? theme.edgeText, fontSize: 14, lineHeight: 21 }}>
            13 diagram types · One theme
          </Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {["All", "Relationships", "Time", "Data"].map((name) => (
            <Pressable
              key={name}
              accessibilityRole="tab"
              accessibilityState={{ selected: name === category }}
              onPress={() => setCategory(name)}
              style={{
                minHeight: 44,
                paddingHorizontal: 12,
                justifyContent: "center",
                borderRadius: 22,
                backgroundColor: name === category ? theme.accent : theme.headerFill,
              }}
            >
              <Text
                style={{
                  color: name === category ? (dark ? "#050B12" : "#FFFFFF") : theme.mutedText,
                  fontSize: 12,
                }}
              >
                {name}
              </Text>
            </Pressable>
          ))}
        </View>
        {groups.map((group) => (
          <View key={group.title} style={{ gap: 12 }}>
            {group.title ? (
              <Text
                accessibilityRole="header"
                style={{ color: theme.mutedText, fontSize: 12, fontWeight: "600" }}
              >
                {group.title}
              </Text>
            ) : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {group.types.map((type) => (
                <Pressable
                  key={type.name}
                  contentStyle={{ alignItems: "stretch", gap: 8 }}
                  testID={`home-type-${type.name}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${type.name}, ${type.keyword}. ${type.description}`}
                  accessibilityHint="Opens the live diagram example"
                  onPress={() => onOpen(type.name)}
                  style={({ pressed }) => ({
                    flexBasis: "47%",
                    flexGrow: 1,
                    maxWidth: "49%",
                    minHeight: 44,
                    padding: 10,
                    gap: 8,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: pressed ? theme.accent : (theme.gridStroke ?? theme.clusterStroke),
                    backgroundColor: theme.nodeFill,
                  })}
                >
                  <Text style={{ color: theme.nodeText, fontSize: 16, fontWeight: "600" }}>
                    {type.name}
                  </Text>
                  <Image
                    source={thumbnails[type.name]}
                    accessible={false}
                    resizeMode="contain"
                    style={{
                      width: "100%",
                      height: 112,
                      borderRadius: 6,
                      backgroundColor: "#F7F3EC",
                    }}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        ))}
        <Button
          title="Official Mermaid examples"
          testID="home-official-examples"
          onPress={onOfficialExamples}
        />
        <Text style={{ color: theme.mutedText ?? theme.edgeText, fontSize: 12, lineHeight: 18 }}>
          Open an example for detailed, CJK and boundary test cases.
        </Text>
      </ScrollView>
      <View
        style={{
          flexDirection: "row",
          borderTopWidth: 1,
          borderColor: theme.gridStroke,
          paddingVertical: 8,
        }}
      >
        <View
          style={{ flex: 1, minHeight: 44, justifyContent: "center", alignItems: "center", gap: 3 }}
        >
          <Text style={{ color: theme.accent, fontSize: 16 }}>▦</Text>
          <Text style={{ color: theme.accent, fontSize: 12 }}>Diagrams</Text>
        </View>
        <Pressable
          testID="home-theme-tab"
          accessibilityRole="button"
          onPress={onEditTheme}
          style={{ flex: 1, minHeight: 44, justifyContent: "center", alignItems: "center", gap: 3 }}
        >
          <Text style={{ color: theme.mutedText, fontSize: 16 }}>◉</Text>
          <Text style={{ color: theme.mutedText, fontSize: 12 }}>Theme</Text>
        </Pressable>
      </View>
    </View>
  );
}
