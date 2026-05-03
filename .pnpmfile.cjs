function readPackage(pkg) {
  if (pkg.name === 'drizzle-orm') {
    delete pkg.peerDependencies['@prisma/client'];
    delete pkg.peerDependencies['prisma'];
    delete pkg.peerDependenciesMeta['@prisma/client'];
    delete pkg.peerDependenciesMeta['prisma'];
  }
  return pkg;
}

module.exports = {
  hooks: {
    readPackage
  }
};
