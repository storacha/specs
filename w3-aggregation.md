# CAR Aggregation Protocol

![status:wip](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)

## Editors

- [Vasco Santos], [Protocol Labs]

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
| Storefront | [Principal] identified by [`did:web`] identifier, representing a storage aggregator like w3up |
| Authority   | [Principal] that represents service provider that executes invoked capabilities |
| Verifier   | Component of the [authority] that performs UCAN validation |

### Storefront

A _Storefront_ is a type of [principal] identified by a [`did:web`] identifier.

A Storefront facilitates data storage services to applications and users, getting the requested data stored into Filecoin deals asynchronously.

### Authority

_Authority_ is a [principal] that executes invoked capabilities.

### Verifier

A Component of the [authority] that performs UCAN validation

# Protocol

## Overview

A Storefront is the entry point for user/application data into the web3. It will act on behalf of users to move data around into different storage points. One of the key storage presences may be Filecoin Storage Providers.

### Authorization

Broker MUST have an authorization mechanism for allowed Storefront principals (e.g. web3.storage). Either by out-of-bound exchange of information or through a well defined API. In other words, broker can authorize invocations from `did:web:web3.storage` by validating signature from did. This way, if it would allow web3.storage to rotate keys without having too coordinate that with broker.

### Storefront offers broker an aggregate

When a Storefront has enough content to fulfill an aggregate (each broker might have different requirements), a Filecoin deal for an aggregate SHALL be requested by a `aggregate/submit` invocations. Deal negotiations with Filecoin Storage Providers will be handled out off band. Therefore, Broker should generate a receipt to acknowledge received request. This receipt MUST contain a followup task in the (`.fx.join` field) that is run when submitted request is processed which MAY succeed (if aggregate was accepted) or fail (e.g. if aggregated was  determined to be invalid). Result of the subsequent task CAN be looked up using it's receipt.

```mermaid
sequenceDiagram
    participant Storefront as 🌐<br/><br/>did:web:web3.storage
    participant Authority as 🌐<br/><br/>did:web:spade.storage

    Storefront->>Authority: invoke `aggregate/submit`
    Note left of Authority: Prepare for deal
    Authority-->>Storefront: receipt
    Note left of Authority: Land deal in Filecoin
```

### Broker queues the offer

TODO

### Broker reviews and handles the offer

TODO

### Storefront can query state of the aggregate deals

Storefront users MAY want to check details about deals from the content they previously stored. These deals will change over time as they get renewed. Therefore, Storefront should invoke `aggregate/get` capability to gather information about given aggregate identifier.

```mermaid
sequenceDiagram
participant Storefront as 🌐<br/><br/>did:web:web3.storage
    participant Authority as 🌐<br/><br/>did:web:spade.storage

    Storefront->>Authority: invoke `aggregate/get`
```

## Capabilities

This section describes the capabilities that form the w3 aggregation protocol, along with the details relevant for invoking capabilities with a service provider.

In this document, we will be looking at `spade.storage` as an implementer of the `aggregate` and `deals/*` protocol.

### `aggregate/*`

A Filecoin broker Authority MAY delegate capabilities to any Storefront principal.

> `did:web:spade.storage` delegates `aggregate/*` capabilities to `did:web:web3.storage`

```json
{
  "iss": "did:web:spade.storage",
  "aud": "did:web:web3.storage",
  "att": [{"with": "did:web:web3.storage", "can": "aggregate/*" }],
  "exp": null,
  "sig": "..."
}
```

### `aggregate/submit`

A Storefront principal can invoke a capabilty to submit an aggregate ready for deals.

> `did:web:web3.storage` invokes capability from `did:web:spade.storage`

```json
{
  "iss": "did:web:web3.storage",
  "aud": "did:web:spade.storage",
  "att": [{
    "with": "did:web:web3.storage",
    "can": "aggregate/submit",
    "nb": {
      "offer": {
        "link": "bagy...aggregate",
        "size": 110101,
        "commP": "commP...",
        "src": ["https://w3s.link/ipfs/bagy...aggregate"]
      }
    }
  }],
  "prf": [],
  "sig": "..."
}
```

This capability is invoked to submit a request to a broker service when an aggregate is ready for a Filecoin deal. The `nb.offer.link` is the CAR CID that refers to a "Ferry" aggregate, a collection of dag-cbor blocks with format:

```json
{
  "link": "bag...",
  "size": 110101,
  "commP": "commP...",
  "src": ["https://.../bag(...).car"]
}
```

A receipt will be generated to acknowledge the received request. This receipt MUST contain an [effect](https://github.com/ucan-wg/invocation/#7-effect) with a subsequent task (`.fx.join` field) that is run when submitted aggregate is processed and either succeeds (implying that aggregate was accepted and deals will be arranged) or fail (with `error` describing a problem with an aggregate)

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

Open questions:

- can we get a `commP` of the aggregate with `commP` of every CAR that is part of it?

### `aggregate/get`

A Storefront principal can invoke a capability to get state of the accepted aggregate.

> `did:web:web3.storage` invokes capability from `did:web:spade.storage`

```json
{
  "iss": "did:web:web3.storage",
  "aud": "did:web:spade.storage",
  "att": [{
    "with": "did:web:web3.storage",
    "can": "aggregate/get",
    "nb": {
      "commP": "commP...",
    }
  }],
  "prf": [
    "iss": "did:web:spade.storage",
    "aud": "did:web:web3.storage",
    "att": [{ "with": "did:web:spade.storage", "can": "aggregate/*" }],
    "sig": "..."
  ],
  "sig": "..."
}
```

### `deal/offer`

When a broker receives an `aggregate/submit` invocation from a Storefront Principal, an [Effect](https://github.com/ucan-wg/invocation/#7-effect) for this submission is created with multiple fork tasks to be performed asynchronously.

```json
{
  "iss": "did:web:spade.storage",
  "aud": "did:web:web3.storage",
  "att": [{
    "with": "did:web:spade.storage",
    "can": "deal/offer",
    "nb": {
      "commP": "commP",
    }
  }],
  "prf": [],
  "sig": "..."
}
```

Once this invocation is executed, a receipt is generated with the result of the operation.

Accepted aggregate receipt will provide aggregate status info:

```json
{
  "ran": "bafy...review",
  "out": {
    "ok": {
       "status": "accepted",
       "link": "bafy...aggregate"
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

If offered aggregate is invalid, details on failing commPs are reported:

```json
{
  "ran": "bafy...invocation",
  "out": {
    "error": {
      "status": "denied",
      "cause": [{
        "commP": "commP",
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

[`did:web`]: https://w3c-ccg.github.io/did-method-web/
[UCAN]: https://github.com/ucan-wg/spec/
[principal]: https://github.com/ucan-wg/spec/#321-principals
[authority]:#authority

[Protocol Labs]:https://protocol.ai/
[Vasco Santos]:https://github.com/vasco-santos
