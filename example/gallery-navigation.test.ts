/// <reference types="bun" />
import { expect, test } from "bun:test";
import { exampleNames, supportedTypes } from "./fixture-cases.ts";
import {
  detailIndexForType,
  detailBackEnabled,
  galleryTypes,
  galleryNavigation,
  subscribeDetailBack,
  type GalleryRoute,
} from "./gallery-navigation.ts";

test("gallery entries resolve to their matching detail fixtures", () => {
  const types = galleryTypes;
  const names: string[] = types.map((type) => type.name);
  expect(names.sort()).toEqual([...supportedTypes].sort());
  for (const type of types) {
    expect(exampleNames[detailIndexForType(type.name)]).toBe(type.name);
  }
});

test("every home entry opens the matching fixture and returns to a clean home route", () => {
  let route: GalleryRoute = { screen: "home" };
  for (const type of galleryTypes) {
    route = galleryNavigation(route, { type: "open", diagram: type.name });
    expect(route).toEqual({ screen: "detail", type: type.name });
    route = galleryNavigation(route, { type: "home" });
    expect(route as GalleryRoute).toEqual({ screen: "home" });
  }
  expect(galleryNavigation(route, { type: "home" })).toEqual(route);
});

test("system Back belongs only to unobstructed Android detail, not modals or QA", () => {
  expect(detailBackEnabled("android", false, false)).toBe(true);
  for (const platform of ["ios", "web"])
    expect(detailBackEnabled(platform, false, false)).toBe(false);
  expect(detailBackEnabled("android", true, false)).toBe(false);
  expect(detailBackEnabled("android", false, true)).toBe(false);
  expect(detailBackEnabled("android", true, true)).toBe(false);
});

test("detail Back subscription navigates once and cleanup/StrictMode replacement leaves home default", () => {
  const handlers = new Set<() => boolean>();
  let defaultBack = 0,
    removed = 0;
  const source = {
    addEventListener(event: "hardwareBackPress", handler: () => boolean) {
      expect(event).toBe("hardwareBackPress");
      handlers.add(handler);
      return {
        remove() {
          handlers.delete(handler);
          removed++;
        },
      };
    },
  };
  const back = () => {
    for (const handler of [...handlers].reverse()) if (handler()) return;
    defaultBack++;
  };
  let route: GalleryRoute = { screen: "detail", type: "Flowchart" };
  let firstCalls = 0,
    replacementCalls = 0;
  const firstCleanup = subscribeDetailBack(source, () => {
    firstCalls++;
    route = galleryNavigation(route, { type: "home" });
  });
  expect(handlers.size).toBe(1);
  firstCleanup(); // React setup/cleanup/setup, or onHome identity replacement.
  expect(handlers.size).toBe(0);
  const cleanup = subscribeDetailBack(source, () => {
    replacementCalls++;
    route = galleryNavigation(route, { type: "home" });
  });
  back();
  expect(route as GalleryRoute).toEqual({ screen: "home" });
  expect(firstCalls).toBe(0);
  expect(replacementCalls).toBe(1);
  expect(defaultBack).toBe(0);
  cleanup(); // The detail unmounts on return home.
  expect(removed).toBe(2);
  expect(handlers.size).toBe(0);
  back();
  expect(defaultBack).toBe(1);
  expect(replacementCalls).toBe(1);
});
