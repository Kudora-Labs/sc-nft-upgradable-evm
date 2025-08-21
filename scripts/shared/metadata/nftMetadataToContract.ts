import type {
    CoreMetadata,
    MediaMetadata,
} from "../../../typechain-types/contracts/extensions/SingleMintExtension";
import type { NFTMetadata } from "./nftMetadataSchemas";

export const toMintContractMetadata = (
    meta: NFTMetadata,
): {
    core: CoreMetadata.MetadataStruct;
    media: MediaMetadata.MetadataStruct;
} => {
    const extractAttribute = (key: string): string => {
        const found = meta.attributes.find((attr) => attr.trait_type === key)?.value;

        if (!found) {
            throw new Error(`❌ Missing attribute "${key}"`);
        }

        return found;
    };

    return {
        core: {
            tokenName: meta.name,
            collection: extractAttribute("Collection"),
            description: meta.description,
            creator: extractAttribute("Creator"),
            supply: extractAttribute("Supply"),
        },
        media: {
            image: meta.image,
            video: meta.animation_url,
        },
    };
};
