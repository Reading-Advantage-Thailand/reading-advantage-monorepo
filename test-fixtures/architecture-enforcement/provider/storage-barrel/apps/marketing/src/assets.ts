import { Storage } from "./storage-barrel";

/** Storage provider constructor leaked through a local barrel. */
export const barrelStorageProvider = Storage;
