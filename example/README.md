# Native example

The Expo example uses the local library with Skia 3.0.3. It includes the approved thirteen-type gallery, theme-token editor, complex diagrams, CJK fixtures and a 31-category official Mermaid catalog. Only the selected inline diagram or viewer is mounted; gallery thumbnails are static Skia captures.

From the repository root, install and build the library, then register its Bun link before installing the example:

```sh
bun install --frozen-lockfile
bun run build
bun link
cd example
bun install --frozen-lockfile
```

For Android, install Android Studio and an Android SDK/emulator, then run from `example`:

```sh
bun run android
```

For iOS, use macOS with Xcode, an installed iOS Simulator and CocoaPods, then run from `example`:

```sh
bun run ios
```

Expo generates the ignored native project directories on the first run and builds the app with the local native toolchain. For a connected iPhone, use `bunx expo run:ios --device` and configure development signing when prompted. See [Expo local build setup](https://docs.expo.dev/guides/local-app-development/) for platform toolchain requirements. The iOS build must be verified on a Mac; Android verification does not establish iOS compatibility.

The example enables native iPad support (`ios.supportsTablet`); rebuild the generated iOS project after changing that setting. Test iPhone and iPad separately with their exact simulator IDs. Viewer modals provide their own safe-area container so their controls remain below the status bar.

Use a native development/release build; Expo Go cannot load this custom Skia dependency. Android requires API 26 or newer. Wrap app surfaces in `GestureHandlerRootView`.

The host owns the font provider, decoded images, clipboard, sharing and viewer presentation. Theme changes apply to the active diagram. Canvas taps interact with authored targets/data; the corner control expands explicitly. Motion respects system reduced motion.

QA fonts and their licenses/provenance live in [assets](assets/README.md). The library package excludes the complete example and ships no fonts. Fixtures outside the CJK section use English.

Run root `bun scripts/capture-design.ts design/theme-studio/implemented --thumbnails` to rebuild the approved gallery previews. After generating the paired official references, root `bun scripts/compare-official.ts --all --skia-only` renders the official sources through the production Skia renderer. See the [reference regeneration prerequisites](../README.md#examples-and-references). `bun scripts/compare-native-export.ts <validated-native-png>` compares the frozen native QA export fixture; it is not proof of device parity for every diagram.

Native UI flows live in `e2e`. From `example`, run `bun run e2e:check` to check registered scripts without a device. After installing the native app, run `QA_PLATFORM=ios QA_DEVICE=<simulator-udid> bun run e2e` or `QA_PLATFORM=android QA_DEVICE=<device-serial> bun run e2e`; the runner requires the explicit device ID and pins its driver version. It executes authored commands serially through the CLI, including target-directed scrolling, and binds every action to that device. Per-run command logs and failure screenshots are saved under `dist/native-qa/<device-id>/`; the JUnit report is `dist/e2e-<device-id>.xml`. See [library configuration](../CUSTOMIZATION.md) and [architecture](../ARCHITECTURE.md) for extension points and resource ownership.
