# Filecoin Protocol

![status:wip](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)

## Editors

- [Vasco Santos], [Protocol Labs]

## Authors

- [Vasco Santos], [Protocol Labs]

# Abstract

This spec describes the filecoin protocol used by web3.storage's "w3up" platform to interact with Spade ♠️ in order to get user/application CAR files into Filecoin deals.

## Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC2119](https://datatracker.ietf.org/doc/html/rfc2119).

# Terminology

## Roles

There are several roles in the authorization flow:

| Name        | Description |
| ----------- | ----------- |
| Storage Provider | [Principal] identified by [`did:web`] identifier, representing a storage provider like w3up |
| Authority   | [Principal] that represents service provider that executes invoked capabilities |
| Verifier   | Component of the [authority] that performs UCAN validation |

### Storage Provider

A _Storage Provider_ is a type of [principal] identified by a [`did:web`] identifier.

A Storage Providers facilitates data storage services to applications and users, getting the requested data stored into Filecoin deals asynchronously.

### Authority

_Authority_ is a [principal] that executes invoked capabilities.

### Verifier

Component of the [authority] that performs UCAN validation

# Protocol

## Overview

A Storage Provider is the entry point for user/application data into the web3. It will act on behalf of users to move data around into different storage points. One of the key storage points is Filecoin deals.

## Authorization

Storage Provider (web3.storage) must be given capabilities by a Filecoin broker Authority (Spade) to invoke capabilities to get its stored content into Filecoin deals.

```mermaid
sequenceDiagram
    participant Authority as 🌐<br/><br/>did:web:spade.storage
    participant Storage Provider as 🌐<br/><br/>did:web:web3.storage #32;

    Authority->>Storage Provider: delegate `filecoin/add`
```

## Filecoin deals

When a storage provider has enough 

```mermaid
sequenceDiagram
    participant Authority as 🌐<br/><br/>did:web:spade.storage
    participant Storage Provider as 🌐<br/><br/>did:web:web3.storage #32;

    Storage Provider->>Authority: invoke `filecoin/add`
    Note left of Authority: Prepare for deal
    Authority-->>Storage Provider: receipt
    Note left of Authority: Land deal in Filecoin
    Authority->>Storage Provider: invoke `filecoin/deal`
    Authority-->>Storage Provider: invoke `filecoin/fail`
```

## Capabilities

This section describes the capabilities that form the w3 Filecoin protocol, along with details relevant to invoking capabilities with a service provider.

### `filecoin/add`

A Filecoin broker Authority MAY delegate capabilities to any storage provider.

> `did:web:spade.storage` delegates `filecoin/add` capabilities to `did:web:web3.storage`

```json
{
  "iss": "did:web:spade.storage",
  "aud": "did:web:web3.storage",
  "att": [{ "with": "did:web:spade.storage", "can": "filecoin/add" }],
  "exp": null,
  "sig": "..."
}
```

> `did:web:web3.storage` invokes capability from `did:web:spade.storage`

```json
{
  "iss": "did:web:web3.storage",
  "aud": "did:web:spade.storage",
  "att": [{
    "with": "did:web:spade.storage",
    "can": "filecoin/add",
    "nb": : {
      "aggregateId": "id...",
      "cars": [
        {
          "link": "bag...",
          "size": 1234,
          "md5": "md5...",
          "commP": "commP...",
          "url": "https://..."
        }
      ]
    }
  }],
  "prof": [
    "iss": "did:web:spade.storage",
    "aud": "did:web:web3.storage",
    "att": [{ "with": "did:web:spade.storage", "can": "filecoin/add" }],
    "exp": null,
    "sig": "..."
  ],
  "sig": "..."
}
```

### `filecoin/deal`

A Filecoin broker authority MAY invoke deal capability when one aggregate lands into a Filecoin deal. It should include the CID of the request CAR cid from `filecoin/add` invocation.

```json
{
  "iss": "did:web:spade.storage",
  "aud": "did:web:spade.storage",
  "att": [{
    "with": "did:web:spade.storage",
    "can": "filecoin/deal",
    "nb": : {
      "aggregateId": "id...",
      "requestCarCid": "bag...",
      "commP": "commP..."
    }
  }],
  "prof": [],
  "sig": "..."
}
```

### `filecoin/fail`

A Filecoin broker authority MAY invoke deal capability when one aggregate fails to land into a Filecoin deal. It should include the CID of the request CAR cid from `filecoin/add` invocation.

```json
{
  "iss": "did:web:spade.storage",
  "aud": "did:web:spade.storage",
  "att": [{
    "with": "did:web:spade.storage",
    "can": "filecoin/deal",
    "nb": : {
      "aggregateId": "id...",
      "requestCarCid": "bag...",
      "reason": "tbd"
    }
  }],
  "prof": [],
  "sig": "..."
}
```

---

[`did:web`]: https://w3c-ccg.github.io/did-method-web/
[ucan]: https://github.com/ucan-wg/spec/
[principal]: https://github.com/ucan-wg/spec/#321-principals
[authority]:#authority

[Protocol Labs]:https://protocol.ai/
[Vasco Santos]:https://github.com/vasco-santos
