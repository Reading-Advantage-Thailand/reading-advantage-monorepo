import { DBCollection } from "../models/enum";
import { DocumentData } from "firebase/firestore";
import { getDoc, setDoc, updateDoc, createDoc, deleteDoc, getAllDocs, getFilteredDocs, Filter, isDocExists, isCollectionExists } from "./firestore-operations";

const createFirestoreService = <T extends DocumentData>(collection: DBCollection, parent?: { subCollection: string, docId: string }) => {
    return {
        getDoc: (id: string) => getDoc<T>(collection, id, parent),
        setDoc: (id: string, data: T) => setDoc(collection, id, data, parent),
        updateDoc: (id: string, data: Partial<T>) => updateDoc(collection, id, data, parent),
        createDoc: (data: Omit<T, "id">) => createDoc(collection, data, parent),
        deleteDoc: (id: string) => deleteDoc(collection, id, parent),
        getAllDocs: (filter?: { select?: string[], limit?: number }) => getAllDocs<T>(collection, filter, parent),
        isDocExists: (id: string) => isDocExists(collection, id, parent),
        isCollectionExists: () => isCollectionExists(collection),
        // Got some error here from the pagination
        // getFilteredDocs: (filter: Filter) => getFilteredDocs<T>(collection, filter, parent),
    };
};

export default createFirestoreService;
