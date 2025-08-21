import fs from "node:fs";
import { type NFTMetadata, nftMetadataSchema } from "./nftMetadataSchemas";

export const parseAndValidateMetadata = (filePath: string): NFTMetadata => {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as unknown;

    return nftMetadataSchema.parse(raw);
};
