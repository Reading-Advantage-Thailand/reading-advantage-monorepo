const { storage } = require("./googleStorage");
const fs = require("fs");

async function uploadToBucket(localPath, destination, isPublic, isDeleteLocal) {
  try {
    // upload the file to the bucket
    await storage
      .bucket("artifacts.reading-advantage.appspot.com")
      .upload(localPath, {
        destination: destination,
      });

    // make the file public

    await storage
      .bucket("artifacts.reading-advantage.appspot.com")
      .file(destination)
      .makePublic();

    // delete the file from the local file system

    fs.unlinkSync(localPath);

    console.log("SUCCESS UPLOADING TO BUCKET: ", destination);
  } catch (error) {
    console.error("ERROR UPLOADING TO BUCKET: ", error);
    throw error;
  }
}

module.exports = uploadToBucket;
