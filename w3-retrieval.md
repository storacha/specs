# Retrieval

## Editors

- [Alan Shaw](https://github.com/alanshaw), [Storacha](https://storacha.network/)

## Authors

- [Alan Shaw](https://github.com/alanshaw), [Storacha](https://storacha.network/)

## Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## Abstract

This is a specification that defines UCAN capabilities for authorizing retrieval of resources.

## Introduction

In the Storacha Network data retrievals are authorized by UCAN to allow for strict egress accounting. UCAN authorized retrievals do not prove delivery of data but they can be used to prove that data was requested by an authorized agent.

**It is intended that this specification is used in conjunction with [HTTP Header UCAN Invocation](./http-header-ucan-invocation.md) to allow resources to be served in the same request they are authorized in.**

## Content Retrieve

An authorized agent MAY invoke the `space/content/retrieve` capability on the space subject to retrieve blob bytes.

### Invocation Example

The following invocation example illustrates Alice requesting to retrieve 1,636 bytes from a blob stored in her space.

> ℹ️ Note: we use `// "/": "bafy..` comments to denote CID of the parent object.

```jsonc
{ // "/": "bafy..retrieve"
  "iss": "did:key:zAlice",
  "aud": "did:key:zStorageNode",
  "att": [{
    "can": "space/content/retrieve",
    "with": "did:key:zAliceSpace",
    "nb": {
      "blob": {
        // multihash of the blob to retrieve data from as byte array
        "digest": { "/": { "bytes": "mEi...sfKg" } }
      },
      // byte range to extract from the blob - start and end byte (both inclusive)
      "range": [2097152, 2098788]
    }
  }],
  "exp": 123,
  "nnc": "123"
}
```

### Receipt Example

Shows an example receipt for the above `space/content/retrieve` capability invocation.

```jsonc
{
  "ran": "bafy..retrieve",
  "out": {
    "ok": {}
  }
}
```

### Capability

#### Capability Schema

```ts
type ContentRetrieve = {
  can: "space/content/retrieve"
  with: SpaceDID
  nb: {
    blob: {
      digest: Multihash
    }
    range: [int, int]
  }
}

type Multihash = bytes
type SpaceDID = string
```

#### Blob Digest

The `nb.blob.digest` field MUST be a [multihash] digest of the blob payload bytes. Implementations SHOULD support SHA2-256 algorithm. Implementations MAY support other hashing algorithms.

#### Range

The `nb.range` field MUST be a tuple of two unsigned integers. The first integer is the start offset from which to extract bytes. The second integer is the offset at which extraction should end. Both offsets are _inclusive_. The end offset MUST be greater than or equal to the start offset. The start offset and end offset MUST be greater than or equal to 0 and MUST be less than the total byte size of the blob.

If the range is not satisfiable, i.e. the offsets fall outside of the total size of the blob or are otherwise invalid, then the service MUST respond with a `RangeNotSatisfiable` error (see below).

### Receipt

#### Receipt Schema

```ts
// Only operation specific fields are covered the rest are implied
type ContentRetrieveReceipt = {
  out: Result<ContentRetrieveOk, ContentRetrieveError>
}

type Result<Ok, Err> = { ok: Ok } | { error: Err }

type ContentRetrieveOk = {}

type ContentRetrieveError =
  | RangeNotSatisfiable
  | Failure

type RangeNotSatisfiable = {
  name: 'RangeNotSatisfiable'
  message: string
}

type Failure = {
  name: string
  message: string
}
```

#### Result

The invocation MUST fail if any of the following is true:

1. Provided subject space does not contain the blob.
1. Provided `blob.digest` is not a valid [multihash].
1. Provided `blob.digest` [multihash] hashing algorithm is not supported.
1. Provided `range` references bytes outside of the total size of the blob.

Invocation MUST succeed if none of the above is true.

Successful execution of a `space/content/retrieve` invocation MUST result in the requested data being sent to the agent that issued the request. Replayed invocations MAY send the requested data, but it is not required. It is RECOMMENDED that `space/content/retrieve` invocations specify a [nonce](https://github.com/ucan-wg/spec/tree/v0.9.2#323-nonce) or a non-static [expiry](https://github.com/ucan-wg/spec/tree/v0.9.2#322-time-bounds) to ensure that data is always sent.
