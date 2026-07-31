import { Assets, Container, Texture } from "pixi.js";

export function clearPixiContainer(container: Container): void {
  container.removeChildren().forEach((child) => child.destroy({ children: true }));
}

export async function safelyLoadPixiTexture(path: string): Promise<Texture | null> {
  try {
    return await Assets.load<Texture>(path);
  } catch {
    return null;
  }
}
