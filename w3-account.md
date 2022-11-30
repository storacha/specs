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

In web3.storage users MAY create number of user spaces simply by generating asymmetric key pairs. User MAY also receive capability delegations from other user spaces. Managing these delegations and keypairs across multiple spaces, agents and devices can get complicated.

To address this we propose a concept of an account, which is a [principal][] that can be delegated all relevant capabilities across various user spaces. In this specification we require use of [`did:mailto`][] identifiers for an account, however it could be generalized to other DID methods.

We also propose account authorization flow that would allowing allow authorized agent to act on behalf of the account [principal][].


# Terminology

## Account

User account is a [principal][] identified by [`did:mailto`][] identifier.

> It MUST be a DID identifier as opposed to `mailto:` URI to be a valid prinicipal in the UCAN protocol.



## Authorization

User MAY authorize an agent to represent their account by delegating capabilities to it. However since right now we have no way of creating or resolving [`did:mailto`][] documents, there is no supported way to issue such a delegation.

> In the future we intend to address this by implementing support for [ucan mailto][] specification.

To address this limitation service MUST provide `ucan/issue` capability, that user agent MAY invoke
to get an authorization to act on behalf of the account.


> Exmaple illustrates authorization request to represent `alice@web.mail` with `did:key:zAgent` agent from `web3.storage`

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



#### issue `with`

Resource MUST be a [`did:key`][] URI. It represents a public key that user wishes to use for signing UCANs issued by DID in the [`nb.as`][issue `as`] field. It SHOULD represent user agent DID.

#### issue `as`

Field MUST be a an account agent wishes to represent via [`did:key`][] in the [`with`][issue `with`] field . It MUST be a valid [`did:mailto`][] identifier


### Email validation

Service MUST perform an out of bound email verification to ensure that user requesting authorization has access to the requestd email address.

> For example, the service could send an email email with a link asking user to authorize an agent When link is clicked, agent will be delegated UCAN with requested authorization.

On succesful verification service MUST delegate `ucan/sign` capability to the [`did:key`][]it was requested [`with`][issue `with`].

Delegation represents authorization to issue [UCAN][]s with [`did:mailto`] account prinicipal, which MAY be signed with [`did:key`] of the agent.


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

#### sign `with`

Authorization context, implying that this authorization MUST be considered valid by this recipient (`aud` matches this `with`).

Other recipients MAY also recognize authorizations issued by trusted principals.


#### sign `aud`

Audience of the [UCAN][] MUST be [`did:mailto`][] identifier of the account principal. This ensures that [principal alignment] requirement can be met when authorization is used as proof by an account.


#### sign `as`

MUST be a [`did:key`][] of the principal which MAY sign [UCAN][]s issued by an account principal in [`aud`](#sign-aud).

### Authorization flow

Below sequence diagram illustrates complete authorization flow as described above.


```sequence
"👩‍💻 did:key:zAgent" -> "🌐 did:dns:web3.storage": "\n🎟\n{                              \n  with: did:key:zAgent         \n  can: ucan/issue              \n  as: did:mailto:alice@web.mail\n}                              \n\n\n "
"🌐 did:dns:web3.storage" -> "✉️ alice@web.mail": ✉️ Verification email
"✉️ alice@web.mail" -> "🌐 did:dns:web3.storage": 🔗 Verify
"🌐 did:dns:web3.storage" -> "👩‍💻 did:key:zAgent": "\n🎫\n{                             \n  with: did:dns:web3.storage\n  can: ucan/sign            \nas: did:key:zAgent       \n}                            \n\n "
```



## Delegate Access

When user agent creates a new space, it MAY delegate full or subset of the capabilities to desired account. This would allow user in different agent to reclaim delegated capabilities there.

> Example below illustrates delegation of capabilities to `did:key:zAliceSpace` space to the user account `alice@web.mail` 

```ts!
{
  iss: "did:key:zAliceSpace",
  aud: "did:mailto:alice@web.mail",
  att: [{ with: "did:key:zAliceSpace", can: "*" }],
  exp: null,
  sig: "..."
}
```

Agent MAY account delegation to a serivce so that it is persisted and can be retrieved later with a different agent.

> Invokes `access/delegate` asking web3.storage to record delegation from `did:key:zAlice` space to the `alice@web.mail` account.

 ```ts
{
  iss: "did:mailto:alice@web.mail",
  aud: "did:dns:web3.storage",
  att: [{
    with: "did:mailto:web.mail",
    can: "access/delegate",
    nb: { ["bafy...prf1"]: {"/": "bafy...prf1"} }
  }],
  prf: [
    // proof that did:key:zAgent may represent
    // did:mailto:alice@web.mail
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
    // bafy...prf1 referenced in the delegation allowing
    // account to access space
    {
      iss: "did:key:zAliceSpace",
      aud: "did:mailto:alice@web.mail",
      att: [{ with: "did:key:zAliceSpace", can: "*" }],
      exp: null,
      sig: "..."
    }
  ],
  sig: "..."
}
```

> [Recipient validation][] requires wrapping actual delegation(s) in a `access/delegate` invocation. In the future we may hope to remove wrapping requirement.


#### delegate `with`

Field MUST be [`did:mailto`][] identifier of the account to which capabilities are been delegated.

#### delegate `nb`

Field is a set of delegation links encoded as JSON where keys are CID strings of the values.

## Claim Access

When user is [authorizing][authorization] new agent, service MAY include all the valid _(not yet expired or revoked)_ delegations with an authorization proof, which will give agent access to all of the capabilities across all the spaces.

However user may also add new delegations on one device and expect to have access to them on another device without having having to go through another email [authorization][] flow. To address this service MUST provide `access/claim` capability, which agent MAY invoke to collect (new) delegations for the account

```ts
{
 iss: "did:mailto:alice@web.mail",
 aud: "did:dns:web3.storage",
 att: [{
   with: "did:mailto:alice@web.mail",
   can: "access/claim"
 }],
 prf: [
   // proof that did:key:zAgent may represent
   // did:mailto:alice@web.mail
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
 ],
 sig: "..."
}
```


# Limitations

Using delegation from specific authority as an authorization proof limits it to the contexts in which signing authority is trusted. It is reasonable compromise when receiver of the proof and issuer is the same authority (as is the case for web3.storage).

However we wish above described account system to be useable in global context, whech we plan to accomplish by upgrading [authorization][] to use [UCAN mailto][] specification, so that email ownership could be verifiable without [email verification][] step.

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
[email verification]:#Email-Verification
[authorization]:#Authorization
[access delegation]:#Delegate-Access
