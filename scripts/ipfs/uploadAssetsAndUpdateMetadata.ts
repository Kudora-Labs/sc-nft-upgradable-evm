import dotenv from "dotenv";
import { getMetadataPath } from "../shared/fs/getMetadataPath";
import { writeJsonAtomic } from "../shared/fs/writeJsonAtomic";
import { uploadAsset } from "../shared/ipfs/uploadAsset";
import type { NFTMetadata } from "../shared/metadata/nftMetadataSchemas";
import { parseAndValidateMetadata } from "../shared/metadata/parseNftMetadata";

dotenv.config();

type IsNonEmptyOptions = {
    value?: string;
};

const isNonEmpty = ({ value }: IsNonEmptyOptions): boolean => {
    return typeof value === "string" && value.trim() !== "";
};

const getFlag = (name: string): string | undefined => {
    const arg = process.argv.find((a) => a.startsWith(`${name}=`));

    return arg ? arg.split("=")[1] : undefined;
};

const resolveIdsFromArgs = (): { collection: string; ids: number[] } => {
    const collection = process.argv[2];
    const thirdArg = process.argv[3];

    const startIdStr = getFlag("startId");
    const endIdStr = getFlag("endId");
    const singleId =
        thirdArg && !thirdArg.includes("=") ? Number.parseInt(thirdArg, 10) : undefined;

    if (!collection || (!singleId && (!startIdStr || !endIdStr))) {
        console.error(
            "❌ Usage:\n" +
                "   npx tsx uploadAssetsAndUpdateMetadata.ts <collection> <nftId>\n" +
                "   npx tsx uploadAssetsAndUpdateMetadata.ts <collection> startId=<number> endId=<number>",
        );
        process.exit(1);
    }

    if (typeof singleId === "number" && !Number.isNaN(singleId)) {
        return { collection, ids: [singleId] };
    }

    const a = Number.parseInt(startIdStr as string, 10);
    const b = Number.parseInt(endIdStr as string, 10);

    if (Number.isNaN(a) || Number.isNaN(b)) {
        console.error("❌ StartId and EndId must be valid integers.");
        process.exit(1);
    }

    const from = Math.min(a, b);
    const to = Math.max(a, b);
    const ids: number[] = [];

    for (let i = from; i <= to; i = i + 1) {
        ids.push(i);
    }

    return { collection, ids };
};

export const uploadAssetsAndUpdateMetadata = async (
    collection: string,
    nftId: number,
): Promise<{ video: string; image: string } | null> => {
    const metadataPath = getMetadataPath(collection, nftId);

    let metadata: NFTMetadata;

    try {
        metadata = parseAndValidateMetadata(metadataPath);
    } catch {
        console.warn(
            `❌  Metadata not found or invalid for NFT ${String(nftId)} at: ${metadataPath} (skipped).`,
        );

        return null;
    }

    const shouldUploadImage = !isNonEmpty({ value: metadata.image });
    const shouldUploadAnimation = !isNonEmpty({ value: metadata.animation_url });

    if (!shouldUploadImage && !shouldUploadAnimation) {
        console.log(`❌  Skipped NFT ${String(nftId)}: "image" and "animation_url" already set.`);

        return null;
    }

    const [videoUrl, imageUrl] = await Promise.all([
        shouldUploadAnimation
            ? uploadAsset(collection, String(nftId), [".mp4"])
            : Promise.resolve(metadata.animation_url),
        shouldUploadImage
            ? uploadAsset(collection, String(nftId), [".gif", ".png"])
            : Promise.resolve(metadata.image),
    ]);

    if (shouldUploadAnimation && !videoUrl) {
        throw new Error(`❌ Failed to upload required video for NFT ${String(nftId)}`);
    }
    if (shouldUploadImage && !imageUrl) {
        throw new Error(`❌ Failed to upload required image for NFT ${String(nftId)}`);
    }

    const updated: NFTMetadata = {
        ...metadata,
        animation_url: videoUrl ?? metadata.animation_url,
        image: imageUrl ?? metadata.image,
    };

    await writeJsonAtomic(metadataPath, updated);

    console.log(`✅ Updated NFT ${String(nftId)}`);

    return { video: updated.animation_url, image: updated.image };
};

const scriptPath = process.argv[1] ?? "";

if (
    scriptPath.endsWith("uploadAssetsAndUpdateMetadata.ts") ||
    scriptPath.endsWith("uploadAssetsAndUpdateMetadata.js")
) {
    const { collection, ids } = resolveIdsFromArgs();

    (async () => {
        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const id of ids) {
            try {
                const result = await uploadAssetsAndUpdateMetadata(collection, id);

                if (result) {
                    updatedCount = updatedCount + 1;
                } else {
                    skippedCount = skippedCount + 1;
                }
            } catch (error) {
                errorCount = errorCount + 1;
                console.error(
                    `❌ Error on NFT ${String(id)}:`,
                    error instanceof Error ? error.message : String(error),
                );
            }
        }

        console.log("\nSummary:");
        console.log(`  PROCESSED : ${String(ids.length)}`);
        console.log(`  UPDATED   : ${String(updatedCount)}`);
        console.log(`  SKIPPED   : ${String(skippedCount)}`);
        console.log(`  ERRORS    : ${String(errorCount)}`);

        if (errorCount > 0) {
            process.exit(1);
        }
    })().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
