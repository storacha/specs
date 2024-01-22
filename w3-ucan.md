# UCAN Specification Extensions

![stable](https://img.shields.io/badge/status-stable-brightgreen.svg?style=flat-square)

## Editors

- [Irakli Gozalishvili], [Protocol Labs]

## Authors

- [Irakli Gozalishvili], [Protocol Labs]

## Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC2119](https://datatracker.ietf.org/doc/html/rfc2119).

## Abstract

The [UCAN] specification reserves the `ucan/` ability namespace for the core functionality that may be introduced in future versions. Here we define W3 protocol extensions to the core namespace that we hope to standardize in core [UCAN] specification.

# Terminology

## Roles

There are several roles that agents in the authorization flow may assume:

| Name        | Description |
| ----------- | ----------- |
| Principal | The general class of entities that interact with a UCAN. Listed in the `iss` or `aud` field |
| Issuer | Principal sharing access. It is the signer of the [UCAN]. Listed in the `iss` field |
| Audience | Principal access is shared with. Listed in the `aud` field |

### Authority

Authority is trusted [DID] identifier. For example various subsystems may recognize signatures from a global service authority.

Various services run by different entities MAY also recognize each others authority and choose to trust their signatures as opposed to performing verification work.

### Verifier

Subsystem that performs [UCAN] validation.

# Capabilities

## Attestation

### Motivation

The [UCAN] verification process involves going through a delegation chain and verifying that every delegation has a valid signature from the private key of the issuer and that the principals in the chain align. As described it has the following implications:

1. Verifier MAY end up verifying same potentially long chain over and over. As an optimization they could implement caching strategy, but that may require access to some storage.
1. Invocations MAY have to send potentially long delegation chains over and over as validator MAY prune cache and may not even persist previously seen delegations.
1. Verifying delegations issued by principals other than [`did:key`] involves some, potentially expensive, [DID] document resolution. Mutable nature of [DID] document also imply that previously valid delegation chain could be rendered invalid.

### Proposal

We propose an extension to the core [UCAN] specification and define a `ucan/attest`
capability, that enables an [authority] to attest that a linked [UCAN] delegation is valid.

This effectively allows distributing verifiable cache records to interested principals so they can include those in subsequent invocations and take advantage of the optimizations they unlock.

#### Cached Verification

For example, a verifier could issue an attestation for the [UCAN] chain it validated and hand it back to the caller. In subsequent calls the caller could include an attestation to take advantage of more optimal execution.

#### Proof chain compaction

Just like in the above scenario except not only can a caller take advantage of more optimal execution, they can also transfer a proof chain up to a proof they have an attestation for, thereby reducing the size of the payload.

#### Out of bound verification

Attestations CAN be issued as a part of authorization process. For example [UCAN]s issued by [`did:mailto`] require out of bound authorization flow in which a service sends a confirmation email to the user. If the user confirms through a link in the email, the service issues an attestation declaring that the [UCAN] has been verified.

### Notes on compatibility

Attestations are effectively cached records that, if provided, enable certain optimizations. When not provided, correct implementations SHOULD fallback to a less optimal path.

Implementations that do not support this extension will simply disregard attestations in the proof chain as irrelevant and just take a less optimal path.

### IPLD Schema

```ipldsch
type UCAN union {
  | Attest    "ucan/attest"
} representation inline {
  discriminantKey "can"
}

type Attest struct {
  with          Authority
  nb            Attestation
}

type Attestation struct {
  proof        &UCAN
}
```

### Attestation Authority

The value of the `with` field MUST be the DID of the [authority], indicating that ONLY [authority] authorized principals are able to issue attestations on behalf of the [authority].

### Attestation Subject

The `nb.proof` field MUST be a [link] to the [UCAN] delegation covered by the attestation.

### Attestation Lifetime

The attestation MUST be considered valid ONLY within the [time bounds] of the enclosing [UCAN]. In other words the enclosing [UCAN]'s `nbf` and `exp` fields SHOULD be used to specify [time bounds] within which the attestation is valid.

### Attestation Revocation

The attestation MUST be considered revoked if the enclosing [UCAN] has been revoked. This also implies that the attestation can be revoked by revoking its enclosing [UCAN]s.

### Attestation Example in DAG-JSON

```json
{
  "v": "0.9.1",
  "iss": "did:web:web3.storage",
  "aud": "did:key:z6Mkk89bC3JrVqKie71YEcc5M1SMVxuCgNx6zLZ8SYJsxALi",
  "att": [
    {
      "with": "did:web:web3.storage",
      "can": "ucan/attest",
      "nb": {
        "proof": {
          "/": "bafyreifer23oxeyamllbmrfkkyvcqpujevuediffrpvrxmgn736f4fffui"
        }
      },
    }
  ],
  "exp": null,
  "s": {
    "/": {
      "bytes": "7aEDQBj34uAed7Mup+aVCTKuUtcKWwJtzMZ5yPA6tptMrcRrbE3o7uHKG/wBqF+OKJYGY7epQOV+OUuzseZvXuJN2QI"
    }
  }
}
```

## Revocation

### Motivation

[UCAN] specification defines [revocation record] that MUST be signed by the issuer in the delegation chain of the [UCAN] been revoked. From real world experience we find this requirement problematic, it is common to have a primary authority that delegates subset of their capability to various actors based on their role. In such setup it is often desired to have auditors that can revoke capabilities from misbehaving actors without been in the delegation chain.

In other words it is desired to have ability to grant revocation power to some actor without granting them invocation power.

### Proposal

We propose extension to the core [UCAN] specification and define `ucan/revoke`
capability, that can be invoked to revoke a linked [UCAN].

By making revocation a [UCAN] itself we allow delegating the ability to revoke to another principal, which is desired in scenario described above.

### IPLD Schema

```ipldsch
type UCAN union {
  | Revoke    "ucan/revoke"
} representation inline {
  discriminantKey "can"
}

type Revoke struct {
  with          Authority
  nb            Revocation
}

type Revocation struct {
  ucan        &UCAN
  proof       &UCAN[]
}
```

### Revocation Authority

The value of the `with` field MUST be the [DID] of the principal that issued the [UCAN] being revoked or some [UCAN] in its proof chain.

Revocation where [DID] in the `with` field is not an issuer of the [UCAN] or the proofs it depends on SHOULD be considered obsolete.

Implementations MAY choose to consider revocations from a certain [authority] even if they are not part of the proof chain. For example service could proactively revoke [UCAN] chain when an issuer's keys are compromised.

### Revocation Subject

The `nb.ucan` field MUST be a [link] to the [UCAN] being revoked.

### Revocation Proof

It is RECOMMENDED to set `nb.proof` field to a list of [UCAN] [link]s illustrating the path from [UCAN] been revoked to the [UCAN] issued by the [authority] (`with` field).

Implementations MAY choose to require a valid `nb.proof` to avoid storing potentially invalid revocations.

### Revocation Lifetime

It is RECOMMENDED to treat revocations as permanent. Even though enclosing [UCAN] will have [time bounds] those MUST NOT be interpreted as a time frame within which the revocation is active.

Enclosing [UCAN] [time-bounds] MUST be interpreted as the time frame within which an authorized issuer is able to exercise revocation on behalf of the [authority]. More simply it is a mechanism to limit an issuers ability to perform revocation on behalf of the [authority].

[UCAN]:https://github.com/ucan-wg/spec/blob/692e8aab59b763a783fe1484131c3f40d997b69a/README.md
[DID]:https://www.w3.org/TR/did-core/
[link]:https://ipld.io/docs/schemas/features/links/
[time bounds]: https://github.com/ucan-wg/spec/#322-time-bounds
[`did:mailto`]: ./did-mailto.md
[revocation record]:https://github.com/ucan-wg/spec/blob/692e8aab59b763a783fe1484131c3f40d997b69a/README.md#66-revocation
[authority]:#authority
[Protocol Labs]:https://protocol.ai/
[Irakli Gozalishvili]:https://github.com/Gozala
