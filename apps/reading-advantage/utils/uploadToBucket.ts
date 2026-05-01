import storage from "./storage";
import fs from 'fs';

export default async function uploadToBucket(
    localPath: string,
    destination: string,
    isPublic: boolean = true,
    isDeleteLocal: boolean = true,
) {
    try {
        // upload the file to the bucket
        await storage.bucket('artifacts.reading-advantage.appspot.com')
            .upload(localPath, {
                destination: destination,
            });

        // make the file public
        if (isPublic) {
            await storage.bucket('artifacts.reading-advantage.appspot.com')
                .file(destination)
                .makePublic();
        }

        // delete the file from the local file system
        if (isDeleteLocal) {
            fs.unlinkSync(localPath);
        }
        console.log('SUCCESS UPLOADING TO BUCKET: ', destination);
    } catch (error) {
        console.error('ERROR UPLOADING TO BUCKET: ', error);
        throw error;
    }
}