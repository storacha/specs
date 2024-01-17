# w3-store Authorization + IPFS Pinning Service API

![wip](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)

## Implementations

There are no known implementations of w3-store Authorization + IPFS Pinning Service API.

See [w3-store](./w3-store.md) for implementations of the storage protocol that this refers to.

## Description

We reimagine IPFS [pinning service][] as a web3 service, where:

- Users delegate necessary capabilities to the pinning service as opposed to getting [access token][]s from the service which must be kept secret.
- As a layer on top of [w3-store](./w3-store.md) protocol

The following table maps [IPFS pinning service API][pinning service] operations to capabilities necessary to execute them

| Operation                                                                                             | Capabilities                       |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------- |
| [add](https://ipfs.github.io/pinning-services-api-spec/#tag/pins/paths/~1pins/post)                   | [`store/add`][]                    |
| [remove](https://ipfs.github.io/pinning-services-api-spec/#tag/pins/paths/~1pins~1{requestid}/delete) | [`store/remove`][]                 |
| [list](https://ipfs.github.io/pinning-services-api-spec/#tag/pins/paths/~1pins/get)                   | [`store/list`][]                   |
| [replace](https://ipfs.github.io/pinning-services-api-spec/#tag/pins/paths/~1pins~1{requestid}/post)  | [`store/add`][] [`store/remove`][] |
| [get](https://ipfs.github.io/pinning-services-api-spec/#tag/pins/paths/~1pins~1{requestid}/get)       | [`store/get`][]                   |

a w3 pinning service accepts requests whose access token is a [UCAN JWT][] where:

1. Root issuer is the same DID as one in `with` field of the delegated capabilities.
2. DID in `with` field is associated with some account on the Pinning Service.
3. All the linked [proofs are embedded](https://github.com/ipld/js-dag-ucan#embedding-proofs) inline.

Using UCANs for authorization offers following advantages to typical [bearer tokens](https://oauth.net/2/bearer-tokens/):

1. Users are able to delegate access to [pinning service] to other DIDs.
2. Users can delegate access to only a subset of their authorizations, restricting access to desired operations.
3. Users can revoke and rotate tokens as they wish.

This also creates an opportunity for implementing better [pinning service][] clients that issue short lived tokens for each operation and remove the need for keeping tokens secret. [@ipld/dag-ucan](https://www.npmjs.com/package/@ipld/dag-ucan) library could be used to issue such tokens

## Request ID

Pinning service uses `requestid` field to uniquely identify pinning requests. We extend IPFS [pinning service][] specification with additional constraint.

Pin request MUST be identified with a `requestid` derived from the pin request. More specifically it should be a CID of the CBOR encoded `Pin` object with a `sha256` (multi)hash. In typescript this can be encoded as follows:

```ts
import type { Link, DID } from "@ipld/dag-ucan"
import * as CBOR from "@ipld/dag-cbor"
import { sha256 } from "multiformats/hashes/sha2"

type RequestID = Link<Pin, typeof CBOR.code, typeof sha256.code> {}

interface Pin {
  cid: CID
  // Optional name for pinned data (can be used for lookups)
  name?: string
  // Optional list of multiaddrs known to provide the data
  origins?: string[]
  // Optional metadata for pin object
  meta: { group: DID } & Record<string, string>
}


```

> Please note [`Link`][link-type] is a type for CID destination type hint and is equivalent of [Link](https://ipld.io/docs/schemas/features/links/#link-destination-type-hinting) IPLD Schema.

### Implementation Notes

This design frees [pinning service] from doing any kind of access control or token validation. It simply needs to

1. Parse [access token][] as a UCAN.
2. Ensure that `audience` corresponds to own DID.
3. Verify that UCAN is valid (has right signature, has not expired etc)
4. Create UCAN invocation (corresponding to received request) and embed UCAN (from [access token][]) as a proof.

While UCAN validation is not strictly necessary (as they get verified downstream anyway) it might be a good idea to avoid unnecessary work downstream.

[pinning service]: https://ipfs.github.io/pinning-services-api-spec/
[link-type]: https://github.com/ipld/js-dag-ucan/blob/364379b54cae383198fcf6a9c0016b497e62d422/src/ucan.ts#L227-L242
[access token]: https://ipfs.github.io/pinning-services-api-spec/#section/Authentication/accessToken
[`store/add`]: https://github.com/web3-storage/specs/blob/main/w3-store.md#storeadd
[`store/remove`]: https://github.com/web3-storage/specs/blob/main/w3-store.md#storeremove
[`store/list`]: https://github.com/web3-storage/specs/blob/main/w3-store.md#storelist
[`store/get`]: https://github.com/web3-storage/specs/blob/main/w3-store.md#storeget
[ucan]: https://github.com/ucan-wg/spec/
[UCAN JWT]: https://github.com/ucan-wg/spec/tree/692e8aab59b763a783fe1484131c3f40d997b69a#3-jwt-structure