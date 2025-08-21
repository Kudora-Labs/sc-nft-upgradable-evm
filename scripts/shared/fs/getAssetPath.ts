import path from "node:path";

const ROOT_PATH = process.cwd();

export const getAssetPath = (collection: string, id: string, ext: string): string => {
    return path.join(ROOT_PATH, "backend", collection, "assets", `${id}${ext}`);
};
