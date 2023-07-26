# CAR Aggregation Protocol

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

| Name        | Description |
| ----------- | ----------- |
| Storefront | [Principal] identified by [`did:web`] identifier, representing a storage API like web3.storage |
| Aggregator | [Principal] identified by [`did:web`] identifier, representing a storage aggregator like w3filecoin |
| Broker     | [Principal] that arranges filecoin deals with storage providers like spade |

### Storefront

A _Storefront_ is a type of [principal] identified by a [`did:web`] identifier.

A Storefront facilitates data storage services to applications and users, getting the requested data stored into Filecoin deals asynchronously.

### Aggregator

An _Aggregator_ is a type of [principal] identified by a [`did:web`] identifier.

An Aggregator facilitates data storage into Filecoin deals by aggregating smaller data (Filecoin Pieces) into a larger piece that can effectively be stored with a Filecoin Storage Provider.

### Broker

A _Broker_ is a type of [principal] that arranges deals for the aggregates submitted by _Storefront_.

# Protocol

## Overview

A Storefront is the entry point for user/application data into web3. It will act on behalf of users and move data around into different storage points. One of the key storage presences may be Filecoin Storage Providers. Storefront is able to ingest files of arbitrary sizes, while Storage Providers are looking for storing larger pieces, rather than small pieces. Accordingly, the aggregator is responsible for aggregating multiple smaller pieces into a bigger one that can be stored by Storage Providers.

### Authorization

Broker MUST have an authorization mechanism for allowed Storefront principals (e.g. web3.storage). Either by out of band exchange of information or through a well defined API. For example, a broker can authorize invocations from `did:web:filecoin.web3.storage` by validating the signature is from the DID. This way, it allows web3.storage to rotate keys and/or re-delegate access without having to coordinate with the broker.

### Storefront receives and verifies a piece

When a Storefront's user (agent) intends to store a given content into a Filecoin Storage Provider, its proof SHOULD be computed (commonly known as Filecoin Piece) by the client and added to the Storefront. The aggregator MAY decide to verify the piece before submitting it to be aggregated, depending on a out of band trust model.

```mermaid
sequenceDiagram
    participant Agent as 🌐<br/><br/>did:key:abc...
    participant Storefront as 🌐<br/><br/>did:web:web3.storage

    Agent->>Storefront: invoke `piece/add`
    Note left of Storefront: Request piece to be added
    Storefront-->>Agent: receipt issued
    Note left of Storefront: `piece/verify` might be invoked
```

### Storefront offers a piece to aggregate

Once a Storefront receives a valid piece, it MAY be offered for aggregation, so that it makes its way into a Storage Provider. Aggregation MAY be handled asynchronously, therefore the Aggregator MUST acknowledge a request by issuing a signed receipt.

```mermaid
sequenceDiagram
    participant Storefront as 🌐<br/><br/>did:web:web3.storage
    participant Aggregator as 🌐<br/><br/>did:web:filecoin.web3.storage

    Storefront->>Aggregator: invoke `piece/offer`
    Note left of Aggregator: Request piece to be aggregated
    Aggregator-->>Storefront: receipt issued
```

### Aggregator queues the piece

Once an Aggregator successfully receives a piece offer, the piece gets queued for aggregation. A receipt is created to proof the transition of the offered aggregate state from `null` into `queued`. It is worth mentioning that if an offer is for a piece that is already `queued` or `computed` it is ignored.

This receipt MUST have link to a followup task (using `.fx.join` field) that either succeeds (if the piece was added into an aggregate) or fails, so that its receipt COULD be looked up using it.

### Aggregator offers broker an aggregate

When the Aggregator has enough content to fulfill an aggregate (each broker MAY have different requirements), a Filecoin deal for an aggregate MAY be requested by an `aggregate/offer` invocation. Deal negotiations with Filecoin Storage Providers MAY be handled out of band. A broker MUST acknowledge a request by issuing a signed receipt.

```mermaid
sequenceDiagram
    participant Aggregator as 🌐<br/><br/>did:web:filecoin.web3.storage
    participant Broker as 🌐<br/><br/>did:web:spade.storage

    Aggregator->>Broker: invoke `aggregate/offer`
    Note left of Broker: Request offer to be queued
    Broker-->>Aggregator: receipt issued
```

### Broker queues the aggregate

Once a Broker successfully receives the offer of an aggregate, the aggregate gets queued for review. A receipt is created to proof the transition of the offered aggregate state from `null` into `queued`. It is worth mentioning that if an offer is for an aggregate that is already `queued` or `complete` it is ignored.

This receipt MUST have link to a followup task (using `.fx.join` field) that either succeeds (if the aggregate was added into a deal) or fails (if the aggregate was determined to be invalid) so that its receipt COULD be looked up using it.

> Note: Aggregator MAY have several intermediate steps and states it transitions through, however those intentionally are not captured by this protocol, because storefront will take no action until success / failure condition is met.

### Broker reviews and handles the aggregate

After a broker dequeues the aggregate, it will interact with available Filecoin Storage Providers, in order to establish a previously determined (out of band) number of deals. Depending on storage providers availability, as well as the content present in the offer, the aggregate MAY be handled or not. A receipt is created to proof the transition of the aggregate state from `queued` into `accepted` or `rejected`.

```mermaid
sequenceDiagram
    participant Aggregator as 🌐<br/><br/>did:web:filecoin.web3.storage
    participant Broker as 🌐<br/><br/>did:web:spade.storage

    Note right of Aggregator: Review and handle offer async
    Broker-->>Aggregator: receipt issued
```

If the aggregate reaches the `accepted` state, the broker takes care of renewing deals.

The broker MAY request an out of bound signature from the Storefront to validate the terms of a deal.

### Storefront can query state of the aggregate deals

Storefront users MAY want to check details about deals from the content they previously stored. These deals will change over time as they get renewed. Therefore, Storefront should invoke `aggregate/get` capability to gather information about given aggregate identifier.

```mermaid
sequenceDiagram
participant Storefront as 🌐<br/><br/>did:web:filecoin.web3.storage
    participant Broker as 🌐<br/><br/>did:web:spade.storage

    Storefront->>Broker: invoke `aggregate/get`
```

## Capabilities

This section describes the capabilities that form the w3 aggregation protocol, along with the details relevant for invoking capabilities with a service provider.

In this document, we will be exposing capabilities implemented by Storefront `web3.storage`, Aggregator `filecoin.web3.storage` and Broker `spade-proxy.web3.storage`.

### `piece/add`

An agent principal can invoke a capability to add a piece to upcoming Filecoin deal(s) with a Storage provider. See [schema](#pieceadd-schema).

> `did:key:abc...` invokes capability from `did:web:web3.storage`

```json
{
  "iss": "did:key:abc...",
  "aud": "did:web:web3.storage",
  "att": [{
    "with": "did:key:abc...",
    "can": "piece/add",
    "nb": {
      "link": { "/": "bag..." }, /* CID of CAR file previously added to resource space */
      "piece": { "/": "commitment...car" } /* commitment proof for piece */
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
      "status": "queued-for-verification"
    }
  },
  "fx": {
    "join": { "/": "bafy...dequeu-verification" }
  },
  "meta": {},
  "iss": "did:web:web3.storage",
  "prf": []
}
```

See [`piece/verify`](#pieceverify) section to see the subsequent task.

### `piece/verify`

When a storefront principal receives a `piece/add` invocation from an agent, an [Effect](https://github.com/ucan-wg/invocation/#7-effect) for verifying the computed piece is created with join task to be performed asynchronously. See [schema](#pieceverify-schema).

```json
{
  "iss": "did:web:web3.storage",
  "aud": "did:web:web3.storage",
  "att": [{
    "with": "did:web:web3.storage",
    "can": "piece/verify",
    "nb": {
      "link": { "/": "bag..." }, /* CID of CAR file previously added to resource space */
      "piece": { "/": "commitment...car" } /* commitment proof for piece */
    }
  }],
  "prf": [],
  "sig": "..."
}
```

Once this invocation is executed, a receipt MUST be generated with the result of the task. Issued receipt MUST contain an [effect](https://github.com/ucan-wg/invocation/#7-effect) with a subsequent task (`.fx.join` field) that is run when piece is queued for aggregation and either succeeds (implying that piece was queued for being offered) or fails (with `error` describing the problem).

Accepted piece receipt looks like:

```json
{
  "ran": "bafy...invocation",
  "out": {
    "ok": {
      "piece": { "/": "commitment...car" }, /* commitment proof for piece */
      "status": "queued-for-offer"
    }
  },
  "fx": {
    "join": { "/": "bafy...dequeue-piece" }
  },
  "meta": {},
  "iss": "did:web:web3.storage",
  "prf": []
}
```

See [`piece/offer`](#pieceoffer) section to see the subsequent task.

If the added piece is invalid, details on failing reason is also reported:

```json
{
  "ran": "bafy...invocation",
  "out": {
    "error": {
      "piece": { "/": "commitment...car" }, /* commitment proof for piece */
      "reason": "reasonCode",
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

### `piece/offer`

A storefront principal can invoke a capability to offer a piece to be aggregated for upcoming Filecoin deal(s). See [schema](#pieceoffer-schema).

> `did:web:web3.storage` invokes capability from `did:web:filecoin.web3.storage`

```json
{
  "iss": "did:web:web3.storage",
  "aud": "did:web:filecoin.web3.storage",
  "att": [{
    "with": "did:web:web3.storage",
    "can": "piece/offer",
    "nb": {
      "piece": { "/": "commitment...car" }, /* commitment proof for piece */
      "provider": "did:web:free.web3.storage", /* provider associated with space where content was added */
    }
  }],
  "prf": [],
  "sig": "..."
}
```

Aggregator MUST issue a signed receipt when piece is verified. Issued receipt MUST contain an [effect](https://github.com/ucan-wg/invocation/#7-effect) with a subsequent task (`.fx.join` field) that is run when piece is added to an aggregate and either succeeds (implying that aggregate was queued for being offered) or fails (with `error` describing the problem).

```json
{
  "ran": "bafy...invocation",
  "out": {
    "ok": {
      "status": "queued-for-aggregate"
    }
  },
  "fx": {
    "join": { "/": "bafy...dequeue" }
  },
  "meta": {},
  "iss": "did:web:filecoin.web3.storage",
  "prf": []
}
```

See [`aggregate/arrange`](#aggregatearrange) section to see the subsequent task.

### `aggregate/arrange`

When an Aggregator principal receives a `piece/offer` invocation from a Storefront Principal, an [Effect](https://github.com/ucan-wg/invocation/#7-effect) for this submission is created with join task to be performed asynchronously. See [schema](#aggregatearrange-schema).

```json
{
  "iss": "did:web:filecoin.web3.storage",
  "aud": "did:web:web3.storage",
  "att": [{
    "with": "did:web:filecoin.web3.storage",
    "can": "aggregate/arrange",
    "nb": {
      "aggregate": { "/": "commitment...aggregate-proof" }, /* commitment proof */
      "piece": { "/": "commitment...piece-proof" } /* commitment proof */
    }
  }],
  "prf": [],
  "sig": "..."
}
```

Once this invocation is executed, a receipt is generated with the result of the task. Arranged aggregate for piece receipt looks like:

```json
{
  "ran": "bafy...arrange",
  "out": {
    "ok": {
       "aggregate": { "/": "commitment...aggregate-proof" } /* commitment proof */
    }
  },
  "fx": {
    "join": { "/": "bafy...dequeue-deal" }
  },
  "meta": {},
  "iss": "did:web:filecoin.web3.storage",
  "prf": []
}
```

If offered piece is invalid, details on failing pieces are also reported:

```json
{
  "ran": "bafy...invocation",
  "out": {
    "error": {
      "piece": { "/": "commitment...car" }, /* commitment proof for piece */
      "reason": "reasonCode",
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

### `aggregate/offer`

An aggregator principal can invoke a capabilty to offer an aggregate that is ready to be included in Filecoin deal(s). See [schema](#aggregateoffer-schema).

> `did:web:filecoin.web3.storage` invokes capability from `did:web:spade.storage`

```json
{
  "iss": "did:web:filecoin.web3.storage",
  "aud": "did:web:spade.storage",
  "att": [{
    "with": "did:web:filecoin.web3.storage",
    "can": "aggregate/offer",
    "nb": {
      "offer": { "/": "bafy...many-cars" }, /* dag-cbor CID with offer content */
      "piece": { "/": "commitment...aggregate-proof" } /* commitment proof for aggregate */
    }
  }],
  "prf": [],
  "sig": "..."
}
```

Invoking `aggregate/offer` capability submits an aggregate to a broker service for inclusion in one or more Filecoin deals. The `nb.piece` field represents the proof of the `piece` to be offered for the deal. It is a CID with its piece size encoded.

The `nb.offer` field represents a "Ferry" aggregate offer that is ready for a Filecoin deal. Its value is the DAG-CBOR CID that refers to a "Ferry" offer. It encodes a dag-cbor block with an array of entries representing all the pieces to include in the aggregated deal. This array MUST be sorted in the exact same order as they were used to compute the aggregate piece CID. This block MUST be included in the CAR file that transports the invocation. Its format is:

```json
/* offers block as an array of piece CIDs, encoded as DAG-JSON (for readability) */
[
  { "/": "commitment...car0" }, /* COMMP CID */
  { "/": "commitment...car1" }, /* COMMP CID */
  /* ... */
]
```

Each entry of the decoded offers block, has all the necessary information for a Storage Provider to fetch and store a CAR file. It includes an array of Filecoin `piece` info required by Storage Providers. Out of band, Storefront will provide to Storage Providers a `src` HTTP URL to each CAR file in the offer.

Broker MUST issue a signed receipt to acknowledge the received request. Issued receipt MUST contain an [effect](https://github.com/ucan-wg/invocation/#7-effect) with a subsequent task (`.fx.join` field) that is run when submitted aggregate is processed and either succeeds (implying that aggregate was accepted and deals will be arranged) or fail (with `error` describing a problem with the aggregate).

```json
{
  "ran": "bafy...invocation",
  "out": {
    "ok": {
      "status": "queued"
    }
  },
  "fx": {
    "join": { "/": "bafy...dequeue" }
  },
  "meta": {},
  "iss": "did:web:spade.storage",
  "prf": []
}
```

See [`offer/arrange`](#offerarrange) section to see the subsequent task.

### `aggregate/get`

A Storefront principal can query state of accepted aggregate by invoking `aggregate/get` capability. See [schema](#aggregateget-schema).

> `did:web:filecoin.web3.storage` invokes capability from `did:web:spade.storage`

```json
{
  "iss": "did:web:filecoin.web3.storage",
  "aud": "did:web:spade.storage",
  "att": [{
    "with": "did:web:filecoin.web3.storage",
    "can": "aggregate/get",
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

### `offer/arrange`

When a broker receives an `aggregate/offer` invocation from an Aggregator Principal, an [Effect](https://github.com/ucan-wg/invocation/#7-effect) for this submission is created with join task to be performed asynchronously. See [schema](#offerarrange-schema).

```json
{
  "iss": "did:web:spade.storage",
  "aud": "did:web:filecoin.web3.storage",
  "att": [{
    "with": "did:web:spade.storage",
    "can": "offer/arrange",
    "nb": {
      "piece": { "/": "commitment...aggregate-proof" } /* commitment proof */
    }
  }],
  "prf": [],
  "sig": "..."
}
```

Once this invocation is executed, a receipt is generated with the result of the task. Accepted aggregate receipt looks like:

```json
{
  "ran": "bafy...arrange",
  "out": {
    "ok": {
       "piece": { "/": "commitment...aggregate-proof" } /* commitment proof */
    }
  },
  "fx": {
    "fork": []
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
      "piece": { "/": "commitment...aggregate-proof" }, /* commitment proof */
      "cause": [{
        "piece": { "/": "commitment...car0" },
        "reason": "reasonCode",
      }],
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
type PieceCapability enum {
  PieceAdd "piece/add"
  PieceVerify "piece/verify"
  PieceOffer "piece/offer"
} representation inline {
  discriminantKey "can"
}

type AggregateCapability enum {
  AggregateArrange "aggregate/arrange"
  AggregateOffer "aggregate/offer"
  AggregateGet "aggregate/get"
} representation inline {
  discriminantKey "can"
}

type OfferCapability union {
  OfferArrange "offer/arrange"
} representation inline {
  discriminantKey "can"
}

type PieceRef struct {
  piece PieceCid
}

type URL string
type AgentDID string
type StorefrontDID string
type AggregatorDID string
type BrokerDID string
# from a fr32-sha2-256-trunc254-padded-binary-tree multihash
type PieceCid Link
type CarCid Link
```

### `piece/add` schema

```ipldsch
type PieceAdd struct {
  with AgentDID
  nb PieceAddDetail
}

type PieceAddDetail struct {
  # link of the stored CAR file associated with this piece
  link CarCid
  # Piece as Filecoin Piece with padding
  piece PieceCid
}
```

### `piece/verify` schema

```ipldsch
type PieceVerify struct {
  with StorefrontDID
  nb PieceVerifyDetail
}

type PieceVerifyDetail struct {
  # link of the stored CAR file associated with this piece
  link CarCid
  # Piece as Filecoin Piece with padding
  piece PieceCid
}
```

### `piece/offer` schema

```ipldsch
type PieceOffer struct {
  with StorefrontDID
  nb PieceOfferDetail
}

type PieceOfferDetail struct {
  # Piece as Filecoin Piece with padding
  piece PieceCid
  # Provider associated with space where content was added 
  provider string
}
```

### `aggregate/arrange` schema

```ipldsch
type AggregateArrange struct {
  with BrokerDID
  nb AggregateArrangeDetail
}

type AggregateArrangeDetail struct {
  # Piece as Filecoin Piece with padding
  piece PieceCid
  # Piece as Aggregate of CARs with padding
  aggregate PieceCid
}
```

### `aggregate/offer` schema

```ipldsch
type AggregateOffer struct {
  with StorefrontDID
  nb AggregateOfferDetail
}

type AggregateOfferDetail struct {
  # Contains each individual piece within Aggregate piece
  offer &Offer
  # Piece as Aggregate of CARs with padding
  piece PieceCid
}

type Offer [PieceCid]
```

### `aggregate/get` schema

```ipldsch
type AggregateGet struct {
  with StorefrontDID
  nb PieceRef
}
```

### `offer/arrange` schema

```ipldsch
type OfferArrange struct {
  with BrokerDID
  nb PieceRef
}
```

[`did:web`]: https://w3c-ccg.github.io/did-method-web/
[UCAN]: https://github.com/ucan-wg/spec/
[principal]: https://github.com/ucan-wg/spec/#321-principals

[Protocol Labs]:https://protocol.ai/
[Vasco Santos]:https://github.com/vasco-santos
[Irakli Gozalishvili]:https://github.com/Gozala
[Alan Shaw]:https://github.com/alanshaw
