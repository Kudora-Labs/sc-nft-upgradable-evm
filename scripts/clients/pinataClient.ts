import fs from "node:fs";
import axios from "axios";
import dotenv from "dotenv";
import formData from "form-data";

dotenv.config();

const mustEnv = (key: string): string => {
    const value = process.env[key];

    if (!value) {
        throw new Error(`❌ Environment variable "${key}" is not defined`);
    }

    return value;
};

const PINATA_PIN_FILE_URL = mustEnv("PINATA_PIN_FILE_URL");
const PINATA_API_KEY = mustEnv("PINATA_API_KEY");
const PINATA_SECRET_API_KEY = mustEnv("PINATA_SECRET_API_KEY");

type PinataResponse = {
    IpfsHash: string;
    PinSize: number;
    Timestamp: string;
};

export const uploadToPinata = async (filePath: string): Promise<string | null> => {
    const data = new formData();

    data.append("file", fs.createReadStream(filePath));

    try {
        const res = await axios.post<PinataResponse>(PINATA_PIN_FILE_URL, data, {
            headers: {
                ...data.getHeaders(),
                pinata_api_key: PINATA_API_KEY,
                pinata_secret_api_key: PINATA_SECRET_API_KEY,
            },
        });

        return `ipfs://${res.data.IpfsHash}`;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error("❌ Error uploading to Pinata:", error.response?.data ?? error.message);
        } else {
            console.error("❌ Unexpected error:", error instanceof Error ? error.message : error);
        }

        return null;
    }
};
