import { JsiSkApi } from "react-native-skia/lib/module/skia/web/JsiSkia.js";
import { qaFontDefinitions } from "../example/font-definitions.ts";
/** Shared QA-only loading; production never imports these frozen font assets. */
export async function loadQaFonts(api: ReturnType<typeof JsiSkApi>) {
  const provider = api.TypefaceFontProvider.Make();
  const resources: { dispose(): void }[] = [provider];
  const faces = new Map<
    string,
    NonNullable<ReturnType<typeof api.Typeface.MakeFreeTypeFaceFromData>>
  >();
  const dispose = () => {
    for (const resource of resources.reverse()) resource.dispose();
    resources.length = 0;
  };
  try {
    for (const [file, alias] of qaFontDefinitions) {
      const data = api.Data.fromBytes(
        new Uint8Array(
          await Bun.file(`${import.meta.dir}/../example/assets/${file}`).arrayBuffer(),
        ),
      );
      resources.push(data);
      const face = api.Typeface.MakeFreeTypeFaceFromData(data);
      if (!face) throw new Error(`QA font failed: ${file}`);
      resources.push(face);
      faces.set(alias, face);
      provider.registerFont(face, alias);
    }
    return { provider, faces, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
