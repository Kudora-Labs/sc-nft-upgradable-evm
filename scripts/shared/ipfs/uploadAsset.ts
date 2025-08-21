import fs from "node:fs/promises";
import { fileTypeFromBuffer } from "file-type";
import { uploadToPinata } from "../../clients/pinataClient";
import { getAssetPath } from "../fs/getAssetPath";

type SupportedExtensions = ".mp4" | ".png" | ".gif";
const expectedMimeTypes: MimeTypesMap = {
    ".mp4": ["video/mp4"],
    ".png": ["image/png"],
    ".gif": ["image/gif"],
};

type MimeTypesMap = {
    [K in SupportedExtensions]: string[];
};

export const uploadAsset = async (collection: string, fileId: string, extensions: string[]) => {
    for (const ext of extensions) {
        const filePath = getAssetPath(collection, fileId, ext);

        try {
            await fs.access(filePath);
        } catch {
            continue;
        }

        const buffer = await fs.readFile(filePath);
        const fileType = await fileTypeFromBuffer(buffer);
        const expectedMimes = expectedMimeTypes[ext as SupportedExtensions];

        if (!fileType || !expectedMimes.includes(fileType.mime)) {
            console.error(
                `❌ MIME type mismatch for file ${filePath}. Got "${fileType?.mime ?? "undefined"}".`,
            );
            continue;
        }

        const url = await uploadToPinata(filePath);

        if (url) {
            console.log(`✅ Uploaded ${ext} file ${fileId} → ${url}`);

            return url;
        }
    }

    return null;
};
