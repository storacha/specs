# W3 Compute Protocol

![status:draft](https://img.shields.io/badge/status-reliable-green.svg?style=flat-square)

## Editors

- [Vasco Santos], [Protocol Labs]

## Authors

- [Vasco Santos], [Protocol Labs]

# Abstract

This spec describes a [UCAN] protocol allowing an implementer to perform simple computations over data on behalf of an issuer.

## Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC2119](https://datatracker.ietf.org/doc/html/rfc2119).

# Table of Contents

- [Introduction](#introduction)
- [Capabilities](#capabilities)
  - [`compute/` namespace](#compute-namespace)
    - [`compute/*`](#compute)
    - [`compute/piececid`](#computepiececid)
- [Schema](#schema)
  - [`compute/piececid` schema](#computepiececid-schema)

# Introduction

Within the w3up protocol flows, some computations MUST be performed over data. These case range from computing proofs to data indexes, as well as to verify client side offered computations.

The `w3-compute` protocol aims to enable clients to hire compute services to delegate some work, as well as for `w3-up` platform to hire third party compute services to verify client side offered computations if desirable.

Note that the discovery process by actors looking for services providing given computations is for now out of scope of this spec.

# Capabilities

## `compute/` namespace

The `compute/` namespace contains capabilities relating to computations.

## `compute/*`

> Delegate all capabilities in the `compute/` namespace

The `compute/*` capability is the "top" capability of the `compute/*` namespace. `compute/*` can be delegated to a user agent, but cannot be invoked directly. Instead, it allows the agent to derive any capability in the `compute/` namespace, provided the resource URI matches the one in the `compute/*` capability delegation.

In other words, if an agent has a delegation for `compute/*` for a given space URI, they can invoke any capability in the `compute/` namespace using that space as the resource.

## `compute/piececid`

Request computation of a PieceCIDv2 per [FRC-0069](https://github.com/filecoin-project/FIPs/blob/master/FRCs/frc-0069.md). A CID representation for the FR32 padded sha256-trunc254-padded binary merkle trees used in Filecoin Piece Commitments.

> `did:key:zAliceAgent` invokes `compute/piececid` capability provided by `did:web:web3.storage`

```json
{
  "iss": "did:key:zAliceAgent",
  "aud": "did:web:web3.storage",
  "att": [
    {
      "with": "did:key:zAliceAgent",
      "can": "compute/piececid",
      "nb": {
        /* CID of the uploaded content */
        "content": { "/": "bag...car" }
      }
    }
  ],
  "prf": [],
  "sig": "..."
}
```

### Compute PieceCID Failure

The service MAY fail the invocation if the linked `content` is not found. Implementer can rely on IPFS gateways, location claims or any other service to try to find the CAR bytes.

```json
{
  "ran": "bafy...computePiececid",
  "out": {
    "error": {
      "name": "ContentNotFoundError",
      "content": { "/": "bag...car" }
    }
  }
}
```

### Compute PieceCID Success

```json
{
  "ran": "bafy...filAccept",
  "out": {
    "ok": {
      /* commitment proof for piece */
      "piece": { "/": "commitment...car" }
    }
  }
}
```

# Schema

## `compute/piececid` schema

```ipldsch
type ComputePieceCid struct {
  with AgentDID
  nb ComputePieceCidDetail
}

type ComputePieceCidDetail struct {
  # CID of file previously added to IPFS Network
  content &Content
}
```

[Protocol Labs]: https://protocol.ai/
[Vasco Santos]: https://github.com/vasco-santos
