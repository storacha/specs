# W3 Filecoin Protocol

![status:wip](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)

## Editors

- [Vasco Santos], [Protocol Labs]
- [Irakli Gozalishvili], [Protocol Labs]
- [Alan Shaw], [Protocol Labs]

## Authors

- [Vasco Santos], [Protocol Labs]

# Abstract

This spec describes a [UCAN] protocol allowing an implementer to receive an aggregate of CAR files for inclusion in a Filecoin deal.

## Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC2119](https://datatracker.ietf.org/doc/html/rfc2119).

# Terminology

## Roles

There are several roles in the authorization flow:

| Name          | Description |
| ------------- | ----------- |
| Storefront    | [Principal] identified by [`did:web`] identifier, representing a storage API like web3.storage |
| Aggregator    | [Principal] identified by `did:key` identifier, representing a storage aggregator like w3filecoin |
| Dealer        | [Principal] identified by `did:key` identifier that arranges filecoin deals with storage providers. e.g. Spade |
| Chain Tracker | [Principal] identified by `did:key` identifier that tracks the filecoin chain |

### Storefront

A _Storefront_ is a type of [principal] identified by a [`did:web`] identifier.

A Storefront facilitates data storage services to applications and users, getting the requested data stored into Filecoin deals asynchronously.

### Aggregator

An _Aggregator_ is a type of [principal] identified by a `did:key` identifier.

An Aggregator facilitates data storage into Filecoin deals by aggregating smaller data (Filecoin Pieces) into a larger piece that can effectively be stored with a Filecoin Storage Provider using [Verifiable Data Aggregation
](https://github.com/filecoin-project/FIPs/blob/master/FRCs/frc-0058.md).

### Dealer

A _Dealer_ is a type of [principal] identified by a `did:key` identifier that arranges deals for the aggregates submitted by _Storefront_.

### Chain Tracker

A _Chain Tracker_ is a type of [principal] identified by a `did:key` that tracks the filecoin chain to keep a view of successful deals.

# Protocol

## Overview

A Storefront is web2 to web3 bridge. It ingests user/application data through a conventional web2 interface and replicates it across various storage systems, including Filecoin Storage Providers. Content supplied to a Storefront can be of arbitrary size, while (Filecoin) Storage Providers demand large (>= 16GiB) content pieces.  To align supply and demand requirements, the aggregator accumulates supplied content pieces into a larger verifiable aggregate pieces per [FRC-0058](https://github.com/filecoin-project/FIPs/blob/master/FRCs/frc-0058.md) that can be stored by Storage Providers.

### Authorization

Out-of-band registered Storefronts MUST use UCAN based authorization mechanisms to interact with Aggregators, Dealers and Chain Trackers. In the future protocol for registering Storefronts might be introduced.

For example, an Aggregator can authorize invocations from `did:web:web3.storage` by validating the signature is from the DID. This way, it allows web3.storage to rotate keys and/or re-delegate access without having to coordinate with the Aggregator.

### Storefront receives a Filecoin piece

The Storefront MUST submit content for aggregation by it's piece CID that MAY be computed from content by a trusted actor. Storefront MUST provide a capability that can be used to submit a piece to be replicated by (Filecoin) Storage Providers. It may be invoked by Storefront client or delegated to a hired third party, ether way Storefront MUST acknowledge request by issuing a signed receipt. Storefront MAY decide to verify submitted piece prior to aggregation. Storefront MAY also operate trusted actor that computes and submits pieces on content upload.

Once a Storefront receives the offer for a piece, it is pending for verification. A receipt is issued to proof the transition of the added piece state from `uninitialized` into `pending` for verification.

This receipt MUST have a link to a followup task (using `.fx.join` field) that either succeeds (if the piece was handled) or fails, so that its receipt MAY be looked up using it. If offered piece is already `pending` or `done` state does not change and receipt capturing current state is issued instead.

After a storefront dequeues the piece and verifies it, a receipt is created to proof the transition of the aggregate state from `pending` into `done`. This receipt MUST have link to a followup task (using `.fx.join` field) with `piece/add`.

```mermaid
sequenceDiagram
    actor Agent as <br/><br/>did:key:a...
    actor Storefront as <br/><br/>did:web:web3.storage

    Agent->>Storefront: invoke `filecoin/add`<br>with:`did:key:aSpace`
    Note left of Storefront: Request piece to be added to filecoin deal
    activate Storefront
    Storefront-->>Agent: receipt issued as `pending`
    Storefront->>Storefront: invoke `filecoin/add`<br>with:`did:web:web3.storage`
    deactivate Storefront
    Storefront-->>Agent: receipt issued<br>fx: `piece/add`
```

### Storefront offers a piece to aggregate

Storefront SHOULD propagate submitted pieces into Filecoin Storage Providers by forwarding them to an aggregator.

The Aggregator MUST queue offered pieces for an aggregation and issue a signed receipt proving that submitted piece has been `pending`. Issued receipt MUST link to a followup task (using `.fx.join` field) that either succeeds with inclusion proof (if the piece was included into an aggregate) or fail, in order to allow state lookup by its receipt.

If piece submitted by Storefront has already been queued, receipt with the same result and effect MUST be issued.

> Pieces across Storefronts SHOULD not be deduplicated.

After an aggregator dequeues the piece and includes it into an aggregate, it MUST issue a receipt with a piece inclusion proof, transition state of the submitted piece from `pending` into `done`.

```mermaid
sequenceDiagram
    actor Storefront as <br/><br/>did:web:web3.storage
    actor Aggregator as <br/><br/>did:key:agg...

    Storefront->>Aggregator: invoke `piece/add`<br>with:`did:web:web3.storage`
    Note left of Aggregator: Request piece to be included in aggregate
    activate Aggregator
    Aggregator-->>Storefront: receipt issued as `pending`
    Aggregator->>Aggregator: invoke `piece/add`<br>with:`did:key:agg...`
    deactivate Aggregator
    Aggregator-->>Storefront: receipt issued <br>with inclusion proof
```

### Aggregator offers dealer an aggregate

When the Aggregator has enough content pieces to build a qualified aggregate (dealers MAY impose different requirements), it MUST submit a Filecoin deal for the aggregate to a Dealer using `deal/offer` invocation. Dealer MUST issue signed receipt acknowledging submission, actual deal negotiation with Filecoin Storage Providers MAY carry out of band.

Once a Dealer receives an aggregate offer it is queued for negotiations with Storage Providers. Issued receipt is a proofs transition of the (offered aggregate) state from `uninitialized` into `pending`. If Dealer receives request with an aggregate already in pipeline it MUST simply reissue receipt with a same result and effects as the original request.

Issued receipt MUST link to a followup task (using `.fx.join` field) that either succeeds (if the aggregate deal made it into Filecoin chain) or fails (e.g. if Storage Provider failed to replicate and reported an error) so that its receipt COULD be looked up by it.

After a Dealer dequeues the aggregate, it will interact with available Filecoin Storage Providers, in order to establish a previously determined (out of band) number of deals. Depending on storage providers availability, as well as the content present in the offer, the aggregate MAY be handled or not. A receipt is created to proof the transition of the aggregate state from `pending` into `done`.

> Note: Dealer MAY have several intermediate steps and states it transitions through, however those intentionally are not captured by this protocol, because storefront will take no action until success / failure condition is met.

```mermaid
sequenceDiagram
    actor Aggregator as <br/><br/>did:key:agg...
    actor Dealer as <br/><br/>did:key:brk...

    Aggregator->>Dealer: invoke `aggregate/add`<br>with:`did:key:agg...`
    Note left of Dealer: Request aggregate to be queued for deal proposal
    activate Dealer
    Dealer-->>Aggregator: receipt issued as `pending`
    Dealer->>Dealer: invoke `aggregate/add`<br>with:`did:key:brk...`
    deactivate Dealer
    Dealer-->>Aggregator: receipt issued with `done`
```

The Dealer MAY request an out of bound signature from the Storefront to validate the terms of a deal.

### Storefront can query state of the aggregate deals

Storefront users MAY want to check details about deals from the content they previously stored. These deals will change over time as they get renewed. Therefore, Storefront should invoke `chain-tracker/info` capability to gather information about given aggregate identifier. Storefront should be able to look into previously received inclusion proofs to get the aggregate to look at based on the requested piece.

```mermaid
sequenceDiagram
    actor Storefront as <br/><br/>did:web:web3.storage
    actor ChainTracker as <br/><br/>did:key:chain-tracker...

    Storefront->>ChainTracker: invoke `chain-tracker/info`
    Note left of ChainTracker: Request ChainTracker for information from given piece
```

## Capabilities

This section describes the capabilities that form the w3 aggregation protocol, along with the details relevant for invoking capabilities with a service provider.

In this document, we will be exposing capabilities implemented by Storefront `web3.storage`, Aggregator `filecoin.web3.storage` and Dealer `spade-proxy.web3.storage`.

### `filecoin/add`

An agent principal can invoke a capability to add a piece to be included in a Filecoin deal(s) with a Storage providers. See [schema](#filecoinadd-schema).

> `did:key:zAlice` invokes capability from `did:web:web3.storage`

```json
{
  "iss": "did:key:zAlice",
  "aud": "did:web:web3.storage",
  "att": [{
    "with": "did:key:zAlice",
    "can": "filecoin/add",
    "nb": {
      "content": { "/": "bag...car" }, /* CID of file previously added to resource space */
      "piece": { "/": "bafk...commp" } /* commitment proof for piece */
    }
  }],
  "prf": [],
  "sig": "..."
}
```

Storefront MUST issue a signed receipt to acknowledge the received request. Issued receipt MUST contain an [effect](https://github.com/ucan-wg/invocation/#7-effect) with a subsequent task (`.fx.join` field) that is run when submitted piece is verified and either succeeds (implying that piece was valid) or fails (with `error` describing a problem with the piece).

```json
{
  "ran": "bafy...invocation",
  "out": {
    "ok": {
      "piece": { "/": "bafk...commp" } /* commitment proof for piece */
    }
  },
  "fx": {
    "join": { "/": "bafy...dequeue" }
  },
  "meta": {},
  "iss": "did:web:web3.storage",
  "prf": []
}
```

When piece request to be added is dequeued & verified storefront MUST invoke `filecoin/add` with own DID propagating piece through the pipeline and signaling that submitted piece was handled.

> `did:web:web3.storage` invokes capability from `did:web:web3.storage`

```json
{
  "iss": "did:web:web3.storage",
  "aud": "did:web:web3.storage",
  "att": [{
    "with": "did:web:web3.storage",
    "can": "filecoin/add",
    "nb": {
      "content": { "/": "bag...car" }, /* CID of file previously added to resource space */
      "piece": { "/": "bafk...commp" } /* commitment proof for piece */
    }
  }],
  "prf": [],
  "sig": "..."
}
```

Storefront MUST issue a signed receipt to communicate the response for the request. Issued receipt MUST contain an [effect](https://github.com/ucan-wg/invocation/#7-effect) with a subsequent task (`.fx.join` field) that submits piece for an aggregation.

```json
{
  "ran": "bafy...invocation",
  "out": {
    "ok": {
      "piece": { "/": "bafk...commp" } /* commitment proof for piece */
    }
  },
  "fx": {
    "join": { "/": "bafy...piece...add" }
  },
  "meta": {},
  "iss": "did:web:web3.storage",
  "prf": []
}
```

See [`aggregate/add`](#aggregateadd) section to see the subsequent task.
If the added piece is invalid, details on failing reason is also reported:

```json
{
  "ran": "bafy...invocation",
  "out": {
    "error": {
      "name": "InvalidPieceCID",
      "message": "...."
    },
  },
  "fx": {
    "fork": []
  },
  "meta": {},
  "iss": "did:web:web3.storage",
  "prf": []
}
```

### `aggregate/add`

A storefront principal can invoke a capability to offer a piece to be aggregated for upcoming Filecoin deal(s). See [schema](#aggregateadd-schema).

> `did:web:web3.storage` invokes capability from `did:key:agg...`

```json
{
  "iss": "did:web:web3.storage",
  "aud": "did:key:agg...",
  "att": [{
    "with": "did:web:web3.storage",
    "can": "aggregate/add",
    "nb": {
      "piece": { "/": "bafk...commp" }, /* commitment proof for piece */
      "storefront": "did:web:web3.storage", /* storefront responsible for invocation */
      "group": "did:web:free.web3.storage", /* grouping of joining segments into an aggregate */
    }
  }],
  "prf": [],
  "sig": "..."
}
```

Aggregator MUST issue a signed receipt to acknowledge the received request. Issued receipt MUST contain an [effect](https://github.com/ucan-wg/invocation/#7-effect) with a subsequent task (`.fx.join` field) that is run when piece is added to an aggregate and either succeeds (implying that aggregate was queued for being offered) or fails (with `error` describing the problem).

```json
{
  "ran": "bafy...invocation",
  "out": {
    "ok": {}
  },
  "fx": {
    "join": { "/": "bafy...dequeue" }
  },
  "meta": {},
  "iss": "did:key:agg...",
  "prf": []
}
```

When piece request to be added is dequeued, aggregator should invoke `aggregate/add` to include it in an aggregate.

> `did:key:agg...` invokes capability from `did:key:agg...`

```json
{
  "iss": "did:key:agg...",
  "aud": "did:key:agg...",
  "att": [{
    "with": "did:key:agg...",
    "can": "aggregate/add",
    "nb": {
      "piece": { "/": "commitment...car" }, /* commitment proof for piece */
      "storefront": "did:web:web3.storage", /* storefront responsible for invocation */
      "group": "did:web:free.web3.storage", /* grouping of joining segments into an aggregate */
    }
  }],
  "prf": [],
  "sig": "..."
}
```

Aggregator MUST issue a signed receipt with the result of the task. Arranged aggregate for piece receipt looks like:

```json
{
  "ran": "bafy...arrange",
  "out": {
    "ok": {
        "piece": { "/": "commitment...car" }, /* commitment proof for piece */
        "aggregate": { "/": "commitment...aggregate-proof" }, /* commitment proof */
        "path": "path-between-root-aggregate-and-piece"
    }
  },
  "meta": {},
  "iss": "did:key:agg...",
  "prf": []
}
```

If offered piece is invalid, reason is also reported:

```json
{
  "ran": "bafy...invocation",
  "out": {
    "error": {
      "name": "InvaildPieceCID",
      "message": "..."
    },
  },
  "meta": {},
  "iss": "did:key:agg...",
  "prf": []
}
```

### `deal/add`

An aggregator principal can invoke a capabilty to add an aggregate that is ready to be included in Filecoin deal(s). See [schema](#dealadd-schema).

> `did:web:filecoin.web3.storage` invokes capability from `did:web:spade.storage`

```json
{
  "iss": "did:web:filecoin.web3.storage",
  "aud": "did:web:spade.storage",
  "att": [{
    "with": "did:web:filecoin.web3.storage",
    "can": "deal/add",
    "nb": {
      "pieces": { "/": "bafy...many-cars" }, /* dag-cbor CID with content pieces */
      "aggregate": { "/": "bafk...aggregate-proof" }, /* commitment proof for aggregate */
      "deal": {
        "tenantId": "did:web:web3.storage",
        "label": "deal-label"
      }
    }
  }],
  "prf": [],
  "sig": "..."
}
```

Invoking `deal/add` capability submits an aggregate to a dealer service for inclusion in one or more Filecoin deals.

The `nb.piece` field represents the proof of the `piece` to be offered for the deal. It is a CID with its piece size encoded. In addition, a Filecoin `nb.deal` contains the necessary fields for a Filecoin Deal proposal. More specifically, it MUST include `nb.deal.tenantId` that will allow dealer to select from multiple wallets associated with the tenant and MAY include an arbitrary `nb.deal.label` chosen by the client.

Finally, The `nb.offer` field represents a "Ferry" aggregate offer that is ready for a Filecoin deal. Its value is the DAG-CBOR CID that refers to a "Ferry" offer. It encodes a dag-cbor block with an array of entries representing all the pieces to include in the aggregated deal. This array MUST be sorted in the exact same order as they were used to compute the aggregate piece CID. This block MUST be included in the CAR file that transports the invocation. Its format is:

```json
/* offers block as an array of piece CIDs, encoded as DAG-JSON (for readability) */
[
  { "/": "commitment...car0" }, /* COMMP CID */
  { "/": "commitment...car1" }, /* COMMP CID */
  /* ... */
]
```

Each entry of the decoded offers block, has all the necessary information for a Storage Provider to fetch and store a CAR file. It includes an array of Filecoin `piece` info required by Storage Providers.

Dealer MUST issue a signed receipt to acknowledge the received request. Issued receipt MUST contain an [effect](https://github.com/ucan-wg/invocation/#7-effect) with a subsequent task (`.fx.join` field) that is run when submitted aggregate is processed and either succeeds (implying that aggregate was handled and deals will be arranged) or fail (with `error` describing a problem with the aggregate).

```json
{
  "ran": "bafy...invocation",
  "out": {
    "ok": {}
  },
  "fx": {
    "join": { "/": "bafy...dequeue" }
  },
  "meta": {},
  "iss": "did:web:spade.storage",
  "prf": []
}
```

When aggregate request to be added is dequeued, dealer should invoke `deal/add` to store it.

> `did:web:spade.storage` invokes capability from `did:web:spade.storage`

```json
{
  "iss": "did:web:spade.storage",
  "aud": "did:web:spade.storage",
  "att": [{
    "with": "did:web:spade.storage",
    "can": "deal/add",
    "nb": {
      "offer": { "/": "bafy...many-cars" }, /* dag-cbor CID with offer content */
      "piece": { "/": "commitment...aggregate-proof" }, /* commitment proof for aggregate */
      "deal": {
        "tenantId": "web3.storage",
        "label": "deal-label"
      }
    }
  }],
  "prf": [],
  "sig": "..."
}
```

Dealer MUST issue a signed receipt with the result of the task. Arranged aggregate receipt looks like:

```json
{
  "ran": "bafy...invocation",
  "out": {
    "ok": {
      "piece": { "/": "commitment...aggregate-proof" } /* commitment proof */
    }
  },
  "meta": {},
  "iss": "did:web:spade.storage",
  "prf": []
}
```

If offered aggregate is invalid, details on failing pieces are also reported:

```json
{
  "ran": "bafy...invocation",
  "out": {
    "error": {
       "name": "InvalidPiece",
       "message": "....",
       "aggregate": { "/": "bafk...aggregate-proof" }, /* commitment proof */
       "cause": [{
          "name": "InvalidPieceCID",
          "message": "....",
          "piece": { "/": "bafk...car0" },
       }],
    },
  },
  "meta": {},
  "iss": "did:web:spade.storage",
  "prf": []
}
```

### `chain-tracker/info`

A Storefront principal can query state of an aggregate by invoking `chain-tracker/info` capability.

> `did:web:web3.storage` invokes capability from `did:key:chain-tracker...`

```json
{
  "iss": "did:web:web3.storage",
  "aud": "did:web:chain-tracker...",
  "att": [{
    "with": "did:web:web3.storage",
    "can": "chain/info",
    "nb": {
      "piece": { "/": "commitment...aggregate-proof" } /* commitment proof */
    }
  }],
  "prf": [],
  "sig": "..."
}
```

Once this invocation is executed, a receipt is generated with the resulting aggregate information:

```json
{
  "ran": "bafy...get",
  "out": {
    "ok": {
      "deals": {
        "111": {
          "storageProvider": "f07...",
          "status": "Active",
          "pieceCid": "bag...",
          "dataCid": "bafy...",
          "dataModelSelector": "Links/...",
          "activation": "2023-04-13T01:58:00+00:00",
          "expiration": "2024-09-05T01:58:00+00:00",
          "created": "2023-04-11T17:57:30.522198+00:00",
          "updated": "2024-04-12T03:42:26.928993+00:00"
        }
      }
    },
  },
  "fx": {
    "fork": []
  },
  "meta": {},
  "iss": "did:web:spade.storage",
  "prf": []
}
```

## Schema

### Base types

```ipldsch
type FilecoinCapability enum {
  FilecoinAdd "filecoin/add"
} representation inline {
  discriminantKey "can"
}

type AggregateCapability enum {
  AggregateAdd "aggregate/add"
} representation inline {
  discriminantKey "can"
}

type DealCapability enum {
  DealAdd "deal/add"
} representation inline {
  discriminantKey "can"
}

type ChainTrackerCapability enum {
  ChainTrackerInfo "chain-tracker/info"
} representation inline {
  discriminantKey "can"
}

type PieceRef struct {
  piece PieceCid
}

type AgentDID string
type StorefrontDID string
type AggregatorDID string
type DealerDID string
type ChainTrackerDID string

# from a fr32-sha2-256-trunc254-padded-binary-tree multihash
type PieceCid Link
type ContentCid Link
```

### `filecoin/add` schema

```ipldsch
type FilecoinAdd struct {
  with AgentDID
  nb FilecoinAddDetail
}

type FilecoinAddDetail struct {
  # CID of file previously added to resource space
  content ContentCid
  # Piece as Filecoin Piece with padding
  piece PieceCid
}
```

### `aggregate/add` schema

```ipldsch
type AggregateAdd struct {
  with AgentDID
  nb AggregateAddDetail
}

type AggregateAddDetail struct {
  # Piece as Filecoin Piece with padding
  piece PieceCid
  # storefront responsible for invocation
  storefront string
  # grouping for joining segments into an aggregate (subset of space)
  group string
}
```

### `deal/add` schema

```ipldsch
type DealAdd struct {
  with StorefrontDID
  nb DealAddDetail
}

type DealAddDetail struct {
  # Contains each individual piece within Aggregate piece
  pieces &AggregatePieces
  # Piece as Aggregate of CARs with padding
  aggregate PieceCid
  # Fields to create a contract with a Storage Provider for aggregate
  deal DealProposal
}

# @see https://github.com/filecoin-project/go-state-types/blob/ff2ed169ff566458f2acd8b135d62e8ca27e7d0c/builtin/v9/market/deal.go#L201-L221
# A subset of the deal proposal items required by broker to facilitate the contract to be created
type DealProposal struct {
  # identifier of the tenant that added pieces for the aggregate
  tenantId string
  # Label is an arbitrary client chosen label to apply to the deal
  label string
}

type AggregatePieces [PieceCid]
```

[`did:web`]: https://w3c-ccg.github.io/did-method-web/
[UCAN]: https://github.com/ucan-wg/spec/
[principal]: https://github.com/ucan-wg/spec/#321-principals

[Protocol Labs]:https://protocol.ai/
[Vasco Santos]:https://github.com/vasco-santos
[Irakli Gozalishvili]:https://github.com/Gozala
[Alan Shaw]:https://github.com/alanshaw
