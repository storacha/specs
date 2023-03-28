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

## Authorization

A Filecoin broker authority (e.g. Spade) MUST give capabilities to Storefront principals (e.g. web3.storage) to invoke capabilities to get stored content into Filecoin deals.

```mermaid
sequenceDiagram
    participant Authority as 🌐<br/><br/>did:web:spade.storage
    participant Storefront as 🌐<br/><br/>did:web:web3.storage

    Authority->>Storefront: delegate `aggregate/*`
```

Note that this can be done out of band with presentation of a delegation signature.

## Deal creation

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

## Deal information

Storefront users MAY want to check details about deals from the content they previously stored. These deals will change over time as they get renewed. Therefore, Storefront should invoke `aggregate/deals` capability to gather information about given aggregate identifier.

```mermaid
sequenceDiagram
participant Storefront as 🌐<br/><br/>did:web:web3.storage
    participant Authority as 🌐<br/><br/>did:web:spade.storage

    Storefront->>Authority: invoke `aggregate/deals`
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
      "link": "bagy...aggregate",
    }
  }],
  "prf": [
    "iss": "did:web:spade.storage",
    "aud": "did:web:web3.storage",
    "att": [{ "with": "did:web:spade.storage", "can": "aggregate/*" }],
    "exp": null,
    "sig": "..."
  ],
  "sig": "..."
}
```

This capability is invoked to submit a request to a broker service when an aggregate is ready for a Filecoin deal. The `nb.link` is the CAR CID that refers to a "Ferry" aggregate, a collection of dag-cbor blocks with format:

```json
{
  "link": "bag...",
  "size": 110101,
  "commP": "commP...",
  "url": "https://.../bag(...).car"
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
    "fork": [
      "bafy...dealinvocation1",
      "bafy...dealinvocation2",
      "bafy...dealinvocation3"
      ]
  },
  "meta": {},
  "iss": "did:web:spade.storage",
  "prf": []
}
```

Open questions:

- can we get a `commP` of the aggregate with `commP` of every CAR that is part of it?
- perhaps the `nb` should also include the `commP` of the aggregate?

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
      "link": "bagy...aggregate",
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

Open questions:

- should the `nb` include only the `commP` of the aggregate as only field?

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

A successful deal receipt will include the details of the deal:

```json
{
  "ran": "bafy...invocation",
  "out": {
    "ok": {
      "dealId": 142334312,
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
      "parts": [{
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
