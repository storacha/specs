# W3 Blob Protocol

![status:wip](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)

- [Irakli Gozalishvili](https://github.com/gozala)
- [Vasco Santos](https://github.com/vasco-santos)

## Authors

- [Irakli Gozalishvili](https://github.com/gozala)
- [Vasco Santos](https://github.com/vasco-santos)

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

### Add Blob Diagram

Following diagram illustrates execution flow. Alice invokes `/space/content/add/blob` command which produces a receipt with three effects (`allocate`, `put`, `accept`) and awaited `site` commitment. Effects have dependencies and therefore predict execution flow (from left to right). The output of the main task awaits on the result of the last effect.

```mermaid
flowchart TB
Add("⏯️ /space/content/add/blob 👩‍💻 🤖")
AddOk("🧾 { ok: { site } }")


subgraph accept
Accept("⏯️ /service/blob/accept 🤖")
AcceptOk("🧾 { ok: { site } }")
end

subgraph put
Put("⏯️ /http/put 🔑")
PutOk("🧾 { ok: {} }")
end


subgraph allocate
Allocate("⏯️ /service/blob/allocate 🤖")
AllocateOk("🧾 { ok: { url headers } }")
end

Site("🎫 /assert/location 🤖👩‍💻")



Add -.-> AddOk
AddOk -- ⏭️ --> allocate
AddOk -- ⏭️ --> put
AddOk -- ⏭️ --> accept
AddOk -- 🚦 out.ok.site --> AcceptOk



Allocate -.-> AllocateOk

Put -- 🚦url --> AllocateOk
Put -- 🚦headers --> AllocateOk

Put -.-> PutOk



Accept -- 🚦_put --> PutOk
Accept -.-> AcceptOk
AcceptOk -- site --> Site
```

#### Iconography

- ⏯️ Task
- ⏭️ Next Task (a.k.a Effect)
- 🧾 Receipt
- 🎫 Delegation
- 🚦 Await
- 👩‍💻 Alice
- 🤖 Service
- 🔑 Derived Principal

### Add Blob Invocation Example

Shown Invocation example illustrates Alice requesting to add 2MiB blob to her space.

```js
{ // "/": "bafy..add"
  "cmd": "/space/content/add/blob",
  "sub": "did:key:zAlice",
  "iss": "did:key:zAlice",
  "aud": "did:web:web3.storage",
  "args": {
    "blob": {
      // multihash of the blob as byte array
      "digest": { "/": { "bytes": "mEi...sfKg" } },
      // size of the blob in bytes
      "size": 2_097_152,
    }
  }
}
```

### Add Blob Receipt Example

Shows an example receipt for the above `/space/content/add/blob` capability invocation.

> ℹ️ We use `// "/": "bafy..` comments to denote CID of the parent object.

```js
{ // "/": "bafy..work",
  "iss": "did:web:web3.storage",
  "aud": "did:key:zAlice",
  "cmd": "/ucan/assert",
  "sub": "did:web:web3.storage",
  "args": {
    "assert": [
      // refers to the invocation from the example
      { "/": "bafy..add" },
      // refers to the receipt corresponding to the above invocation
      {
        "out": {
          "ok": {
            // result of the add is the content (location) commitment
            // that is produced as result of "bafy..accept"
            "site": {
              "ucan/await": [
                ".out.ok.site",
                { "/": "bafy...accept" }
              ]
            }
          }
        },
        // Previously `next` was known as `fx` instead, which is
        // set of tasks to be scheduled.
        "next": [
          // 1. System attempts to allocate memory in user space for the blob.
          { // "/": "bafy...alloc",
            "cmd": "/service/blob/allocate",
            "sub": "did:web:web3.storage",
            "args": {
              // space where memory is allocated
              "space": "did:key:zAlice",
              "blob": {
                // multihash of the blob as byte array
                "digest": { "/": { "bytes": "mEi...sfKg" } },
                // size of the blob in bytes
                "size": 2_097_152,
              },
              // task that caused this invocation
              "cause": { "/": "bafy..add" }
            }
          },
          // 2. System requests user agent (or anyone really) to upload the content
          // corresponding to the blob
          // via HTTP PUT to given location.
          { // "/": "bafy...put",
            "cmd": "/http/put",
            "sub": "did:key:zMh...der", // <-- Ed299.. derived key from content multihash
            "args": {
              // pipe url from the allocation result
              "url": {
                  "ucan/await": [
                    ".out.ok.address.url",
                    { "/": "bafy...alloc" }
                  ]
              },
              // pipe headers from the allocation result 
              "headers": {
                "ucan/await": [
                  ".out.ok.address.headers",
                  { "/": "bafy...alloc" }
                ]
              },
              // body of the http request
              "body": {
                // multihash of the blob as byte array
                "digest": { "/": { "bytes": "mEi...sfKg" } },
                "size": 2_097_152
              },
            },
            "meta": {
              // archive of the principal keys
              "keys": {
                "did:key:zMh...der": { "/": "mEi...sfKg" } 
              }
            }
          },
          // 3. System will attempt to accept uploaded content that matches blob
          // multihash and size.
          { // "/": "bafy...accept",
            "cmd": "/service/blob/accept",
            "sub": "did:web:web3.storage",
            "args": {
              "space": "did:key:zAlice",
              "blob": {
                // multihash of the blob as byte array
                "content": { "/": { "bytes": "mEi...sfKg" } },
                "size": 2_097_152,
              },
              "expires": 1712903125,
              // This task is blocked on allocation
              "_put": { "ucan/await": [".out.ok", { "/": "bafy...put" }] }
            }
          }
        ]
      }
    ]
  }
}
```

### Add Blob Capability

#### Add Blob Capability Schema

```ts
type AddBlob = {
  cmd: "/space/content/add/blob"
  sub: SpaceDID
  args: {
    blob: Blob
  }
}

type Blob = {
  digest:   Multihash
  size:     int
}

type Multihash = bytes
type SpaceDID = string
```

#### Blob Digest

The `args.blob.digest` field MUST be a [multihash] digest of the blob payload bytes. Implementation SHOULD support SHA2-256 algorithm. Implementation MAY in addition support other hashing algorithms.

#### Blob Size

Blob `args.blob.size` field MUST be set to the number of bytes in the blob content.

### Add Blob Receipt

#### Add Blob Receipt Schema

```ts
// Only operation specific fields are covered the
// rest are implied
type AddBlobReceipt = {
  out: Result<AddBlobOk, AddBlobError>
  next: [
    AllocateBlob,
    PutBlob,
    AcceptBlob,
  ]
}

type AddBlobOk = {
  site: {
    "ucan/await": [".out.ok.site", Link<AcceptBlob>]
  }
}

type AddBlobError = {
  message: string
}
```

#### Add Blob Result

Invocation MUST fail if any of the following is true

1. Provided **sub**ject space is not provisioned with a provider.
1. Provided `blob.size` is outside of supported range.
1. Provided `blob.digest` is not a valid [multihash].
1. Provided `blob.digest` [multihash] hashing algorithm is not supported.

Invocation MUST succeed if non of the above is true. Success value MUST be an object with a `site` field set to [ucan/await] of the task that produces [location commitment].

Task linked from the `site` of the success value MUST be present in the receipt effects _(`next` field)_.

#### Add Blob Effects

Successful invocation MUST start a workflow consisting of following tasks, that MUST be set in receipt effects (`next` field) in the following order.

1. [Allocate Blob]
1. [Put Blob]
1. [Accept Blob]

## Allocate Blob

Authorized agent MAY invoke `/service/blob/allocate` capability on the [provider] subject to create a memory address where `blob` content can be written via HTTP `PUT` request.

### Allocate Blob Capability

#### Allocate Blob Capability Schema

```ts
type BlobAllocate = {
  cmd:  "/service/blob/allocate"
  sub:  ProviderDID
  args: {
    space:  SpaceDID
    blob:   Blob
    cause:  Link<AddBlob>
  }
}
```

#### Allocation Space

The `args.space` field MUST be set to the [DID] of the user space where allocation takes place.

#### Allocation Blob

The `args.blob` field MUST be set to the `Blob` the space is allocated for.

#### Allocation Cause

The `args.cause` field MUST be set to the [Link] for the [Add Blob] task, that caused an allocation.

### Allocate Blob Receipt

Allocations MUST fail if `space` does not have enough capacity for the `blob` and succeed otherwise.

#### Allocate Blob Receipt Schema

```ts
type BlobAllocateReceipt = {
  ran:  Link<BlobAllocate>
  out:  Result<BlobAllocateOk, BlobAllocateError>
  next: []
}

type BlobAllocateOk = {
  size: int
  address?: BlobAddress
}

type BlobAddress = {
  url:     string
  headers: {[key:string]: string}
  # Unix timestamp (in seconds precision) of when this address expires
  expires  Int
}
```

### Allocation Size

The `out.ok.size` MUST be set to the number of bytes that were allocated for the `Blob`. It MUST be equal to either:

1. The `args.blob.size` of the invocation.
2. `0` if space already has memory allocated for the `args.blob`.

### Allocation Address

The optional `out.ok.address` SHOULD be omitted when content for the allocated is already available on site. Otherwise it MUST be set to the `BlobAddress` that can receive a blob content.

The `url` of the `BlobAddress` MUST be an HTTP(S) location that can receive blob content via HTTP `PUT` request, as long as HTTP headers from `headers` dictionary are set on the request.

It is RECOMMENDED that issued `BlobAddress` only accept `PUT` payload that matches requested `blob`, both content [multihash] and size.

> ℹ️ If enforcing above recommendation is not possible implementation MUST enforce in [Accept Blob] invocation.

### Allocation Effects

Allocation MUST have no effects.

## Put Blob

Any agent MAY perform `/http/put` capability invocation on behalf of the subject. [Add blob] capability provider MUST add `/http/put` effect and capture private key of the `subject` in the `meta` field so that any agent could perform it.

An agent that invoked [add blob] capability is expected to perform this task and issue receipt on completion.

### Put Blob Capability

#### Put Blob Capability Schema

> ℹ️ In the UCAN 0.9 `meta` is unknown as `fct` field

```ts
type BlobPut = {
  cmd: "/http/put"
  sub: DID
  args: {
    url: URL
    headers: Headers
    body: Blob
  }
  meta: {
    keys: {[key: DID]: bytes}
  }
}
```

### Put Blob Subject

The subject field SHOULD be [`did:key`] corresponding to the [Ed25519] private key that is last 32 bytes of the blob [multihash].

### Put Blob Metadata

Metadata MUST contain `keys` field with an object value that contains [`did:key`] subject as key and corresponding private key bytes as a value.

### Put Blob URL

Destination `url` MUST be specified in the arguments and it MUST be an endpoint that can accept HTTP PUT request.

### Put Blob Headers

The `headers` map MUST be specified in the arguments. It MUST have string keys corresponding to header names and string values corresponding to header values.

### Put Blob Body

The `body` argument MUST be an object with `digest` and `size` fields describing the content of the request body.

### Put Blob Receipt

Receipt is signal to the service to proceed with [accept blob]. Service implementation that does not require signal from the client it MAY issue receipt when content is uploaded.

ℹ️ Client MAY use [UCAN conclusion] capability to deliver receipt to the awaiting service.

#### Put Blob Receipt Schema

```ts
type BlobPutReceipt = {
  ran: Link<BlobPut>
  out: Result<BlobPutOk, BlobPutError>
  next: []
}

type BlobPutOk = {}

type AddPutError = {
  message: string
}
```

#### Blob Put Effects

Receipt MUST not have any effects.

## Accept Blob

Authorized agent MAY invoke `/service/blob/accept` capability on the [provider] subject. Invocation MUST either succeed when content is delivered at allocated site or fail if either allocation failed or expired before content was delivered.

Invocation MUST block until content is delivered. Implementation MAY resume when content is sent to the allocated address or await until client signals that content has been delivered using [put blob receipt].

ℹ️ Implementation that is unable to reject HTTP PUT request for the payload that does not match blob [multihash] or `size` SHOULD enforce the invariant in this invocation by failing task if no valid content has been delivered.

### Accept Blob Capability

#### Accept Blob Capability Schema

```ts
type BlobAccept = {
  cmd: "/service/blob/accept"
  sub: ProviderDID
  args: {
    blob: Blob
    exp: int
  }
}
```

### Accept Blob Receipt

#### Accept Blob Receipt Schema

```ts
type BlobAcceptReceipt = {
  ran: Link<BlobAccept>
  out: Result<BlobAcceptOk, BlobAcceptError>
  next: []
}

type BlobAcceptOk = {
  site: Link<LocationCommitment>
}

type BlobAcceptError = {
  message: string
}
```

#### Blob Accept Effects

Receipt MUST not have any effects.

## Location Commitment

Location commitment represents commitment from the issuer to the audience that
content matching the `content` [multihash] can be read via HTTP [range request]

### Location Commitment Delegation Example

```js
{
  "iss": "did:web:web3.storage",
  "aud": "did:key:zAlice",

  "cmd": "/assert/location",
  "sub": "did:web:web3.storage",
  "pol": [
    // multihash must match be for the blob uploaded
    ["==", ".content", { "/": { "bytes": "mEi...sfKg" } }],
    // must be available from this url
    ["==", ".url", "https://w3s.link/ipfs/bafk...7fi"],
    // from this range
    ["==", ".range[0]", 0],
    ["==", ".range[1]", 2_097_152],
  ],
  // does not expire
  "exp": null
}
```

### Location Commitment Capability

#### Location Commitment Capability Schema

```ts
type LocationCommitment = {
  cmd: "/assert/location"
  sub: ProviderDID
  args: {
    content: Multihash
    url: string
    range: [start:int, end:int, ...int[]]
  }
}
```

## List Blob

Authorized agent MAY invoke `blob/list` capability on the [space] subject (`sub` field) to list Blobs added to it at the time of invocation.

### List Blob Invocation Example

Shown Invocation example illustrates Alice requesting a page of the list of blobs stored on their space.

```js
{
  "cmd": "/space/content/list/blob",
  "sub": "did:key:zAlice",
  "iss": "did:key:zAlice",
  "aud": "did:web:web3.storage",
  "args": {
    "blob": {
      // cursor where to start listing from
      "cursor": 'cursor-value-from-previous-invocation',
      // size of page
      "size": 40,
    }
  }
}
```

### List Blob Receipt Example

Shows an example receipt for the above `/space/content/list/blob` capability invocation.

> ℹ️ We use `// "/": "bafy..` comments to denote CID of the parent object.

```js
{ // "/": "bafy..list",
  "iss": "did:web:web3.storage",
  "aud": "did:key:zAlice",
  "cmd": "/ucan/assert/result"
  "sub": "did:web:web3.storage",
  "args": {
    // refers to the invocation from the example
    "ran": { "/": "bafy..list" },
    "out": {
      "ok": {
        // cursor where to start listing from on next call
        "cursor": "cursor-value-for-next-invocation",
        // size of the list
        "size": 40,
        "results": [
          {
            "insertedAt": "2024-04-16T15:49:22.638Z",
            "blob": {
              "size": 100,
              "content": { "/": { "bytes": "mEi...sfKg" } },
            }
          },
          // ...
        ]
      }
    },
    // set of tasks to be scheduled.
    "next": []
  }
}
```

### List Blob Capability

#### List Blob Capability Schema

```ts
type ListBlob = {
  cmd: "/space/content/list/blob"
  sub: SpaceDID
  args: {
    cursor?: string
    size?: number
    pre?: boolean
  }
}
```

##### List Cursor

The optional `args.cursor` MAY be specified in order to paginate over the list of the added Blobs.

##### List Size

The optional `args.size` MAY be specified to signal desired page size, that is number of items in the result.

##### List Pre

The optional `args.pre` field MAY be set to `true` to request a page of results preceding cursor. If `args.pre` is omitted or set to `false` provider MUST respond with a page following the specified `args.cursor`.

### List Blob Receipt

#### List Blob Receipt Schema

```ts
type ListBlobReceipt = {
  out: Result<ListBlobOk, ListBlobError>
  next: []
}

type ListBlobOk = {
  cursor?: string
  before?: string
  after?: string
  size: number
  results: ListBlobItem
}

type ListBlobItem = {
  blob: Blob
  insertedAt: ISO8601Date
}

type ISO8601Date = string

type ListBlobError = {
  message: string
}
```

##### List Blob Effects

Receipt MUST not have any effects.

## Remove Blob

Authorized agent MAY invoke `blob/remove` capability to remove content archive from the subject space (`sub` field).

### Remove Blob Invocation Example

Shown Invocation example illustrates Alice requesting to remove a blob stored on their space.

```js
{
  "cmd": "/space/content/remove/blob",
  "sub": "did:key:zAlice",
  "iss": "did:key:zAlice",
  "aud": "did:web:web3.storage",
  "args": {
    // multihash of the blob as byte array
    "content": { "/": { "bytes": "mEi...sfKg" } },
  }
}
```

### Remove Blob Receipt Example

Shows an example receipt for the above `/space/content/remove/blob` capability invocation.

> ℹ️ We use `// "/": "bafy..` comments to denote CID of the parent object.

```js
{ // "/": "bafy..remove",
  "iss": "did:web:web3.storage",
  "aud": "did:key:zAlice",
  "cmd": "/ucan/assert/result"
  "sub": "did:web:web3.storage",
  "args": {
    // refers to the invocation from the example
    "ran": { "/": "bafy..remove" },
    "out": {
      "ok": {
        // size of the blob in bytes removed from space
        "size": 2_097_152,
      }
    },
    // set of tasks to be scheduled.
    "next": []
  }
}
```

### Remove Blob Capability

#### Remove Blob Capability Schema

```ts
type RemoveBlob = {
  cmd: "/space/content/remove/blob"
  sub: SpaceDID
  args: {
    content: Multihash
  }
}

type Multihash = bytes
type SpaceDID = string
```

##### Remove Content

The `args.content` field MUST be a [multihash] digest of the blob payload bytes. Implementation SHOULD support SHA2-256 algorithm. Implementation MAY in addition support other hashing algorithms.

### Remove Blob Receipt

#### Remove Blob Receipt Schema

```ts
type RemoveBlobReceipt = {
  out: Result<RemoveBlobOk, RemoveBlobError>
  next: []
}

type RemoveBlobOk = {
  size: number
}

type RemoveBlobError = {
  message: string
}
```

##### Remove blob Size

The `out.ok.size` MUST be set to the number of bytes that were freed from the space. It MUST be equal to either:

1. The size of the Blob in bytes.
2. `0` if specified blob is not in space.

##### Remove Blob Effects

Receipt MUST not have any effects.

# Coordination

## Publishing Blob

Blob can be published by authorizing read interface (e.g. IPFS gateway) by delegating it [Location Commitment] that has been obtained from the provider.

> Note that same applies to publishing blob on [IPNI], new capability is not necessary, user simply needs to re-delegate `LocationCommitment` to the DID representing [IPNI] publisher. [IPNI] publisher in turn may publish delegation to DID with publicly known private key allowing anyone to perform the reads.

[store protocol]:./w3-store.md
[CAR]:https://ipld.io/specs/transport/car/
[multihash]:https://github.com/multiformats/multihash
[space]:#space
[IPNI]:https://github.com/ipni/specs/blob/main/IPNI.md
[location commitment]:#location-commitment
[Add Blob]:#add-blob
[Put Blob]:#put-blob
[put blob receipt]:#put-blob-receipt
[Allocate Blob]:#allocate-blob
[Accept Blob]:#accept-blob
[DID]:https://www.w3.org/TR/did-core/
[Link]:https://ipld.io/docs/schemas/features/links/
[range request]:https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests
[`did:key`]:https://w3c-ccg.github.io/did-method-key/
[Ed25519]:https://en.wikipedia.org/wiki/EdDSA#Ed25519
[UCAN Conclusion]:./w3-ucan.md#conclusion
