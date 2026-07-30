import {
  ACCEPTED_STANDARD_ASSET_RELEASE,
  createAcceptedStandardAssetResolver,
} from "./accepted-standard-pack-release.js";
import { validateAssetContractV2Descriptor } from "./asset-contract-v2.js";
import {
  createDescriptorAwareSemanticAssetResolver,
  validateSemanticProductBindings,
} from "./semantic-product-bindings.js";
import type { AssetContractV2PhysicalDescriptor } from "./asset-contract-v2.js";
import type {
  AssetContractV2SemanticRegistration,
  SemanticAssetRequirement,
} from "./semantic-product-bindings.js";
import type {
  StandardAssetCatalog,
  StandardAssetResolver,
} from "./standard-pack-release.js";

const acceptedResolverByCatalog = new WeakMap<
  StandardAssetCatalog,
  Promise<StandardAssetResolver>
>();

function getAcceptedResolver(catalog: StandardAssetCatalog): Promise<StandardAssetResolver> {
  const cached = acceptedResolverByCatalog.get(catalog);
  if (cached) return cached;
  const resolver = createAcceptedStandardAssetResolver(catalog, {
    version: ACCEPTED_STANDARD_ASSET_RELEASE.version,
    catalogDigest: ACCEPTED_STANDARD_ASSET_RELEASE.catalogDigest,
    sourceReceiptDigest: ACCEPTED_STANDARD_ASSET_RELEASE.sourceReceiptDigest,
  });
  acceptedResolverByCatalog.set(catalog, resolver);
  return resolver;
}

function sameDescriptor(
  left: AssetContractV2PhysicalDescriptor,
  right: AssetContractV2PhysicalDescriptor,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Creates exact registration objects issued by a descriptor-aware resolver for adapter tests.
 * @param definitions Semantic requirements paired with untrusted descriptor candidates.
 * @param catalog Exact root-accepted standard-pack catalog loaded by the test consumer.
 * @returns Resolver-issued registrations bound to real accepted-release provenance.
 * @throws When no physical accepted entry matches a descriptor or duplicate fixture descriptors conflict.
 */
export async function createResolverIssuedV2Registrations(
  definitions: readonly Readonly<{
    semantic: SemanticAssetRequirement;
    descriptor: unknown;
  }>[],
  catalog: StandardAssetCatalog,
): Promise<readonly AssetContractV2SemanticRegistration[]> {
  const validated = definitions.map(({ semantic, descriptor }) => ({
    semantic,
    descriptor: validateAssetContractV2Descriptor(descriptor),
  }));
  const mapped = validated.map(({ semantic, descriptor }) => {
    const catalogEntry = catalog.assets.find(
      (entry) => entry.key === descriptor.catalogEntryKey,
    );
    if (!catalogEntry) {
      throw new Error(
        "Fixture descriptor " + JSON.stringify(descriptor.descriptorId)
          + " references unknown accepted catalog key " + JSON.stringify(descriptor.catalogEntryKey),
      );
    }
    if (descriptor.mediaKind === "audio") {
      if (catalogEntry.physical.kind !== "audio" || catalogEntry.physical.dimensions !== null) {
        throw new Error(
          "Fixture descriptor " + JSON.stringify(descriptor.descriptorId)
            + " is incompatible with accepted catalog key " + JSON.stringify(descriptor.catalogEntryKey),
        );
      }
    } else {
      const dimensions = catalogEntry.physical.dimensions;
      if (
        catalogEntry.physical.kind !== "image"
        || !dimensions
        || !descriptor.geometry
        || dimensions.width !== descriptor.geometry.width
        || dimensions.height !== descriptor.geometry.height
      ) {
        throw new Error(
          "Fixture descriptor " + JSON.stringify(descriptor.descriptorId)
            + " dimensions or media kind do not match accepted catalog key " + JSON.stringify(descriptor.catalogEntryKey),
        );
      }
    }
    return { semantic, descriptor };
  });
  const manifest = validateSemanticProductBindings({
    schemaVersion: 1,
    classification: "owner-approved-product-binding",
    legacyEvidenceClaim: false,
    authority: "t11-owner-authorized-extension-v1",
    release: {
      version: ACCEPTED_STANDARD_ASSET_RELEASE.version,
      catalogDigest: ACCEPTED_STANDARD_ASSET_RELEASE.catalogDigest,
      sourceReceiptDigest: ACCEPTED_STANDARD_ASSET_RELEASE.sourceReceiptDigest,
    },
    bindings: mapped.map(({ semantic, descriptor }) => ({
      role: semantic.role,
      state: semantic.state,
      semanticKey: descriptor.catalogEntryKey,
      usage: descriptor.mediaKind === "ui" ? "nine-slice" : descriptor.mediaKind,
      ...(descriptor.mediaKind === "animation" ? { animation: descriptor.clips?.[0]?.id } : {}),
      ...(descriptor.mediaKind === "tileset" ? {
        tileSize: {
          width: descriptor.tiles?.tileWidth,
          height: descriptor.tiles?.tileHeight,
        },
      } : {}),
      ...(descriptor.mediaKind === "ui" ? { nineSlice: descriptor.nineSlice } : {}),
    })),
  });
  const descriptorsByKey = new Map<string, AssetContractV2PhysicalDescriptor>();
  for (const { descriptor } of mapped) {
    const existing = descriptorsByKey.get(descriptor.catalogEntryKey);
    if (existing && !sameDescriptor(existing, descriptor)) {
      throw new Error(
        `Conflicting fixture descriptors map to ${JSON.stringify(descriptor.catalogEntryKey)}`,
      );
    }
    descriptorsByKey.set(descriptor.catalogEntryKey, descriptor);
  }
  const baseResolver = await getAcceptedResolver(catalog);
  const resolver = createDescriptorAwareSemanticAssetResolver(
    baseResolver,
    manifest,
    [...descriptorsByKey.values()],
  );
  return Object.freeze(mapped.map(({ semantic }) => resolver.resolve(semantic)));
}
