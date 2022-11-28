# User Accounts

![status:wip](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)
[![hackmd-github-sync-badge](https://hackmd.io/8NywALT8Qp-cf0MSugZMDw/badge)](https://hackmd.io/8NywALT8Qp-cf0MSugZMDw)

## Editors

- [Irakli Gozalishvili](https://github.com/Gozala), [DAG House](https://dag.house/)

## Authors

- [Irakli Gozalishvili](https://github.com/Gozala), [DAG House](https://dag.house/)


# Abstract


In web3.storage we describe concept of an account as convenience for aggregating and managing capabilities across various user spaces under same identity, simplifying recovery and authorization flows.

## Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC2119](https://datatracker.ietf.org/doc/html/rfc2119).


# Introduction

## Motivation

In web3.storage users MAY create number of user spaces simply by generating asymmetric key pair. They MAY be delegated capabilities for other user spaces. Managing these delegations and keypairs across multiple spaces, agents and devices can get complicated.

To address this we propose a concept of an account, which is a [principal][] that can be delegated all relevant capabilities across various user spaces.

We also propose account authorization flow that would allowing allow authorized agent to act on behalf of the account [principal][].


# Terminology

## Account

User account is a [principal][] identified by [`did:mailto`][] (listed in a UCAN's `iss` or `aud` field).

When user agent creates a new space, it MAY delegate full or subset of the capabilities to user account so they could be reclaimed by a user with another agent.

> Example shows all capabilities to `did:key:zAlice` space been delegated to the user account `alice@web.mail` 

```ts!
{
  iss: "did:key:zAlice",
  aud: "did:mailto:alice@web.mail",
  att: [{ with: "did:key:zAlice", can: "*" }],
  exp: null,
  sig: "..."
}
```

## Delegations

Agent MAY publish account delegations to a serivce so that they can be persisted and retrieved later with a different agent.

> Invokes `access/delegate` asking web3.storage to record delegation from `did:key:zAlice` space to the `alice@web.mail` account.

 ```ts
{
  iss: "did:key:zAgent",
  aud: "did:dns:web3.storage",
  att: [{
    with: "did:key:zAgent",
    can: "access/delegate",
    nb: {
      access: Link<{
        iss: "did:key:zAlice",
        aud: "did:mailto:alice@web.mail",
        att: [{ with: "did:key:zAlice", can: "*" }],
        exp: null,
        sig: "..."
      }>
     }
    }
  }],
  sig: "..."
}
```

:::warning
[Recipient validation][] requires wrapping actual delegation into `access/delegate` invocation, but in the future we may find a way to remove this requirement.
:::
 
## Authorization

User MAY authorize an agent to represent their account by invoking `ucan/issue` capability with an audience where authorization is to be considered valid


> Agent requests authorization to represent `alice@web.mail` with `did:key:zAgent` in the context of `web3.storage`

```ts
{
  iss: "did:key:zAgent",
  aud: "did:dns:web3.storage",
  att: [{
    with: "did:key:zAgent",
    can: "ucan/issue",
    nb: { as: "did:mailto:alice@web.mail" }
  }]
}
```

### issue `with`

Resource MUST be a [`did:key`][] URI. It represents a public key that user wishes to use for signing UCANs issued by DID in the [`nb.as`][issue `as`] field.

### issue `as`

Account MUST be a [`did:mailto`][] principal. It is an account that user wishes to be represented by [`did:key`][] in the [`with`][issue `with`] field.


## Verification

Service MUST perform out of bound user verification. For example, the service could email a link to the mailbox of the account. Clicking the link in the email would authorize the agent to represent the account.

On succesful verification service MUST delegate corresponding `ucan/sign` capability to the [`did:key`][] it was requested [`with`][issue `with`].

Delegation represents authorization to issue [UCAN][]s with [`did:mailto`] account prinicipal which MAY be signed with [`did:key`] of the agent.


```ts
{
  iss: "did:dns:web3.storage",
  aud: "did:mailto:alice@web.mail",
  att: [{
    with: "did:dns:web3.storage",
    can: "ucan/sign",
    nb: { as: "did:key:zAgent" }
  }],
  exp: null
  sig: "..."
}
```

### sign `with`

Authorization context, implying that this authorization MUST be considered valid by this recipient (`aud` matches this `with`).

Other recipients MAY also recognize authorizations issued by trusted principals.


### sign `aud`

Audience of the [UCAN][] MUST be [`did:mailto`][] identifier of the account principal. This ensures that [principal alignment] requirement can be met when authorization is used as proof by an account.


### sign `as`

MUST be a [`did:key`][] of the principal which MAY sign [UCAN][]s issued by an account principal in [`aud`](#sign-aud).


## Utilization

Authorized agents MAY issue UCANs using account [`did:mailto`][] identifier, sign it with agent private key and add authorization to `prf` as proofs that it was authorized by recepient to do so.

```ts!
{
  // UCAN issued by the account DID
  iss: "did:mailto:alice@web.mail",
  aud: "did:dns:web3.storage",
  // list stored data in did:key:zAlice space
  att: [{
    with: "did:key:zAlice",
    can: "store/list"
  }],
  prf: [
    // Proof that did:key:zAgent MAY sign UCANs issued
    // by did:mailto:alice@web.mail
    {
      iss: "did:dns:web3.storage",
      aud: "did:mailto:alice@web.mail",
        att: [{
          with: "did:dns:web3.storage",
          can: "ucan/sign",
          nb: { as: "did:key:zAgent" }
        }],
        exp: null
        sig: "..."
    },
    // Proof that did:mailto:alice@web.mail has capability
    // to list stored data in did:key:zAlice space
    {
      iss: "did:key:zAlice",
      aud: "did:mailto:alice@web.mail",
      att: [{
        with: "did:key:zAlice",
        can: "*"
      }],
      exp: null,
      sig: "..."
    }
  ]
}
```


# Limitations

Using delegation from specific authority as an authorization proof limits it to the contexts where it is trusted. It is reasonable compromise when issued UCAN receipent is the same authority, but problematic in wider contexts.

Long term we would like to upgrade this specification to [UCAN mailto][] so that authorization may be verifiable and not require trusting third-party that performed [verification][].

# Related Notes

## Free provider

web3.storage offers one "free provider" per account. It will be denied if `consumer` space is not specified or is the one that already has it.

Note that adding "free provider" to the space is more than once has no effect _(even when obtained through different accounts)_, because space has set of providers, and "free provider" is either in that set or it is not.

[UCAN mailto]:https://github.com/ucan-wg/ucan-mailto/
[`did:mailto`]:https://github.com/ucan-wg/did-mailto/
[principal]:https://github.com/ucan-wg/spec/blob/main/README.md#321-principals
[recipient validation]:https://github.com/ucan-wg/spec/blob/main/README.md#621-recipient-validation
[`did:key`]:https://w3c-ccg.github.io/did-method-key/
[issue `as`]:#issue-as
[issue `with`]:#issue-with
[UCAN]:https://github.com/ucan-wg/spec/
[principal alignment]:https://github.com/ucan-wg/spec/blob/main/README.md#62-principal-alignment
[verification]:#Verification