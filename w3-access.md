# User Access

![status:wip](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)
[![hackmd-github-sync-badge](https://hackmd.io/8NywALT8Qp-cf0MSugZMDw/badge)](https://hackmd.io/8NywALT8Qp-cf0MSugZMDw)

## Editors

- [Irakli Gozalishvili](https://github.com/Gozala), [DAG House](https://dag.house/)

## Authors

- [Irakli Gozalishvili](https://github.com/Gozala), [DAG House](https://dag.house/)

# Abstract

In web3.storage we manage access across various user spaces and agents through delegated capabilities. Here we define the protocol for aggregating and managing delegated capabilities across various user agents.

## Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC2119](https://datatracker.ietf.org/doc/html/rfc2119).

# Introduction

## Motivation

In web3.storage users may create (name)space by generating an asymmetric keypair and deriving [`did:key`] identifier from it. (Name)space owner (private key owner) can delegate some or all capabilities to other identifiers without anyone's permission, however managing keypairs across multiple agents and devices can be complicated.

Here we propose protocol for relaying delegations between agents that have no direct channel between them.

# Terminology

## Delegate Access

An agent MAY delegate some capabilities to any other agent

> `did:key:zAlice` delegates `store/*` capabilities to `did:key:zBob`

```json
{
  "iss": "did:key:zAlice",
  "aud": "did:key:zBob",
  "att": [{ "with": "did:key:zAlice", "can": "store/*" }],
  "exp": null,
  "sig": "..."
}
```

Agent MAY send such a delegation(s) to the service implementing this protocol so that it's there for the audience to collect at their convenience.

### `access/delegate`

Agent CAN invoke `access/delegate` capability with arbitrary delegations which will be stored and made available for collection to their respective audiences.

#### Example

> Invoke `access/delegate` asking web3.storage to record delegation from the previous example

```json
{
  "iss": "did:key:zAlice",
  "aud": "did:web:web3.storage",
  "att": [
    {
      "with": "did:key:zAlice",
      "can": "access/delegate",
      "nb": {
        // Map of delegation links to be stored for their audiences.
        "delegations": { "bafy...prf1": { "/": "bafy...prf1" } }
      }
    }
  ],
  "prf": [
    {
      "iss": "did:key:zAlice",
      "aud": "did:key:zBob",
      "att": [
        {
          "with": "did:key:zAlice",
          "can": "store/*"
        }
      ],
      "exp": null,
      "sig": "..."
    }
  ],
  "sig": "..."
}
```

#### delegate `with`

Field MUST be a space DID with a storage provider. Delegation will be stored just like any other DAG stored using `store/add` capability.

Provider SHOULD deny service if DID in the `with` field has no storage provider.

#### delegate `nb`

##### delegate `nb.delegations`

Field is a set of delegation links represented as JSON. Keys SHOULD be CID strings of the values to make encoding deterministic.

Delegations MUST be included with an invocation. Invocations that link to delegations not included with invocation MUST be denied.

> ⚠️ Note that currently only way to include delegations with invocation requires putting them in proofs, which will be addressed by [#39](https://github.com/web3-storage/ucanto/issues/39)

## Claim Access

Agent MAY claim capabilities that delegated to it using `access/claim` capability.

<!-- When user is [authorizing][authorization] a new agent, the service MAY include all the valid, _(not yet expired or revoked)_ delegations with an authorization proof, that grant the agent access to all capabilities across all of the spaces.

However a user may also add new delegations on one device and expect to have access to them on another device without having having to go through another email [authorization][] flow. To address this service MUST provide `access/claim` capability, which an agent MAY invoke to collect (new) delegations for the account -->

### `access/claim`

Agent CAN invoke `access/claim` capability to the service implementing this protocol to collect all the valid delegations where audience matches `with` field.

```json
{
  "iss": "did:key:zBob",
  "aud": "did:web:web3.storage",
  "att": [
    {
      "with": "did:key:zBob",
      "can": "access/claim"
    }
  ],
  "sig": "..."
}
```

# Examples

## Access across multiple devices

> Access protocol implies that delegation issuer be aware of the audience DID. Often complementary [authorization] protocol can be utilized to remove need for passing around cryptographic [`did:key`] identifiers as following example attempt to illustrate.

When Alice first runs `w3up` program it asks for the user identity she'd like to use. After Alice types `alice@web.mail` program initiates [authorization] protocol and creates a new (user) space by deriving `did:key:zAliceSpace` [`did:key`] from it. It immediately delegates capabilities to this space to Alice's identity:

```json
{
  "iss": "did:key:zAliceSpace",
  "aud": "did:web:web3.storage",
  "att": [
    {
      "with": "did:key:zAliceSpace",
      "can": "access/delegate",
      "nb": {
        // Map of delegation links to be stored for their audiences.
        "delegations": { "bafy...prf1": { "/": "bafy...prf1" } }
      }
    }
  ],
  "prf": [
    // delegation to
    {
      "iss": "did:key:zAliceSpace",
      "aud": "did:mailto:web.mail:alice",
      "att": [
        {
          "with": "did:key:zAliceSpace",
          "can": "*"
        }
      ],
      "exp": null,
      "sig": "..."
    }
  ],
  "sig": "..."
}
```

When Alice runs `w3up` program on her other device, and she enters the same email address, it also initiates [authorization] flow to obtain access on a new device.

```json
{
  "iss": "did:key:zAli",
  "aud": "did:web:web3.storage",
  "att": [
    {
      "with": "did:key:zAli",
      "can": "access/authorize",
      "nb": { "as": "did:mailto:web.mail:alice" }
    }
  ],
  "sig": "..."
}
```

After receiving an email and clicking a link to approve authorization, an agent on a new device receives a delegation allowing that agent to sign delegations via local (non-extractable) `did:key:zAli` key

```json
{
  "iss": "did:web:web3.storage",
  "aud": "did:mailto:web.mail:alice",
  "att": [
    {
      "with": "did:web:web3.storage",
      "can": "./update",
      "nb": { "key": "did:key:zAli" }
    }
  ],
  "sig": "..."
}
```

Using this authorization, a new device can claim capabilities that were delegated to it

```json
{
  "iss": "did:mailto:web.mail:alice",
  "aud": "did:web:web3.storage",
  "att": {
    "with": "did:mailto:web.mail:alice",
    "can": "access/claim"
  },
  "prf": [
    {
      "iss": "did:web:web3.storage",
      "aud": "did:mailto:web.mail:alice",
      "att": [
        {
          "with": "did:web:web3.storage",
          "can": "./update",
          "nb": { "key": "did:key:zAli" }
        }
      ]
    }
  ],
  "sig": "..."
}
```

Service will respond with delegations where audience is `did:mailto:web:mail:alice` which will give agent on this new device access to `did:key:zAliceSpace`:

```json
{
  "iss": "did:key:zAliceSpace",
  "aud": "did:mailto:web.mail:alice",
  "att": [
    {
      "with": "did:key:zAliceSpace",
      "can": "*"
    }
  ],
  "exp": null,
  "sig": "..."
}
```

## Sharing access with a friend

> Access protocol could be utilized to share access with a friend who may have never used web3.storage.

Alice wants to share access to her space with her friend Bob. She does not know if Bob has ever heard of web3.storage, but she knows his email address `bob@gmail.com` allowing her to delegate capabilities to it:

```json
{
  "iss": "did:key:zAliceSpace",
  "aud": "did:web:web3.storage",
  "att": [
    {
      "with": "did:key:zAliceSpace",
      "can": "access/delegate",
      "nb": {
        // Map of delegation links to be stored for their audiences.
        "delegations": { "bafy...prf1": { "/": "bafy...prf1" } }
      }
    }
  ],
  "prf": [
    // delegation to
    {
      "iss": "did:key:zAliceSpace",
      "aud": "did:mailto:gmail.com:bob",
      "att": [
        {
          "with": "did:key:zAliceSpace",
          "can": "store/list"
        }
      ],
      "exp": "...",
      "sig": "..."
    }
  ],
  "sig": "..."
}
```

When Bob runs `w3up` agent the first time and authorizes as `bob@gmail.com` program will collect capabilities delegated to it:

```json
{
  "iss": "did:mailto:gmail.com:bob",
  "aud": "did:web:web3.storage",
  "att": {
    "with": "did:mailto:gmail.com:bob",
    "can": "access/claim"
  },
  "prf": [
    {
      "iss": "did:web:web3.storage",
      "aud": "did:mailto:gmail.com:bob",
      "att": [
        {
          "with": "did:web:web3.storage",
          "can": "./update",
          "nb": { "key": "did:key:zBobAgent" }
        }
      ]
    }
  ],
  "sig": "..."
}
```

Service responds with a delegation from Alice giving Bob's agent capability to execute `store/list` on `did:key:zAliceSpace` space

```json
{
  "iss": "did:key:zAliceSpace",
  "aud": "did:mailto:gmail.com:bob",
  "att": [
    {
      "with": "did:key:zAliceSpace",
      "can": "store/list"
    }
  ],
  "exp": "...",
  "sig": "..."
}
```

# Related Notes

## Free provider

web3.storage offers one "free provider" per account. It will be denied if a `consumer` space is not specified or if account has already claimed it with a different `consumer` space.

Note that adding the "free provider" to a space more than once has no effect _(even when obtained through different accounts)_, because a space has _set_ of providers, and "free provider" is either in that set or not.

[`did:key`]: https://w3c-ccg.github.io/did-method-key/
[authorization]: w3-session.md#authorization
