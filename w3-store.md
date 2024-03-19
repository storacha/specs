# W3 Storage Protocol

![reliable](https://img.shields.io/badge/status-reliable-green.svg?style=flat-square)

## Editors

- [Yusef Napora](https://github.com/yusefnapora), [DAG House](https://dag.house)
- [Irakli Gozalishvili](https://github.com/gozala)

## Authors

- [Irakli Gozalishvili](https://github.com/gozala)
- [Yusef Napora](https://github.com/yusefnapora), [DAG House](https://dag.house)

## Abstract

In the W3 protocol user owned (name)space represents a data storage primitive that can be managed using W3 storage protocol defined here. Storage protocol allows space owners to manage state across compatible storage provider services using defined set of [UCAN] capabilities. Use of [UCAN] authorization system enables space access to be shared by delegating corresponding capabilities to desired audience.

## Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC2119](https://datatracker.ietf.org/doc/html/rfc2119).

# Introduction

The base storage layer of the space is [Content Address]ed [Content Archive][CAR] files. In practice this means that user wishing to store files or directories of files needs produce an [IPLD] [DAG] in [UnixFS] format and then encoded into one or multiple [Content Archive]s that can be stored using W3 storage protocol.

> Large DAGs get "sharded" across multiple [Content Archive]s and stored individually to meet potential size limits of the storage provider.

Separately `upload/` protocol can be utilized allowing user to create standalone entities (files, directories) representing entry points to the DAGs contained by the [Content Archive]s. E.g. when storing a file or a directory [UnixFS] root [CID] and archives are captured using `upload/add` capability allowing viewer to effectively fetch and re-assemble it.

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

A namespace, often referred as a "space", is an owned resource that can be shared. It corresponds to a unique asymmetric cryptographic keypair and is identified by a [`did:key`] URI. The `store/` and `upload/` capabilities can be used to manage content stored in the given space at given storage provider.

## Content Archive

[Content Archive][CAR] often referred as [CAR] is a primary primitive for storing shards of the content in the space.

# Capabilities

## Store Capabilities

Capabilities under `store/*` namespace can be used to manage [CAR]s that provider is storing and serving on behalf of the [space].

### Store Capabilities IPLD Schema

```ipldsch
type StoreCapability union {
  StoreAddCapability      "store/add"
  StoreGetCapability      "store/get"
  StoreListCapability     "store/list"
  StoreRemoveCapability   "store/remove"
} representation inline {
  discriminantKey "can"
}
```

### Storage Provider

The audience of the invocation (`aud` field) MUST be the [provider] DID of the storage provider implementing this protocol.

### Storage Space

The subject of the invocation (`with` field) MUST be the DID of the target MUST be target [space].

### Content Archive Identifier

The `nb.link` field of the invocation MUST be an [IPLD Link] to the desired [CAR]. Link MUST have Content Addressable Archive (CAR)  `0x0202` codec code. It is RECOMMENDED to support SHA2-256 multihash code `0x12`. Implementers are MAY choose to support other additional hashing algorithms.

### Store Add

Authorized agent MAY invoke `store/add` capability on the [space] subject (`with` field) to request that provider (`aud` field) store and serve [CAR] on their behalf.

Invoking `store/add` capability for a [CAR] that is already added to space SHOULD be a noop.

#### Store Add Capability

##### Store Add IPLD Schema

```ipldsch
type StoreAddCapability struct {
  with      SpaceDID
  nb        StoreAdd
}

type StoreAdd struct {
  link            &ContentArchive
  size            Int
  origin optional &ContentArchive
}

type ContentArchive = bytes
type SpaceDID = DID
type DID = string
```

##### Store Add Content

Capability invocation MUST specify [Content archive Identifier].

##### Store Add Content Size

Capability invocation MUST set `nb.size` field to the byte size of the [content archive][CAR].

##### Store Add Origin

> Status: Deprecated 🛑
>
> Field was intended for establish causal order, but proved impractical.

Capability invocation MAY set _optional_ `nb.origin` field to a causally related [CAR] like a previous shard of the content DAG.

##### Store Add Example

```js
{
  "v": "0.9.1",
  "iss": "did:key:z6Mkk...xALi",
  "aud": "did:web:web3.storage",
  "att": [
    {
      can: "store/add",
      with: "did:key:zAl..1ce",
      nb: {
        link: { "/": "bag...7ldq" },
        size: 42_600_000
      }
    }
  ],
  "prf": [{ "/": "bafy...prf1" }],
  "exp": 1685602800,
  "s": {
    "/": {
      "bytes": "7aEDQJbJqmyMxTxcK05XQKWfvxG+Tv+LWCJeE18RSMnciCZ/RQ21U75LA0uFSvIjdqnF5RaauZTE8mh2ZYMBBejdJQ4"
    }
  }
}
```

#### Store Add Receipt

Provider MUST issue signed receipt containing `StoreAddResult`.

##### Store Add Result

###### Store Add Result IPLD Schema

```ipldsch
type StoreAddResult union {
  StoreAddSuccess   "ok"
  StoreAddFailure   "error"
} representation keyed

type StoreAddSuccess union {
  StoreAddDone      "done"
  StoreAddPending   "upload"
} representation inline {
  discriminantKey "status"
}

type StoreAddDone struct {
  with    SpaceDID
  link    &ContentArchive
}

type StoreAddPending struct {
  with      SpaceDID
  link      &ContentArchive
  url       URL
  headers   HTTPHeaders
}

type URL = string
type HTTPHeaders {String: String}

type StoreAddFailure struct {
  message   String
}
```

###### Store Add Done

Capability provider MUST succeed request with a `"done"` status if provider is able to store requested [CAR] on user behalf right-away. In other words provider already has addressed [CAR] file.

###### Store Add Upload

Capability provider MUST succeed request with a `"upload"` status if it is able to allocate memory for the requested [CAR]. It MUST set `url` field to an HTTP PUT endpoint where addressed [CAR] can be uploaded.

Provider MUST set `headers` field to the set of HTTP headers that uploading agent MUST set on an HTTP PUT request.

HTTP PUT endpoint set in `url` field MUST verify that uploaded bytes do correspond to the addressed [CAR] and specified `size`.

###### Store Add Failure

Capability provider SHOULD fail invocation if the subject [space] has not been provisioned with the provider.

Capability provider SHOULD fail invocation if the subject [space] has not been provisioned with enough storage capacity to store requested archive.

### Store Get

Authorized agent MAY invoke `store/get` capability on the [space] subject (`with` field) to query a state of the of the specified [CAR] (`nb.link` field) of the replica held by the provider (`aud` field).

#### Store Get Capability

##### Store Get IPLD Schema

```ipldsch
type StoreGetCapability struct {
  with      SpaceDID
  nb        StoreGet
}

type StoreGet struct {
  link            &ContentArchive
}
```

##### Store Get Content

Capability invocation MUST specify [Content archive Identifier].

##### Store Get Example

```js
{
  "v": "0.9.1",
  "iss": "did:key:z6Mkk...xALi",
  "aud": "did:web:web3.storage",
  "att": [
    {
      can: "store/get",
      with: "did:key:zAl..1ce",
      nb: {
        link: { "/": "bag...7ldq" },
      }
    }
  ],
  "prf": [{ "/": "bafy...prf1" }],
  "exp": 1685602800,
  "s": {
    "/": {
      "bytes": "7aEDQJbJqmyMxTxcK05XQKWfvxG+Tv+LWCJeE18RSMnciCZ/RQ21U75LA0uFSvIjdqnF5RaauZTE8mh2ZYMBBejdJQ4"
    }
  }
}
```

#### Store Get Receipt

Capability provider MUST issue signed receipt containing `StoreGetResult`.

##### Store Get Result

###### Store Get Result IPLD Schema

```ipldsch
type StoreGetResult struct {
  StoreGetSuccess   "ok"
  StoreGetFailure   "error"
} representation keyed
```

###### Store Get Success

Capability provider MUST issue `StoreGetSuccess` result for every content archive that has been added to the space.

```ipldsch
type StoreGetSuccess {
  link            &ContentArchive
  size            Int
  # deprecated
  origin optional &ContentArchive
}
```

###### Store Get Failure

Capability provider MUST issue `StoreGetFailure` result for every content archive that either has not been added or was since removed at the time of the invocation.

```ipldsch
type StoreGetFailure {
  message   string
}
```

### Store Remove

Authorized agent MAY invoke `store/remove` capability to remove content archive from the subject space (`with` field).

#### Store Remove Capability

##### Store Remove IPLD Schema

```ipldsch
type StoreRemoveCapability struct {
  with      SpaceDID
  nb        StoreRemove
}

type StoreRemove struct {
  link            &ContentArchive
}
```

##### Store Remove Content

Capability invocation MUST specify desired [Content archive Identifier].

##### Store Remove Example

```js
{
  "v": "0.9.1",
  "iss": "did:key:z6Mkk...xALi",
  "aud": "did:web:web3.storage",
  "att": [
    {
      can: "store/remove",
      with: "did:key:zAl..1ce",
      nb: {
        link: "bag...7ldq",
      }
    }
  ],
  "prf": [{ "/": "bafy...prf1" }],
  "exp": 1685602800,
  "s": {
    "/": {
      "bytes": "7aEDQJbJqmyMxTxcK05XQKWfvxG+Tv+LWCJeE18RSMnciCZ/RQ21U75LA0uFSvIjdqnF5RaauZTE8mh2ZYMBBejdJQ4"
    }
  }
}
```


#### Store Remove Receipt

Capability provider MUST issue signed receipt containing `StoreRemoveResult`.

##### Store Remove Result

###### Store Remove Result IPLD Schema

```ipldsch
type StoreRemoveResult struct {
  StoreRemoveSuccess   "ok"
  StoreRemoveFailure   "error"
} representation keyed
```

###### Store Remove Success

Capability provider MUST issue `StoreRemoveSuccess` after it unlinked the archive from the space.

Capability provider MUST set `size` field to the number of bytes that were freed from space.

Capability provider MUST issue `StoreRemoveSuccess` even when specified archive is not in space. In that case it MUST set `size` to `0`.

```ipldsch
type StoreRemoveSuccess {
  size            Int
}
```

### Store List

Authorized agent MAY invoke `store/list` capability on the [space] subject (`with` field) to list [CAR]s added to it at the time of invocation.

#### Store List Capability

##### Store List IPLD Schema

```ipldsch
type StoreListCapability struct {
  with      SpaceDID
  nb        StoreList
}

type StoreList struct {
  cursor  optional &string
  size    optional int
  pre     optional bool
}
```

##### Store List Cursor

The optional `nb.cursor` MAY be specified in order to paginate over the list of the added [CAR]s.

##### Store List Size

The optional `nb.size` MAY be specified to signal desired page size, that is number of items in the result.

##### Store List Pre

The optional `nb.pre` field MAY be set to `true` to request a page of results preceding cursor. If `nb.pre` is omitted or set to `false` provider MUST respond with a page following the specified `nb.cursor`.

##### Store List Example

```js
{
  "v": "0.9.1",
  "iss": "did:key:z6Mkk...xALi",
  "aud": "did:web:web3.storage",
  "att": [
    {
      can: "store/list",
      with: "did:key:zAl..1ce",
      nb: {
        size: 40,
        cursor: 'cursor-value-from-previous-invocation',
      }
    }
  ],
  "prf": [{ "/": "bafy...prf1" }],
  "exp": 1685602800,
  "s": {
    "/": {
      "bytes": "7aEDQJbJqmyMxTxcK05XQKWfvxG+Tv+LWCJeE18RSMnciCZ/RQ21U75LA0uFSvIjdqnF5RaauZTE8mh2ZYMBBejdJQ4"
    }
  }
}
```

#### Store List Receipt

Capability provider MUST issue signed receipt containing `StoreListResult`.

##### Store List Result

###### Store List Result IPLD Schema

```ipldsch
type StoreListResult union {
  StoreListSuccess   "ok"
  StoreListFailure   "error"
} representation keyed
```

###### Store List Success

Capability provider MUST issue `StoreListSuccess` result containing page of entries added to the space.

```ipldsch
type StoreListSuccess  struct {
  cursor    optional  string
  before    optional  string
  after     optional  string
  size                int
  results             [StoreListItem]
}

type StoreListItem struct {
  link                  &ContentArchive
  size                  int
  origin    optional    &ContentArchive
}
```

###### Store List Failure

```ipldsch
type StoreListFailure struct {
  message       string
}
```

## Upload Capabilities

Capabilities under `upload/*` namespace can be used to manage list of top level content entries. While not required, it is generally assumed that user content like file will be turned into [UnixFS] DAG packed and stored in space as one or more [content archive][CAR]s. The root of the DAG is then added to the upload list.

### Upload Capabilities IPLD Schema

```ipldsch
type UploadCapability union {
  UploadAddCapability      "upload/add"
  UploadGetCapability      "upload/get"
  UploadListCapability     "upload/list"
  UploadRemoveCapability   "upload/remove"
} representation inline {
  discriminantKey "can"
}
```

### Upload Add

Authorized agent MAY invoke `upload/add` capability on the [space] subject (`with` field) to request that provider (`aud` field) include content identified by `nb.root` in the list of content entries for the space.

It is expected that CARs containing content are stored in the space using [`store/add`] capability. Provider MAY enforce this invariant by failing invocation or choose to succeed invocation but fail to serve the content when requested.

> ⚠️ Behavior of calling `upload/add` with a same `root` and different `shards` is not specified by the protocol. w3up reference implementation allows such invocations and updates `shards` to union of all shards across invocations.

#### Upload Add Capability

##### Upload Add IPLD Schema

```ipldsch
type UploadAddCapability struct {
  with        SpaceDID
  nb          Upload
}

type Upload struct {
  root      &any
  shards    [&ContentArchive]
}
```

###### Upload Root

The `nb.root` field MUST be set to the [IPLD Link] of the desired content entry.

###### Upload Shards

The `nb.shards` field MUST be set to the list of [IPLD Link]s for the [Content Archive][CAR]s containing the upload entry.

###### Upload Add Example

```js
{
  "v": "0.9.1",
  "iss": "did:key:z6Mkk...xALi",
  "aud": "did:web:web3.storage",
  "att": [
    {
      can: "upload/add",
      with: "did:key:zAl..1ce",
      nb: {
        root: { "/": "bafy...k3ve" },
        shards: [{ "/": "bag...7ldq" }]
      }
    }
  ],
  "prf": [{ "/": "bafy...prf1" }],
  "exp": 1685602800,
  "s": {
    "/": {
      "bytes": "7aEDQJbJqmyMxTxcK05XQKWfvxG+Tv+LWCJeE18RSMnciCZ/RQ21U75LA0uFSvIjdqnF5RaauZTE8mh2ZYMBBejdJQ4"
    }
  }
}
```

#### Upload Add Receipt

Capability provider MUST issue signed receipt containing `UploadAddResult`.

##### Upload Add Result

###### Upload Add Result IPLD Schema

```ipldsch
type UploadAddResult union {
  UploadAddSuccess    "ok"
  UploadAddFailure    "error"
} representation keyed

type UploadAddSuccess struct {
  root      &any
  shards    [&ContentArchive]
}

type UploadAddFailure struct {
  message   string
}
```

### Upload Get

Authorized agent MAY invoke `upload/get` capability on the [space] subject (`with` field) to query a state of the of the specified upload entry.

#### Upload Get Capability

##### Upload Get IPLD Schema

```ipldsch
type UploadGetCapability struct {
  with      SpaceDID
  nb        UploadGet
}

type UploadGet struct {
  root            &any
}
```

##### Upload Get Root

The `nb.root` field MUST be set to the [IPLD Link] of the desired content entry.

##### Upload Get Example

```js
{
  "v": "0.9.1",
  "iss": "did:key:z6Mkk...xALi",
  "aud": "did:web:web3.storage",
  "att": [
    {
      can: "upload/get",
      with: "did:key:zAl..1ce",
      nb: {
        root: { "/": "bafy...ro0t" },
      }
    }
  ],
  "prf": [{ "/": "bafy...prf1" }],
  "exp": 1685602800,
  "s": {
    "/": {
      "bytes": "7aEDQJbJqmyMxTxcK05XQKWfvxG+Tv+LWCJeE18RSMnciCZ/RQ21U75LA0uFSvIjdqnF5RaauZTE8mh2ZYMBBejdJQ4"
    }
  }
}
```

#### Upload Get Receipt

Capability provider MUST issue signed receipt containing `UploadGetResult`.

##### Upload Get Result

###### Upload Get Result IPLD Schema

```ipldsch
type UploadGetResult struct {
  UploadGetSuccess   "ok"
  UploadGetFailure   "error"
} representation keyed
```

###### Upload Get Success

Capability provider MUST issue `UploadGetSuccess` result for the upload entry that has been added to the space.

```ipldsch
type UploadGetSuccess {
  link            &any
  shards          [&ContentArchive]
}
```

###### Upload Get Failure

Capability provider MUST issue `UploadGetFailure` result if content entry has not been added or was since removed from space at the time of the invocation.

```ipldsch
type UploadGetFailure {
  message   string
}
```

### Upload Remove

Authorized agent MAY invoke `upload/remove` capability to remove upload entry from the list in the specified space (`with` field).

> ⚠️ Please note that removing upload entry MUST NOT remove [content archive][CAR]s containing contain.

#### Upload Remove Capability

##### Upload Remove IPLD Schema

```ipldsch
type UploadRemoveCapability struct {
  with      SpaceDID
  nb        UploadRemove
}

type UploadRemove struct {
  root      &any
}
```

##### Upload Remove Root

The `nb.root` field MUST be set to the [IPLD Link] of the desired content entry.

##### Upload Remove Example

```js
{
  "v": "0.9.1",
  "iss": "did:key:z6Mkk...xALi",
  "aud": "did:web:web3.storage",
  "att": [
    {
      can: "upload/remove",
      with: "did:key:zAl..1ce",
      nb: {
        root: { "/": "bafy...ro0t" },
      }
    }
  ],
  "prf": [{ "/": "bafy...prf1" }],
  "exp": 1685602800,
  "s": {
    "/": {
      "bytes": "7aEDQJbJqmyMxTxcK05XQKWfvxG+Tv+LWCJeE18RSMnciCZ/RQ21U75LA0uFSvIjdqnF5RaauZTE8mh2ZYMBBejdJQ4"
    }
  }
}
```

#### Upload Remove Receipt

Capability provider MUST issue signed receipt containing `UploadRemoveResult`.

##### Upload Remove Result

###### Upload Remove Result IPLD Schema

```ipldsch
type UploadRemoveResult struct {
  UploadRemoveSuccess   "ok"
  UploadRemoveFailure   "error"
} representation keyed

type UploadRemoveSuccess {
  link            &any
  shards          [&ContentArchive]
}

type UploadGetFailure {
  message   string
}
```

### Upload List

Authorized agent MAY invoke `upload/list` capability on the [space] subject (`with` field) to list upload entries at the time of the invocation.

#### Upload List Capability

##### Upload List IPLD Schema

```ipldsch
type UploadListCapability struct {
  with      SpaceDID
  nb        UploadList
}

type UploadList struct {
  cursor  optional &string
  size    optional int
  pre     optional bool
}
```

##### Upload List Cursor

The optional `nb.cursor` MAY be specified in order to paginate over the list of upload entries.

##### Upload List Size

The optional `nb.size` MAY be specified to signal desired page size, that is number of items in the result.

##### Upload List Pre

The optional `nb.pre` field MAY be set to `true` to request a page of results preceding cursor. If `nb.pre` is omitted or set to `false` provider MUST respond with a page following the specified `nb.cursor`.

##### Upload List Example

```js
{
  "v": "0.9.1",
  "iss": "did:key:z6Mkk...xALi",
  "aud": "did:web:web3.storage",
  "att": [
    {
      can: "upload/list",
      with: "did:key:zAl..1ce",
      nb: {
        size: 40,
        cursor: 'cursor-value-from-previous-invocation',
      }
    }
  ],
  "prf": [{ "/": "bafy...prf1" }],
  "exp": 1685602800,
  "s": {
    "/": {
      "bytes": "7aEDQJbJqmyMxTxcK05XQKWfvxG+Tv+LWCJeE18RSMnciCZ/RQ21U75LA0uFSvIjdqnF5RaauZTE8mh2ZYMBBejdJQ4"
    }
  }
}
```

#### Upload List Receipt

Capability provider MUST issue signed receipt containing `UploadListResult`.

##### Upload List Result

###### Upload List Result IPLD Schema

```ipldsch
type UploadListResult union {
  UploadListSuccess   "ok"
  UploadListFailure   "error"
} representation keyed
```

###### Upload List Success

Capability provider MUST issue `UploadListSuccess` result containing page of upload entries for to the space.

```ipldsch
type UploadListSuccess  struct {
  cursor    optional  string
  before    optional  string
  after     optional  string
  size                int
  results             [UploadListItem]
}

type UploadListItem struct {
  root                  &any
  shards    optional    [&ContentArchive]
}
```

###### Upload List Failure

```ipldsch
type UploadListFailure struct {
  message       string
}
```

[CAR]:https://ipld.io/specs/transport/car/
[Content Address]:https://web3.storage/docs/concepts/content-addressing/
[UnixFS]:https://docs.ipfs.tech/concepts/file-systems/#unix-file-system-unixfs
[IPLD]:https://ipld.io/docs/
[DAG]:https://en.wikipedia.org/wiki/Directed_acyclic_graph
[space]:#space
[IPLD Link]:https://ipld.io/docs/schemas/features/links/
[UCAN]:https://github.com/ucan-wg/spec/blob/692e8aab59b763a783fe1484131c3f40d997b69a/README.md
[principal]:https://github.com/ucan-wg/spec/blob/692e8aab59b763a783fe1484131c3f40d997b69a/README.md#321-principals
[Content Archive Identifier]:#content-archive-identifier
[`store/add`]:#store-add
[provider]:./w3-provider.md#provider
