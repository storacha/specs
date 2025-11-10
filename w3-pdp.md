# W3 PDP Protocol

![status:draft](https://img.shields.io/badge/status-draft-yellow.svg?style=flat-square)

## Editors

- [Hannah Howard]

## Authors

- [Hannah Howard]

# Abstract

This spec describes a [UCAN] protocol allowing an implementer to prove possession and verify inclusion of data blobs within aggregated storage proofs using cryptographic merkle tree commitments.

## Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC2119](https://datatracker.ietf.org/doc/html/rfc2119).

# Table of Contents

- [Terminology](#terminology)
  - [Roles](#roles)
    - [Provider](#provider)
    - [Verifier](#verifier)
- [Protocol](#protocol)
  - [Overview](#overview)
  - [Authorization](#authorization)
  - [Capabilities](#capabilities)
    - [Provider Capabilities](#provider-capabilities)
      - [`pdp/accept`]
    - [Verifier Capabilities](#verifier-capabilities)
      - [`pdp/info`]
  - [Schema](#schema)
    - [Base types](#base-types)
    - [`pdp/accept` schema](#pdpaccept-schema)
    - [`pdp/info` schema](#pdpinfo-schema)

# Terminology

## Roles

There are several roles in the authorization flow:

| Name         | Description                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------- |
| [Provider]   | [Principal] identified by a DID, representing a storage provider that accepts and aggregates blobs. |
| [Verifier]   | [Principal] identified by a DID, that verifies blob possession and retrieves inclusion proofs.     |

### Provider

A _Provider_ is a type of [principal] identified by a DID (typically a [`did:key`] or [`did:web`] identifier).

A _Provider_ accepts data blobs for aggregation and maintains cryptographic proofs demonstrating that blobs are included within aggregated pieces. A [Provider] MUST be capable of computing merkle tree inclusion proofs for blobs within their aggregates.

### Verifier

A _Verifier_ is a type of [principal] identified by a DID (typically a [`did:key`] identifier) that queries [Provider]s to retrieve proof information about stored blobs.

A _Verifier_ can invoke the [`pdp/info`] capability to obtain aggregate and inclusion proof information for blobs, enabling verification that data is possessed and properly indexed within the [Provider]'s system.

# Protocol

## Overview

A [Provider] is a service that accepts data blobs and aggregates them into larger composite pieces, maintaining cryptographic merkle tree proofs demonstrating the inclusion of each blob within its aggregate. Blobs are identified by their content multihash to enable content-addressed verification. When a blob is accepted for aggregation, the [Provider] generates an inclusion proof (a merkle tree path and index) proving the blob's position within the aggregate.

A [Verifier] can invoke the [`pdp/info`] capability to query a [Provider] for:
- The canonical piece representation of a blob
- All aggregates in which the blob has been included
- Merkle tree inclusion proofs for each aggregate containing the blob

This enables verification that a specific blob is stored and properly indexed, and provides the cryptographic proofs necessary for auditing the [Provider]'s storage claims.

### Authorization

[Provider]s and [Verifier]s MUST use UCAN based authorization mechanisms to interact. The way in which [Verifier]s are registered to use [Provider]s is out of scope of this specification.

For example, a [Provider] can authorize invocations from `did:key:zAliceVerifier` by validating the signature is from the DID. This way, it allows verifiers to rotate keys and/or re-delegate access without having to coordinate with the [Provider].

### _Provider_ accepts a blob for aggregation

A [Provider] MUST accept blob submissions identified by multihash. When a blob is submitted for aggregation, the [Provider] MUST queue the blob and issue a signed receipt acknowledging the submission. The [Provider] MUST include an `fx.join` [effect] linking to the blob's eventual inclusion in an aggregate.

Once a [Provider] has aggregated the blob into an aggregate piece, it MUST issue a receipt for the [`pdp/accept`] task with an [`InclusionProof`] indicating:
- The `piece` representation of the blob (usually its COMPp commitment)
- The `aggregate` piece containing the blob
- The `inclusion` merkle tree proof (path and index) proving the blob's position within the aggregate

#### `pdp/accept` effect

A successful invocation receipt MUST have an `fx.join` [effect] that links to the terminating task of the workflow. It allows the observer to lookup whether the blob has been included in an aggregate.

### _Verifier_ queries blob information

A [Verifier] MAY invoke the [`pdp/info`] capability to retrieve information about a blob's aggregates and inclusion proofs.

When a [Verifier] invokes [`pdp/info`] with a blob multihash, the [Provider] MUST return:
- The canonical `piece` representation of the blob
- An array of `aggregates` containing the blob, each with:
  - The aggregate's `piece` identifier
  - The merkle tree `inclusion` proof for the blob within that aggregate

This information allows the [Verifier] to:
1. Confirm the blob is stored by the [Provider]
2. Retrieve cryptographic proofs of inclusion for auditing purposes
3. Track which aggregates contain the blob across time (as aggregates may change)

## Capabilities

This section describes the set of capabilities that form the W3 PDP protocol.

### _Provider_ Capabilities

#### `pdp/accept`

An agent MUST invoke the `pdp/accept` capability to submit a blob for aggregation by the [Provider]. See [schema](#pdpaccept-schema).

> `did:key:zAliceBlob` invokes `pdp/accept` capability provided by `did:key:zProvider`

```json
{
  "iss": "did:key:zAliceBlob",
  "aud": "did:key:zProvider",
  "att": [
    {
      "with": "did:key:zAlice",
      "can": "pdp/accept",
      "nb": {
        /* Multihash digest of blob to be accepted */
        "blob": { "/": "12201234abcd..." }
      }
    }
  ],
  "prf": [],
  "sig": "..."
}
```

The [Provider] MUST issue a signed receipt acknowledging the blob submission. The receipt MUST contain an `fx.join` [effect] linking to the [`pdp/accept`] terminating task.

```json
{
  "ran": "bafy...pdpAccept",
  "out": {
    "ok": {
      /* Piece representation of the blob */
      "piece": { "/": "bafk...commp" },
      /* Aggregate containing this blob */
      "aggregate": { "/": "bafk...aggregate" },
      /* Merkle tree inclusion proof */
      "inclusion": {
        "tree": {
          "path": [
            "bafk...root",
            "bafk...parent",
            "bafk...child"
          ],
          "at": 1
        },
        "index": {
          "path": [
            "bafk...proof0",
            "bafk...proof1"
          ],
          "at": 3
        }
      }
    }
  },
  "fx": {
    "join": { "/": "bafy...pdpAccept" }
  },
  "meta": {},
  "iss": "did:key:zProvider",
  "prf": []
}
```

##### Failure Cases

The [Provider] MAY fail the invocation if the blob cannot be accepted or aggregated:

```json
{
  "ran": "bafy...pdpAccept",
  "out": {
    "error": {
      "name": "BlobInvalidError",
      "message": "Blob multihash is invalid or unsupported"
    }
  },
  "fx": {},
  "meta": {},
  "iss": "did:key:zProvider",
  "prf": []
}
```

### _Verifier_ Capabilities

#### `pdp/info`

An agent MAY invoke the `pdp/info` capability to retrieve information about a blob's aggregates and inclusion proofs. See [schema](#pdpinfo-schema).

> `did:key:zAliceVerifier` invokes `pdp/info` capability provided by `did:key:zProvider`

```json
{
  "iss": "did:key:zAliceVerifier",
  "aud": "did:key:zProvider",
  "att": [
    {
      "with": "did:key:zAlice",
      "can": "pdp/info",
      "nb": {
        /* Multihash digest of blob to query */
        "blob": { "/": "12201234abcd..." }
      }
    }
  ],
  "prf": [],
  "sig": "..."
}
```

##### Success Response

The [Provider] MUST return information about all aggregates containing the specified blob:

```json
{
  "ran": "bafy...pdpInfo",
  "out": {
    "ok": {
      /* Piece representation of the blob */
      "piece": { "/": "bafk...commp" },
      /* Aggregates containing this blob */
      "aggregates": [
        {
          /* Aggregate piece identifier */
          "aggregate": { "/": "bafk...aggregate0" },
          /* Merkle tree inclusion proof for this blob in this aggregate */
          "inclusion": {
            "tree": {
              "path": [
                "bafk...root",
                "bafk...parent",
                "bafk...child"
              ],
              "at": 1
            },
            "index": {
              "path": [
                "bafk...proof0",
                "bafk...proof1"
              ],
              "at": 3
            }
          }
        }
      ]
    }
  },
  "fx": {
    "fork": []
  },
  "meta": {},
  "iss": "did:key:zProvider",
  "prf": []
}
```

The [Provider] SHOULD return the canonical piece representation of the blob with no associated aggregates IF AND ONLY IF the blob is known to the provider and pending aggregation.


##### Failure Cases

The [Provider] MAY fail if the blob is not found in any aggregate AND is not pending aggregation:

```json
{
  "ran": "bafy...pdpInfo",
  "out": {
    "error": {
      "name": "BlobNotFoundError",
      "message": "Blob not found in any aggregate"
    }
  },
  "fx": {
    "fork": []
  },
  "meta": {},
  "iss": "did:key:zProvider",
  "prf": []
}
```

## Schema

### Base types

```ipldsch
type PDPCapability union {
  | PDPAccept "pdp/accept"
  | PDPInfo "pdp/info"
} representation inline {
  discriminantKey "can"
}

type Multihash bytes
type PieceLink Link
type BlobDigest Multihash

type ProofPath struct {
  path [Link]
  at Int
}

type InclusionProof struct {
  tree ProofPath
  index ProofPath
}
```

### `pdp/accept` schema

```ipldsch
type PDPAccept struct {
  with PrincipalDID
  nb PDPAcceptDetail
}

type PDPAcceptDetail struct {
  # Multihash digest of blob being accepted
  blob Multihash
}

type PDPAcceptOk struct {
  # Piece representation of the blob
  piece PieceLink
  # Aggregate containing this blob
  aggregate PieceLink
  # Merkle tree inclusion proof
  inclusion InclusionProof
}
```

### `pdp/info` schema

```ipldsch
type PDPInfo struct {
  with PrincipalDID
  nb PDPInfoDetail
}

type PDPInfoDetail struct {
  # Multihash digest of blob to query
  blob Multihash
}

type PDPInfoAggregate struct {
  # Aggregate piece identifier
  aggregate PieceLink
  # Merkle tree inclusion proof for blob in this aggregate
  inclusion InclusionProof
}

type PDPInfoOk struct {
  # Piece representation of the blob
  piece PieceLink
  # Aggregates containing this blob
  aggregates [PDPInfoAggregate]
}
```

---

[PrincipalDID]: https://github.com/ucan-wg/spec/#321-principals
[`did:key`]: https://w3c-ccg.github.io/did-method-key/
[`did:web`]: https://w3c-ccg.github.io/did-method-web/
[UCAN]: https://github.com/ucan-wg/spec/
[principal]: https://github.com/ucan-wg/spec/#321-principals
[effect]: https://github.com/ucan-wg/invocation/#7-effect
[Hannah Howard]: https://github.com/hannahhoward
[Provider]: #provider
[Verifier]: #verifier
[`pdp/accept`]: #pdpaccept
[`pdp/info`]: #pdpinfo
