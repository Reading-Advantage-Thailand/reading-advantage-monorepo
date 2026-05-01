import { User } from "@/server/models/user";
import createFirestoreService from "./create-firestore-service";
import { DBCollection } from "@/server/models/enum";
import { License, LicenseRecord } from "@/server/models/license";

export const userService = createFirestoreService<User>(DBCollection.USERS);

export const licenseService = {
    licenses: createFirestoreService<License>(DBCollection.LICENSES),
    records: (docId: string) => createFirestoreService<LicenseRecord>(`${DBCollection.LICENSES}/${docId}/records`),
};
