import { promises as fs } from "node:fs";
import path from "node:path";

export const writeJsonAtomic = async (filePath: string, data: unknown): Promise<void> => {
    const dir = path.dirname(filePath);
    const base = path.basename(filePath);
    const tmp = path.join(dir, `.${base}.${String(process.pid)}.${String(Date.now())}.tmp`);

    const fd = await fs.open(tmp, "w", 0o644);

    try {
        await fd.writeFile(JSON.stringify(data, null, 2), "utf8");
        await fd.sync();
        await fd.close();
        await fs.rename(tmp, filePath);
    } finally {
        try {
            await fs.unlink(tmp);
        } catch {
            /* empty */
        }
    }
};
