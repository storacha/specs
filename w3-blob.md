# W3 Blob Protocol

![status:wip](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)

- [Irakli Gozalishvili](https://github.com/gozala)

## Authors

- [Irakli Gozalishvili](https://github.com/gozala)

## Abstract

W3 blob protocol allows authorized agents to store arbitrary content blobs with a storage provider.

## Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC2119](https://datatracker.ietf.org/doc/html/rfc2119).

# Introduction

W3 blob protocol provides core building block for storing content and sharing access to it through UCAN authorization system. It is successor to the [store protocol] which no longer requires use of [Content Archive][CAR]s even if in practice clients can continue to use it for storing shards of large DAGs.

## Concepts

### Roles

There are several distinct roles that [principal]s may assume in this specification:

| Name        | Description                                                                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Principal | The general class of entities that interact with a UCAN. Identified by a DID that can be used in the `iss` or `aud` field of a UCAN. |
| Agent       | A [Principal] identified by [`did:key`] identifier, representing a user in an application. |
| Issuer | A [principal] delegating capabilities to another [principal]. It is the signer of the [UCAN]. Specified in the `iss` field of a UCAN. |
| Audience | Principal access is shared with. Specified in the `aud` field of a UCAN. |


### Space

A namespace, often referred as a "space", is an owned resource that can be shared. It corresponds to a unique asymmetric cryptographic keypair and is identified by a [`did:key`] URI.

### Blob

Blob is a fixed size byte array addressed by the [multihash]. Usually blobs are used to represent set of IPLD blocks at different byte ranges.

# Capabilities

## Add Blob

Authorized agent MAY invoke `/space/content/add/blob` capability on the [space] subject to store specific byte array.

> Note that storing a blob does not imply advertising it on the network or making it publicly available.

### Add Blob Capability

#### Add Blob Capability Schema

```ipldsch
type struct AddBlob {
  cmd   "/space/content/add/blob"
  sub   SpaceDID
  args  Blob
}

type struct Blob {
  content   Multihash
  size      Int
}
```

#### Blob Content

Blob `content` field MUST be a [multihash] digest of the blob payload bytes, uniquely identifying blob.

#### Blob Size

Blob `size` field MUST be set to the size of the blob in bytes.

### Add Blob Receipt

#### Add Blob Result

```ipldsch
type BlobAddResult union {
  BlobAddSuccess    "ok"
  BlobAddFailure    "error"
} representation keyed

type BlobAddSuccess union {
  BlobAddAllocation     "allocated"
  &UCANLocationClaim    "committed"
} representation keyed

type BlobAddAllocation struct {
  content   Multihash
  size      Int

  url       URL
  headers   HTTPHeaders
}

type UCANLocationClaim struct {
  iss     DID
  aud     DID
  sub     SpaceDID
  cmd     "assert/location"
  args    LocationClaim
  nonce   bytes
  exp     Int
}

type LocationClaim struct {
  content    Multihash
  url        URL
  range      ByteRange
}

type ByteRange struct {
  offset    Int
  length    Int
} representation tuple
```

#### Add Blob Success

##### Add Blob Allocated

Capability provider MUST issue receipt with `BlobAddAllocation` success result if underlying space has enough capacity for the requested blob, but has not such blob locally.

The `url` field MUST be set to the HTTP PUT endpoint where `content` matching specified [multihash] and `size` could be uploaded.

The `headers` field MUST be set to the HTTP headers to be send along with `content` to the HTTP PUT endpoint.

###### Add Blob Committed

Capability provider MUST issue receipt with `LocationClaim` capability delegated to the [space] when requested blob is added to the space, which can happen if provider already has a matching blob locally.

By delegating `LocationClaim` to the space provider makes a commitment to serve corresponding blob at byte range in from given URL to all authorized agents.

> Not that since `aud` of the claim is the `space` DID, space can authorize other principals by re-delegating this claim.

## Get Blob

Authorized agent MAY invoke `/space/content/get/blob` capability on the [space] subject to query a state of the corresponding blob.

### Get Blob Capability

#### Get Blob Capability Schema

```ipldsch
type struct GetBlob {
  cmd   "/space/content/get/blob"
  sub   SpaceDID
  args  BlobQuery
}

type struct BlobQuery {
  content   Multihash
}
```

### Get Blob Receipt

#### Get Blob Result

```ipldsch
type BlobAddResult union {
  BlobGetSuccess    "ok"
  BlobGetFailure    "error"
} representation keyed

type BlobGetSuccess union {
  BlobAddAllocation     "allocated"
  &UCANLocationClaim    "committed"
} representation keyed

type BlobGetFailure struct {
  message     string
}
```

#### Get Blob Success

Capability provider MUST return the state of the requested blob. If memory for the blob was allocated but content has not been yet uploaded result MUST be of `BlobAddAllocation` case. If blob has been allocated and uploaded result MUST of `UCANLocationClaim` case.

> Please note that implementation MAY check local state on invocation and update from `BlobAddAllocation` to `UCANLocationClaim`, however this SHOULD be done in referentially transparent way. In other words no side effects should be exhibited, instead function should lazily compute and cache.

## Publish Blob

Blob can be published by authorizing read interface (e.g. IPFS gateway) by re-delegating `LocationClaim` for a corresponding blob to it.

> Note that same applies to publishing blob on IPNI, new capability is not necessary, user simply needs to re-delegate `LocationClaim` to the DID representing IPNI publisher. IPNI publisher in turn may publish delegation to DID with publicly known private key allowing anyone to perform the reads.


[store protocol]:./w3-store.md
[CAR]:https://ipld.io/specs/transport/car/
[multihash]:https://github.com/multiformats/multihash
[space]:#space


