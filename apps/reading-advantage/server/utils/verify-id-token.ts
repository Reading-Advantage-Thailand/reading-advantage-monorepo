import { firebaseAdmin } from "@/lib/firebaseAdmin";
import { DecodedIdToken } from "firebase-admin/auth";

export const verifyIdToken = async (idToken: string): Promise<DecodedIdToken> => {
    try {
        return await firebaseAdmin.auth().verifyIdToken(idToken);
    } catch (error) {
        console.error("Error verifying ID token:", error);
        throw error;
    }
};
