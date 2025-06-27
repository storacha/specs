# Replication Protocol

![draft](https://img.shields.io/badge/status-draft-yellow.svg?style=flat-square)

## Authors

- [Alan Shaw](https://github.com/alanshaw), [Storacha Network](https://storacha.network/)

## Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC2119](https://datatracker.ietf.org/doc/html/rfc2119).

## Introduction

The Replication Protocol enables distributed storage of blobs across multiple nodes in the network. This specification extends the blob protocol by defining how nodes replicate data after initial upload. The protocol establishes four roles:

- The **Client** instructs replications.
- The **Replication Service** receives replication instructions and orchestrates replications.
- **Storage Nodes** store blob data.
- A **Source Node** is a _Storage Node_ which already stores the blob, selected by the _Replication Service_.
- **Replica Nodes** are _Storage Nodes_ which do not yet store the blob, selected by the _Replication Service_ to each store an additional copy.

This allows the network to maintain multiple copies of each blob, distributed across different nodes.

Note that a _Replica Node_ in one replication operation may later be selected as the _Source Node_ for another operation, as it will then hold a copy of the blob.

Out of scope: This specification does not propose any solution for repairing lost data from any node.

## Specification

### Diagram

The interactions can be summarized by the following diagram:

```mermaid
sequenceDiagram
    participant Client
    participant ReplicationService as Replication Service
    participant ReplicaNode as Replica Node
    participant SourceNode as Source Node

    Note over Client,ReplicationService: Step 1: Instruct replication
    Client->>ReplicationService: space/blob/replicate (with location to fetch data)

    Note over ReplicationService,ReplicaNode: Step 2: Allocate replication (for each selected Replica Node)
    ReplicationService->>ReplicaNode: blob/replica/allocate (with location to fetch data)
    activate ReplicaNode
    Note over ReplicaNode,SourceNode: Step 3: Replica node "pulls" data from original
    ReplicaNode->>SourceNode: Fetch content from "location commitment"
    activate SourceNode
    ReplicaNode--)ReplicationService: blob/replica/allocate receipt (indicates capacity reserved)
    ReplicationService--)Client: space/blob/replicate receipt

    SourceNode--)ReplicaNode: Returns blob data
    deactivate SourceNode

    Note over Client,ReplicaNode: Step 4: Confirm transfer
    ReplicaNode--)ReplicationService: blob/replica/transfer receipt (indicates success/failure)
    deactivate ReplicaNode
    ReplicationService--)Client: blob/replica/transfer receipt
```

### Blob Replicate

A `space/blob/replicate` invocation instructs the _Replication Service_ to replicate a blob to enough _Replica Nodes_ to bring the total number of _Storage Nodes_ storing that blob to the given `replicas` number. A replication request can only be issued after some _Storage Node_ has successfully stored the blob, and the invocation must point to a `site` where it is known to exist. This can be found in the receipt of the original `blob/accept` receipt (for the original location), as well any `blob/replica/transfer` receipts from prior replications (for the additional replica locations).

Typically, for a given blob, `space/blob/replicate` is issued once, by the _Client_ which originally issued `space/blob/add` to store the blob, after the consequent `blob/accept` effect is complete.

The resource (`with`) of the invocation is the space containing the blob, on whose behalf the replicas will also be stored.

The caveats MUST include a `blob` parameter, identifying the blob the service should ensure is replicated.

The caveats MUST include a `replicas` parameter, an unsigned integer indicating the total number of copies the network should ensure are stored on the network. For instance, if a blob has not yet been explicitly replicated, it would exist on 1 node, and invoking `space/blob/replicate` with `"replicas": 3` would add 2 additional replicas to the network. The invocation is idempotent: asking for `"replicas": 3` again would do nothing, leaving the total number of copies at 3.

The caveats MUST include a `site` link which is a location commitment indicating where the blob is already stored. The `site` must be storing the blob on behalf of the same space. New replica locations MUST fetch the blob from this site.

It is RECOMMENDED that the _Replication Service_ receiving the instruction mandate a minimum _and_ a maximum value. The minimum and maximum MAY be the same.

```json5
{
  "iss": "did:key:zAlice",
  "aud": "did:web:replication.service.example.com",
  "att": [
    {
      "with": "did:key:zAliceSpace",
      "can": "space/blob/replicate",
      "nb": {
        /** The blob that MUST be replicated. */
        "blob": {
          "digest": { "/": { "bytes": "..." } },
          "size": 1234
        },
        /** Total number of replicas to ensure. */
        "replicas": 3,
        /** A location commitment indicating where the blob MUST be fetched from. */
        "site": { "/": "bafy..locationCommitment" }
      }
    }
  ],
  "prf": [],
  "sig": "..."
}
```

It is RECOMMENDED that the block(s) that comprise the location commitment are included in the invocation.

The receipt for `space/blob/replicate` includes effects (async tasks) for `blob/replica/transfer`. Successful completion of the `blob/replica/transfer` task indicates the replication target has transferred and stored the blob. Each replication task MUST target a _Replica Node_, and each _Replica Node_ MUST have exactly one replication task in the effects. Thus, the number of `blob/replica/transfer` tasks will equal the number of new replicas created, which will be the `space/blob/replicate` invocation's `replicas` value minus the number of existing copies.

The _Replication Service_ MUST select the _Storage Nodes_ which will serve as _Replica Nodes_ and instruct them to allocate replication space when the it receives the `space/blob/replicate` invocation. The set of _Replica Nodes_ MUST NOT include the _Source Node_. It SHOULD NOT include any _Storage Node_ which already stores the blob on behalf of the space, as the replication to that node will fail. It SHOULD NOT include any _Storage Node_ which has previously failed to replicate the blob, as the replication to that node is likely to fail.

As of this writing, behavior when the `replicas` value is _less_ than the current number of copies is undefined by this specification, but expected to be defined in the future.

The receipt MUST include effects (async tasks) and receipts for each allocation task performed.

#### Blob Replicate Capability Schema

```ts
type ReplicateBlob = {
  can: "space/blob/replicate"
  with: SpaceDID
  nb: {
    blob: Blob
    replicas: int
    site: Link<LocationCommitment>
  }
}

type Blob = {
  digest: Multihash
  size: int
}

type Multihash = bytes
type SpaceDID = string
```

##### Blob

The `nb.blob` field MUST be set to the `Blob` that is to be replicated.

##### Replicas

The `nb.replicas` field MUST be an unsigned integer indicating the total number of copies the network should ensure are stored _in addition_ to the original. It MUST be greater than 0.

##### Site

The `nb.site` field MUST be a [Link] to the [location commitment] describing where the blob can be retrieved.

#### Blob Replicate Receipt Schema

```ts
type ReplicateBlobReceipt = {
  ran:  Link<ReplicateBlob>
  out: Result<ReplicateBlobOk, ReplicateBlobError>
  fx: {
    fork: [
      Link<AllocateReplicaBlob>
      Link<TransferReplicaBlob>
    ]
  }
}

type Result<Ok, Err> = { ok: Ok } | { error: Err }

type ReplicateBlobOk = {
  site: [{
    "ucan/await": [".out.ok.site", Link<TransferReplicaBlob>]
  }]
}

type ReplicateBlobError = {
  message: string
}
```

##### Blob Replicate Result

Invocation MUST fail if any of the following is true:

1. Provided subject space does not currently store the blob.
1. Provided `blob.size` is outside of supported range.
1. Provided `blob.digest` is not a valid [multihash].
1. Provided `blob.digest` [multihash] hashing algorithm is not supported.
1. Provided `replicas` is not an unsigned integer greater than 0 or is outside of any configured minimum or maximum value set by the _Replication Service_.
1. Provided `site` is an invalid or revoked [location commitment].
1. The _Replication Service_ is unable to successfully select and allocate enough _Replica Nodes_.

The invocation MUST succeed if none of the above are true. The success value MUST be an object with a `site` field set to an array of [ucan/await] of the task that produces a [location commitment], one for each replica requested.

The tasks linked from the `site` of the success value MUST be present in the receipt effects (`fx` field).

##### Blob Replicate Effects

Successful invocation MUST start a workflow consisting of following tasks, that MUST be set in receipt effects (`fx` field) in the following order:

1. [Blob Replica Allocate](#blob-replica-allocate) (1 or more)
1. [Blob Replica Transfer](#blob-replica-transfer) (1 or more)

The number of effects received is dependent on the number of replicas requested.

### Blob Replica Allocate

The _Replication Service_ allocates replication space on _Replica Nodes_ by issuing a `blob/replica/allocate` invocation:

```json5
{
  "iss": "did:web:replication.service.example.com",
  "aud": "did:key:zStorageNode",
  "att": [
    {
      "with": "did:key:zStorageNode",
      "can": "blob/replica/allocate",
      "nb": {
        /** The blob that was must be replicated. */
        "blob": {
          "digest": { "/": { "bytes": "..." } },
          "size": 1234
        },
        /** DID of the space the blob has been allocated to. */
        "space": { "/": { "bytes": "..." } },
        /** A location commitment indicating where the blob MUST be fetched from. */
        "site": { "/": "bafy..locationCommitment" },
        /** The `space/blob/replicate` invocation that caused this allocation. */
        "cause": { "/": "bafy..replicate" }
      }
    }
  ],
  "prf": [],
  "sig": "..."
}
```

The `blob/replica/allocate` task receipt MUST include an async task that will be performed by the _Replica Node_: `blob/replica/transfer`. The `blob/replica/transfer` task is completed when the _Replica Node_ has transferred the blob from its location on the _Source Node_.

#### Blob Replica Allocate Capability Schema

```ts
type AllocateReplicaBlob = {
  can: "blob/replica/allocate"
  with: StorageNodeDID
  nb: {
    blob: Blob
    space: Bytes<SpaceDID>
    site: Link<LocationCommitment>
    cause: Link<ReplicateBlob>
  }
}
```

##### Blob

The `nb.blob` field MUST be set to the `Blob` the space is allocated for.

##### Space

The `nb.space` field MUST be set to the (byte encoded) [DID] of the user space where allocation took place.

##### Location

The `nb.site` field MUST be a [Link] to the [location commitment] describing where the blob can be retrieved.

##### Cause

The `nb.cause` field MUST be set to the [Link] for the [Replicate Blob](#blob-replicate) task, that caused an allocation.

#### Blob Replica Allocate Receipt Schema

```ts
type AllocateReplicaBlobReceipt = {
  ran:  Link<AllocateReplicaBlob>
  out:  Result<AllocateReplicaBlobOk, AllocateReplicaBlobError>
  fx: {
    fork: [Link<TransferReplicaBlob>]
  }
}

type AllocateReplicaBlobOk = {
  /** The number of bytes allocated for a Blob. */
  size: int
  site: { "ucan/await": [".out.ok.site", Link<TransferReplicaBlob>] }
}

type AllocateReplicaBlobError =
  | ReplicationCountRangeError
  | ReplicationSourceNotFound
  | InvalidReplicationSite
  | Failure

/** Number of replicas exceeds minimum or maximum. */
type ReplicationCountRangeError = {
  name: 'ReplicationCountRangeError'
  message: string
}

/** Blob is not stored in the space. */
type ReplicationSourceNotFound = {
  name: 'ReplicationSourceNotFound'
  message: string
}

/** Location commitment is invalid or revoked. */
type InvalidReplicationSite = {
  name: 'InvalidReplicationSite'
  message: string
}

type Failure = {
  message: string
}
```

##### Blob Replica Allocate Result

Invocation MUST fail if any of the following is true:

1. Provided `blob.size` is outside of supported range.
1. Provided `blob.digest` is not a valid [multihash].
1. Provided `blob.digest` [multihash] hashing algorithm is not supported.
1. Provided `site` is an invalid or revoked [location commitment].

Invocation MUST succeed if none of the above are true.

###### Size

The `out.ok.size` MUST be set to the number of bytes that were allocated for the `Blob`. It MUST be equal to either:

1. The `nb.blob.size` of the invocation.
2. `0` if the replica node already has memory allocated for the `nb.blob`.

##### Blob Replica Allocate Effects

Successful invocation MUST start a workflow consisting of a [Transfer Replica Blob](#blob-replica-transfer) task, that MUST be set in receipt effects (`fx` field).

### Blob Replica Transfer

The `blob/replica/transfer` task is completed by each _Replica Node_. Replication data is transferred from the location specified in the location commitment referenced by the `blob/replica/allocate` invocation.

A `blob/replica/transfer` task takes the following form:

```json5
{
  "iss": "did:key:zStorageNode",
  "aud": "did:key:zStorageNode",
  "att": [
    {
      "with": "did:key:zStorageNode",
      "can": "blob/replica/transfer",
      "nb": {
        /** The blob that will be transferred. */
        "blob": {
          "digest": { "/": { "bytes": "..." } },
          "size": 1234
        },
        /** DID of the space the blob has been allocated to. */
        "space": { "/": { "bytes": "..." } },
        /** The location the blob will be transferred from. */
        "site": { "/": "bafy..locationCommitment" },
        /** The `blob/replica/allocate` invocation that initiated this transfer. */
        "cause": { "/": "bafy..allocate" }
      }
    }
  ],
  "prf": [],
  "sig": "..."
}
```

When the `blob/replica/transfer` task is complete a receipt is issued. The _Replica Node_ MUST communicate the receipt back to the _Replication Service_ via a [`ucan/conclude` invocation](./w3-ucan.md#conclusion).

The receipt for `blob/replica/transfer` MUST include a new signed location commitment from the _Replica Node_ the blob has been replicated to.

The _Client_ MAY poll the _Replication Service_ for the `blob/replica/transfer` receipt in order to discover the successful completion or failure of the task.

#### Blob Replica Transfer Capability Schema

```ts
type TransferReplicaBlob = {
  can: "blob/replica/transfer"
  with: StorageNodeDID
  nb: {
    blob: Blob
    space: Bytes<SpaceDID>
    site: Link<LocationCommitment>
    cause: Link<AllocateReplicaBlob>
  }
}
```

##### Blob

The `nb.blob` field MUST be set to the `Blob` the space is allocated for.

##### Space

The `nb.space` field MUST be set to the (byte encoded) [DID] of the user space where allocation took place.

##### Site

The `nb.site` field MUST be a [Link] to the [location commitment] describing where the blob can be retrieved.

##### Cause

The `nb.cause` field MUST be set to the [Link] for the [Allocate Replica Blob](#blob-replica-allocate) task, that caused an allocation.

#### Blob Replica Transfer Receipt Schema

```ts
type TransferReplicaBlobReceipt = {
  ran: Link<TransferReplicaBlob>
  out: Result<TransferReplicaBlobOk, TransferReplicaBlobError>
}

type TransferReplicaBlobOk = {
  site: Link<LocationCommitment>
}

type TransferReplicaBlobError = {
  message: string
}
```

##### Blob Replica Transfer Result

Invocation MUST fail if any of the following is true:

1. Provided `blob.size` is outside of supported range.
1. Provided `blob.digest` is not a valid [multihash].
1. Provided `blob.digest` [multihash] hashing algorithm is not supported.
1. Provided `site` is an invalid or revoked [location commitment].

Invocation MUST succeed if none of the above are true.

The transfer MAY fail for other reasons. For example, the _Source Node_ is unreachable. When a transfer fails, it is up to the _Client_ to re-instruct replication tasks by issuing another `space/blob/replicate` invocation with a new [nonce](https://github.com/ucan-wg/spec/tree/v0.9.2#323-nonce). The receipt for which MUST include effects for existing non-failed replications and new replication tasks.

#### Blob Replica Transfer Effects

Receipt MUST not have any effects.

[DID]:https://www.w3.org/TR/did-core/
[Link]:https://ipld.io/docs/schemas/features/links/
[location commitment]:./w3-blob.md#location-commitment
[multihash]:https://github.com/multiformats/multihash
