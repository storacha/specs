# W3 Access Protocol

![stable](https://img.shields.io/badge/status-stable-brightgreen.svg?style=flat-square)

## Editors

- [Irakli Gozalishvili](https://github.com/Gozala), [DAG House](https://dag.house/)

## Authors

- [Irakli Gozalishvili](https://github.com/Gozala), [DAG House](https://dag.house/)

# Abstract

The W3 protocol governs user interactions within self-certified Public Key Infrastructure (PKI)-based namespaces. Access to these namespaces, for simplicity referred to as spaces, is authorized through delegated capabilities in [UCAN] format.

Here we define the protocol for delivering authorized delegations to their audience.

## Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC2119](https://datatracker.ietf.org/doc/html/rfc2119).

# Introduction

[Space] [access] is represented as a signed authorization in [UCAN] format. It is not enough to issue the [UCAN] authorization, the issuer needs some channel to deliver it to an audience.

We propose a protocol where an implementation can act as a delivery channel.

## Intuition

### Message Channel

At the very high level signed authorization is a message addressed to a specific recipient (audience). The implementer of this protocol represents a [message channel] allowing the sender (issuer) to send a message and allowing the recipient (audience) to receive messages sent to them.

### Shared Space

Alice has set up a space for sharing photos with her family and friends. She wants to authorize her partner Bob with write access so he can also upload photos. She wants to authorize her less tech savvy parent Mallory with just read access so she can look at photos but not add or delete them.

> In this scenario Alice delegates `upload/add` capability to Bob and `upload/list` capability to Mallory. The application used by Alice leverages the access protocol to send issued delegations to Bob and Mallory. Applications used by Bob and Mallory leverage the access protocol to receive messages sent to them, transparently gaining access to the space that Alice has shared access to.

### Multi-device Access

Alice has created a new space for storing photos on her laptop and uploaded some photos. Later she picks up her phone and logs in with her account to upload some photos to her space.

> In this scenario after the space is created the access protocol is used to delegate full authority over to Alice's [account]. Later, when Alice logs in on her phone her [account] receives delegated capabilities over the access protocol, thereby gaining access to the space.

## Serialization

[UCAN]s MUST be encoded with an [IPLD] codec. [DAG-CBOR] is RECOMMENDED.

## Concepts

### Roles

| Name   | Description |
| ------ |-------------|
| Principal | The general class of entities that interact with with a UCAN. Listed in the `iss` or `aud` field |
| Issuer | Principal sharing access. It is the signer of the [UCAN]. Listed in the `iss` field |
| Audience | Principal access is shared with. Listed in the `aud` field |

### Space

Namespace or space for short is an owned resource that can be shared. It corresponds to the asymmetric keypair and is identified by the [`did:key`] URI.

A space is always listed in the `with` field of the [UCAN] capability.

### Owner

The [owner] of the [space] is the holder of its private key. The space owner can share limited or full access to their space via a [UCAN] delegation issued by the [space] [`did:key`] and signed with the [space]'s private key.

### Access

Access is defined in terms of [UCAN] delegation, where the level of the access is denoted by the set of capabilities delegated.

#### Example in [DAG-JSON]

[Space] [owner] authorizes `did:key:zBob` _(`aud` field)_ by delegating `store/*` capabilities _(`can` field)_ for `did:key:zSpace` space _(`iss` field)_.

```json
{
  "v": "0.9.1",
  "iss": "did:key:zSpace",
  "aud": "did:key:zBob",
  "att": [
    {
      "can": "store/*"
      "with": "did:key:zSpace",
    }
  ],
  "prf": [],
  "fct": [],
  "exp": 1740357624,
   "s": {"/": {"bytes": "7aED...A0"}},
}
```

## Capabilities

### IPLD Schema

```ipldsch
type Access union {
  | AccessDelegate   "access/delegate"
  | AccessClaim      "access/claim"
  | AccessRequest    "access/request"
} representation inline {
  discriminantKey "can"
}
```

### Access Delegate

The `access/delegate` capability MAY be invoked by an authorized agent to send a set of delegations to their respective audiences.

#### Access Delegate Example

The following example illustrates `did:key:zAlice` invoking `access/delegate` capability with web3.storage, requesting it to send a delegation from [access example] to their audience.

```json
{
  "v": "0.9.1",
  "iss": "did:key:zAlice",
  "aud": "did:web:web3.storage",
  "att": [
    {
      "with": "did:key:zAlice",
      "can": "access/delegate",
      "nb": {
        "delegations": { "bafy...prf1": { "/": "bafy...prf1" } }
      }
    }
  ],
  "prf": [],
  "exp": 1705622469,
   "s": {"/": {"bytes": "7aED...A0"}},
}
```

##### Delegate IPLD Schema

```ipldsch
type AccessDelegate struct {
  with AgentDID
  nb Delegate
}

type Delegate struct {
  delegations { String: &UCAN }
}

type AgentDID = string
```

##### Delegate `with`

The `with` field MUST be set to the [`did:key`] identifying the [space] where delegations will be stored.

An implementation MAY deny a request if the specified [space] has no capacity to store the supplied [UCAN]s, or if the space does not have the `access/delegate` capability provisioned.

The protocol intentionally does not prescribe how to transfer linked [UCAN]s leaving it up to implementations.

> ⁂ [w3up] implementation REQUIRES all linked [UCAN]s be bundled in the invocation.

Please note that all the following [DID]s could be different from one another

1. Issuer of the linked delegations (in the `nb.delegation`)
1. Issuer of the invocation.
1. [Space] where delgations will be stored

In other words, a delegation MAY be sent by anyone, it does not have to be the issuer of the delegation. Sent delegation MAY be delegating capability to a resource different from the [space] where sent delegation will be stored.

##### Delegate `nb.delegations`

This field MUST be set to a set of [UCAN] [IPLD Link]s represented by an [IPLD Map]. Map keys SHOULD be their corresponding values encoded as strings.  It is RECOMMENDED to use base32 encoding.

The protocol intentionally does not specify how to transfer linked [UCAN]s leaving it up to the implementations to decide.

> ⁂ [w3up] implementation REQUIRES that all linked [UCAN]s be bundled with the invocation.

##### Delegate Receipt

The implementation MUST respond with [UCAN Receipt]. On success result MUST be a `Unit` (empty [IPLD Map]) type.

On failure, the result MUST have a `message` string field describing the error.

### Access Claim

The `access/claim` capability MAY be invoked by an authorized agent to receive the
capabilities that were delegated to the audience corresponding to the `with` field.

#### Access Claim Example

The following example illustrates `did:key:zBob` invoking `access/claim` capability with web3.storage requesting delegations where `did:key:zBob` is an audience like one in the [access example].

```json
{
  "v": "0.9.1",
  "iss": "did:key:zBob",
  "aud": "did:web:web3.storage",
  "att": [
    {
      "with": "did:key:zBob",
      "can": "access/claim",
    }
  ],
  "prf": [],
  "exp": 1705622469,
   "s": {"/": {"bytes": "7aED...A0"}},
}
```

#### Access Claim Schema

```ipldsch
type AccessClaim struct {
  with DID
}

type DID = string
```

#### Access Claim `with`

The `with` field MUST be set to the [DID] identifying the audience of the
delegations.

#### Access Claim Receipt

The implementation MUST respond with a [UCAN Receipt]. On success, the result MUST include the set of [UCAN] [IPLD Link]s represented as an [IPLD Map] where keys SHOULD be corresponding values encoded as strings.  It is RECOMMENDED to use base32 encoding for the keys.

The protocol intentionally does not specify how to transfer linked [UCAN]s leaving it up to implementations.

> ⚠️ [w3up] implementation currently is incompatible as it sends binary encoded [UCAN]s as values of the map as opposed to links.

### Access Request

The `access/request` capability MAY be invoked by a user agent / application to get access to the required capabilities.

> ⚠️ [w3up] implementation currently does not support this capability.

#### Access Request Example

User [agent] `did:key:z6Mkk...xALi` (`with` field) is requesting authorization from `alice@web.mail` [account] (`aud` field) on a [space] with following capabilities:

- `store/add` where `size` is greater or equal than `1024`.
- `store/list`
- `store/get`

```json
{
  "v": "0.9.1",
  "iss": "did:key:z6Mkk...xALi",
  "aud": "did:mailto:web.mail:alice",
  "att": [
    {
      "with": "did:key:z6Mkk...xALi",
      "can": "access/request",
      "nb": {
        "can": {
          "store/add": [
            {">=": {"size": 1024}}
          ],
          "store/list": [],
          "store/get": []
        },
      }
    }
  ],
  "prf": [],
  "exp": 1685602800,
  "s": {
    "/": {
      "bytes": "7aEDQJbJqmyMxTxcK05XQKWfvxG+Tv+LWCJeE18RSMnciCZ/RQ21U75LA0uFSvIjdqnF5RaauZTE8mh2ZYMBBejdJQ4"
    }
  }
}
```

#### Access Request Schema

```ipldsch
type AccessRequest struct {
  can   { Ability: [Clause] }
}
type Ability = string


type Clause union {
  # Logic combinators
  "not":  Clause
  "or":   Clause
  "and":  Clause
  # Predicates
  ">":    CompareClause
  "<":    CompareClause
  ">=":   CompareClause
  "<="    CompareClause
  "="     CompareClause
  "!="    CompareClause
  "like"  LikeClause
} representation keyed


type CompareClause = { Attribute: Compare }
type Compare union {
  | CompareClause       map
  | Float               float
  | Int                 int
  | String              string
  | Bytes               bytes
  | Link                link
} representation kinded


type LikeClause { Attribute: Like }
type Like union {
  | LikePattern         string
  | LikeClause          map
} representation kinded


# Similar to SQLite like pattern
# - Any except for "%" and "_" characters matches itself.
# - An underscore "_" matches any single character.
# - A percent "%" symbol matches any single character.
type LikePattern = string
```

#### Requesting Principal

The resource (`with` field) MUST be set to the [DID] of the principal requesting an authorization.

> ℹ️ It should be noted that the resource specified in the `with` field of the authorization request is NOT REQUIRED to be the same as the issuer of the request.

#### Authorizing Principal

The [audience] (`aud` field) MUST be set to the [account] [DID] from which the authorization is being requested.

> ℹ️ Implementations MAY choose to support requests from non [account] principals if they choose so.

#### Requested Capabilities

The `nb.can` field MUST be an [IPLD Map] describing requested capabilities. Keys of `nb.can` map MUST be abilities requested. Values of the `nb.can` map MUST be constraints that capability corresponding to the key SHOULD satisfy. All requested capabilities SHOULD be for the same resource [space].

### Access Authorize

![deprecated](https://img.shields.io/badge/status-deprecated-red.svg?style=flat-square)

> ⚠️ Has been deprecated in favor of [access request]

The `access/authorize` capability MAY be invoked by a user agent / application to get access to the required capabilities.

#### Access Authorize Example

```json
{
  "v": "0.9.1",
  "iss": "did:key:z6Mkk...xALi",
  "aud": "did:mailto:web.mail:alice",
  "att": [
    {
      "with": "did:key:z6Mkk...xALi",
      "can": "access/request",
      "nb": {
        "iss": "did:mailto:web.mail:alice",
        "att": [{"can": "store/add"}]
      }
    }
  ],
  "prf": [],
  "exp": 1685602800,
  "s": {
    "/": {
      "bytes": "7aEDQJb...dJQ4"
    }
  }
}
```

#### Access Authorize Schema

```ipldsch
type AccessAuthorize struct {
  iss   DID
  att   [CapabilityRequest]
}

type CapabilityRequest struct {
  can   Ability
}
type Ability = string
```

#### Authorization Requesting Principal

The resource (`with` field) MUST be set to the [DID] of the principal requesting an authorization.

#### Authorization Authorizing Principal

The [`nb.iss`] MUST be set to the [account] [DID] from which the authorization is being requested.

#### Authorization Level

The `nb.att` field MUST be an array of objects. Each object in `nb.att` field MUST
have the `can` field set to the requested ability. All requested abilities SHOULD be for
the same resource [space].

## Usage Patterns

### Access across multiple devices

Alice installs the `w3up` program and runs it the first time. The program asks what email address to use for the [account]. Alice types `alice@web.mail`. The program derives a `did:mailto:web.mail:alice` [DID] and requests authorization from it. Next the program invokes an [access claim] capability and discovers that the [account] has no [space] so it creates a new keypair and a corresponding space `did:key:zAliceSpace`, provisions it and after confirmation from Alice sets up space recovery by delegating full authority to Alice's [account]:

```json
{
  "v": "0.9.1",
  "iss": "did:key:zAliceSpace",
  "aud": "did:mailto:web.mail:alice",
  "att": [
    {
      "with": "did:key:zAliceSpace",
      "can": "*"
    }
  ],
  "prf": [],
  "exp": null,
  "s": {
    "/": {
      "bytes": "7aEDQJb...dJQ4"
    }
  }
}
```

The program invokes an [access delegate] capability with the account delegation so it can be received anywhere that Alice logs in with her account.

```json
{
  "v": "0.9.1",
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
  "prf": [{ "/": "bafy...prf1" }],
  "exp": null,
  "s": {
    "/": {
      "bytes": "7aEDQJb...dJQ4"
    }
  }
}
```

When Alice runs the `w3up` program on her other device, and logs in to her account, the program invokes an [access authorize] capability to get access on this device.

```json
{
  "v": "0.9.1",
  "iss": "did:key:zAli",
  "aud": "did:web:web3.storage",
  "att": [
    {
      "with": "did:key:zAli",
      "can": "access/authorize",
      "nb": {
        "iss": "did:mailto:web.mail:alice",
        "att": [{"can": "*"}]
      }
    }
  ],
  "prf": [],
  "exp": null,
  "s": {
    "/": {
      "bytes": "7aEDQJb...dJQ4"
    }
  }
}
```

When the invocation is received, the service sends an authorization confirmation email to `alice@web.mail`. Alice clicks the link in the email to approve the requested authorization. The service then issues an [attestation] proving that Alice has authorized requested authorization to `did:key:zAli` (an agent DID on new device).

```json
{
  "v": "0.9.1",
  "iss": "did:web:web3.storage",
  "aud": "did:key:zAli",
  "att": [
    {
      "with": "did:web:web3.storage",
      "can": "ucan/attest",
      "nb": {
        "proof": { "/": "bafy...auth" }
      }
    }
  ],
  "prf": [],
  "exp": null,
  "s": {
    "/": {
      "bytes": "7aEDQJb...dJQ4"
    }
  }
}
```

In the background, the new device polled [access claim] and once the request was authorized it received the delegation from an account along with an [attestation] from the service proving that Alice has authorized it. This allows the new device to access the [space].

### Sharing access with a friend

Alice wants to share access to her [space] with her friend Bob. She does not know if Bob has ever heard of web3.storage, but she knows his email address `bob@gmail.com` allowing her to delegate capabilities:

```json
{
  "v": "0.9.1",
  "iss": "did:key:zAliceSpace",
  "aud": "did:mailto:gmail.com:bob",
  "att": [
    {
      "with": "did:key:zAliceSpace",
      "can": "store/list"
    }
  ],
  "prf": [],
  "exp": 1685602800,
  "s": { "/": { "bytes": "7aEDQJb...dJQ4" } }
}
```

...and the [access delegate] capability allows her to send the delegation so it can be claimed by Bob.

```json
{
  "v": "0.9.1",
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
  "prf": [{ "/": "bafy...prf1" }],
  "exp": 1685602800,
  "s": { "/": { "bytes": "7aEDQJb...dJQ4" } }
}
```

When Bob runs the `w3up` agent the first time and authorizes as `bob@gmail.com`, the program invokes the [access claim] capability and collects all capabilities available to the account, including the one sent by Alice, gaining access to her space.

[`did:key`]: https://w3c-ccg.github.io/did-method-key/
[UCAN]:https://github.com/ucan-wg/spec/blob/692e8aab59b763a783fe1484131c3f40d997b69a/README.md
[UCAN Receipt]:https://github.com/ucan-wg/invocation/tree/f28f682bcb484cb515785b2a268d8a5b4cfc2b58#225-receipt
[IPLD]: https://ipld.io/
[DAG-CBOR]: https://ipld.io/specs/codecs/dag-cbor/spec/
[space]:#space
[owner]:#owner
[access]:#access
[DID]:https://www.w3.org/TR/did-core/
[DAG-JSON]:https://ipld.io/specs/codecs/dag-json/spec
[access example]:#example-in-dag-json
[w3up]:https://github.com/web3-storage/w3up
[IPLD Map]:https://ipld.io/docs/schemas/features/typekinds/#map
[IPLD Link]:https://ipld.io/docs/schemas/features/links
[message channel]:https://en.wikipedia.org/wiki/Channel_(programming)
[account]:./w3-account.md
[access delegate]:#access-delegate
[access request]:#access-request
[access claim]:#access-claim
[access authorize]:#access-authorize
[attestation]:./w3-ucan.md#attestation
