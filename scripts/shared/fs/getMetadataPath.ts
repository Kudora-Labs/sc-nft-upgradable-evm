import path from "node:path";

const ROOT_PATH = process.cwd();

export const getMetadataPath = (collection: string, id: number): string => {
    return path.join(ROOT_PATH, "backend", collection, "metadata", `${String(id)}.json`);
};
