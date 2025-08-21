import { z } from "zod";

export const attributeSchema = z.object({
    trait_type: z.string(),
    value: z.string(),
});

export const nftMetadataSchema = z.object({
    name: z.string(),
    description: z.string(),
    image: z.string(),
    animation_url: z.string(),
    attributes: z.array(attributeSchema),
});

export type NFTMetadata = z.infer<typeof nftMetadataSchema>;
