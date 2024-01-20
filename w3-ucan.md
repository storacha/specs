# UCAN Specification Extensions

![stable](https://img.shields.io/badge/status-stable-brightgreen.svg?style=flat-square)

## Editors

- [Irakli Gozalishvili], [Protocol Labs]

## Authors

- [Irakli Gozalishvili], [Protocol Labs]

## Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC2119](https://datatracker.ietf.org/doc/html/rfc2119).

## Abstract

[UCAN] specification reserves `ucan/` ability namespace for the core functionality that may be introduced in future versions. Here we define W3 protocol extensions to the core namespace that we hope to standardize in core [UCAN] specification.

# Terminology

## Roles

There are several roles that agents in the authorization flow may assume:

| Name        | Description |
| ----------- | ----------- |
| Principal | The general class of entities that interact with a UCAN. Listed in the `iss` or `aud` field |
| Issuer | Principal sharing access. It is the signer of the [UCAN]. Listed in the `iss` field |
| Audience | Principal access is shared with. Listed in the `aud` field |

### Authority

Authority is trusted [DID] identifier. For example various subsystems may recognize and signatures from a global service authority.

Various services run by different entities MAY also recognize each others authority and choose to trust their signatures as opposed to performing verification work.

### Verifier

Subsystem that performs [UCAN] validation.

# Capabilities

## Attestation

### Motivation

[UCAN] verification process involves going through a delegation chain and verifying that every delegation has a valid signature from the private key if the issuer and that principals in the chain align. As described it has following implications:

1. Verifier MAY end up verifying same potentially long chain over and over. As an optimization they could implement caching strategy, but that may require access to some storage.
1. Invocations MAY have to send potentially long delegation chains over and over as validator MAY prune cache and may not even persist previously seen delegations.
1. Verifying delegations issued by principals other than [`did:key`] involves some, potentially expensive, [DID] document resolution. Mutable nature of [DID] document also imply that previously valid delegation chain could be rendered invalid.

### Proposal

We propose extension to the core [UCAN] specification and define `ucan/attest`
capability, that enables an [authority] to attest that linked [UCAN] delegation is valid.

This effectively allows distributing verifiable cache records to interested principals so they could include those in subsequent invocations and take advantage of optimizations they unlock.

#### Cached Verifications

For example verifier could issue an attestation for the [UCAN] chain it validated and hand it back to the caller. In subsequent calls caller could include an attestation to take advantage of more optimal execution.

#### Proof chain compaction

Just like in the above scenario except not only caller can take advantage of more optimal execution they could also transfer proof chain up to a proof they have attestation for reducing size of the payload.

#### Out of bound verification

Attestations CAN be issued as a part of authorization process. For example [UCAN]s issued by [`did:mailto`] require out of bound authorization flow in which service sends confirmation email to the user. If user confirms through a link in the email service issues an attestation declaring that [UCAN] has been verified.

### Notes on compatibility

Attestations effectively are a cache records that if provided enables certain optimizations, when not provided, correct implementation SHOULD fallback to a less optimal path.

Implementations that do not support this extension will simply disregard attestations in the proof chain as irrelevant and just under less optimal path.

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

Attestation MUST be considered valid ONLY within the [time bounds] of enclosing [UCAN]. In other words enclosing [UCAN] `nbf` and `exp` fields SHOULD be used to specify [time bounds] within which attestation is valid.

### Attestation Revocation

Attestation MUST be considered revoked if enclosing [UCAN] has been revoked. This also implies that attestation can be revoked by revoking their enclosing [UCAN]s.

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

[UCAN] specification defines [revocation record] that MUST be signed by the issuer in the delegation chain of the [UCAN] been revoked. From real world experience we find that requirement unfortunate. In plenty of cases various actors are delegated specific subset of capabilities from the supervisor to carry out their work. Supervisor MAY want give specific actor to revoke some capabilities on its behalf without giving it ability to invoke them and [revocation record] does not allow that.

### Proposal

We propose extension to the core [UCAN] specification and define `ucan/revoke`
capability, that can be invoked to revoke linked [UCAN].

By making revocation a [UCAN] itself we gain ability to delegate ability to revoke to another principal, which is desired in scenario described above.

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

The value of the `with` field MUST be the [DID] of the principal that issued the [UCAN] been revoked or some [UCAN] in its proof chain.

Revocation where [DID] in the `with` field is not an issuer of the [UCAN] or the proofs it depends on SHOULD be considered obsolete.

Implementations MAY choose to consider revocations from certain [authority] even if they are not part of the proof chain. For example service could proactively revoke [UCAN] chain when actual issuer keys are is compromised.

### Revocation Subject

The `nb.ucan` field MUST be a [link] to the [UCAN] been revoked.

### Revocation Proof

It is RECOMMENDED to set `nb.proof` field to a list of [UCAN] [link]s illustrating the path from [UCAN] been revoked to the [UCAN] issued by the [authority] (`with` field).

Implementations MAY choose to require a valid `nb.proof` to avoid storing potentially invalid revocations.

### Revocation Lifetime

It is RECOMMENDED to treat revocations permanent. Even though enclosing [UCAN] will have [time bounds] those MUST NOT be interpreted as a time frame within which revocation is active.

Enclosing [UCAN] [time-bounds] MUST be interpreted as time frame within which authorized issuer is able to exercise revocation on behalf of the [authority]. More simply it is a mechanism to limit issuers ability to perform revocation on behalf of the [authority].

### Revocation Revocation

It is RECOMMENDED to treat revocations permanent. Even though enclosing [UCAN] could be revoked it MUST NOT be interpreted as revocation of the revocation.

Enclosing [UCAN] revocation offers a mechanism to revoke authorization that [authority] MAY have given to another principal to revoke [UCAN]s on their behalf.

[UCAN]:https://github.com/ucan-wg/spec/blob/692e8aab59b763a783fe1484131c3f40d997b69a/README.md
[DID]:https://www.w3.org/TR/did-core/
[link]:https://ipld.io/docs/schemas/features/links/
[time bounds]: https://github.com/ucan-wg/spec/#322-time-bounds
[`did:mailto`]: ./did-mailto.md
[revocation record]:https://github.com/ucan-wg/spec/blob/692e8aab59b763a783fe1484131c3f40d997b69a/README.md#66-revocation
