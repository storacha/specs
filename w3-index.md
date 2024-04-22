# W3 Index

![wip](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)

# Introduction

## Abstract

W3 Indexing protocol allows authorized agents to submit verifiable claims about content-addressable data to be publish on [InterPlanetary Network Indexer (IPNI)][IPNI], making it publicly queryable.

## Concepts

### Space

A namespace, often referred as a "space", is an owned resource that can be shared. It corresponds to a unique asymmetric cryptographic keypair and is identified by a [`did:key`] URI.

# Capabilities

## Index Add

Authorized agent MAY invoke `/space/index/add` capability on the [space] subject to submit [content index] for publishing on [InterPlanetary Network Indexer (IPNI)][IPNI].

### Index Add Invocation Example

Invocation example illustrates Alice requesting to add index under "bafy..blob" to be published on the network.

```js
{
  "cmd": "/space/index/add",
  "sub": "did:key:zAlice",
  "iss": "did:key:zAlice",
  "aud": "did:web:web3.storage",
  "args": {
    "index": { "/": "bafy...blob" }
  }
}
```

### Index Add Capability

#### Index Add Capability Schema

```ts
type AddIndex = {
  cmd: "/space/index/add"
  sub: SpaceDID
  args: {
    // Link is the Content Archive (CAR) containing
    // the `Index`.
    index: Link<ContentArchive<Index>>
  }
}

// Type describes a CAR format
type ContentArchive<T> = ByteView<{
  roots: [Block<T>]
  blocks: Block[]
}>
```

### Index

#### Index Schema

Index schema is variant type keyed by the format descriptor label designed to allow format evolution through versioning and additional schema variants.

```ts
type Index = Variant<{
  "index/sharded/dag@0.1": ShardedDAGIndex
}>
```

#### Sharded DAG Index

Sharded DAG index MUST describe complete set of blocks that make up the `content` DAG in terms of `BlobSlice`s.

##### Sharded DAG Index Schema

```ts

type ShardedDAGIndex = {
  // content root CID
  content: Link<any>
  // links to blob indexes that contain blocks of the content DAG
  shards: Link<BlobIndex>[]
}

type BlobIndex = [
  // hash digest of the blob
  digest: Multihash
  // Index of blob slices
  slices: BlobSlice
]

type BlobSlice = [
  // hash digest of the slice
  digest: Multihash
  // Slice offset
  offset: Int
  // Slice size in bytes
  length: Int
]

type Multihash = bytes
```

ℹ️ Please note that `shards` is a list of `BlobIndex` links. This provide a flexibility of bundling blob indexes or externalizing them by linking to them.

It is RECOMMENDED to bundle all the `BlobIndex`s inside the Content Archive of the `Index`.

##### Sharded DAG Index Example

> For the reader convenience we use `link` function to denote external blocks that should be linked

```js
{
  "index/sharded/dag@0.1": {
    "content": { "/": "bafy..dag" },
    "shards": [
      link([
        // blob multihash
        { "/": { "bytes": "blb...left" } },
        // sliced within the blob
        [
          [{ "/": { "bytes": "block..1"} }, 0, 128],
          [{ "/": { "bytes": "block..2"} }, 129, 256],
          [{ "/": { "bytes": "block..3"} }, 257, 384],
          [{ "/": { "bytes": "block..4"} }, 385, 512]
        ]
      ]),
      link([
        // blob multihash
        { "/": { "bytes": "blb...right" } },
        // sliced within the blob
        [
          [{ "/": { "bytes": "block..5"} }, 0, 128],
          [{ "/": { "bytes": "block..6"} }, 129, 256],
          [{ "/": { "bytes": "block..7"} }, 257, 384],
          [{ "/": { "bytes": "block..8"} }, 385, 512]
        ]
      ])
    ]
  }
}
```

[IPNI]:https://github.com/ipni/specs/blob/main/IPNI.md
[`did:key`]:https://w3c-ccg.github.io/did-method-key/
