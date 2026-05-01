const { Storage } = require("@google-cloud/storage");
const serviceAccountKey = require("../service_account.json");

const storage = new Storage({
  projectId: "reading-advantage",
  credentials: serviceAccountKey,
});

module.exports = { storage };
