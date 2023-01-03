# Publicly verifiable timestamps for UCANs with Drand

![](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)

## Editors

- [Alan Shaw](https://github.com/alanshaw), [DAG House](https://dag.house/)

## Authors

- [Alan Shaw](https://github.com/alanshaw), [DAG House](https://dag.house/)

# Abstract

Being able to verify that a UCAN invocation happened within a time window gives us some assurances.

Enabling public verification that a UCAN was created on or after a specific time also allows services to be open and transparent.

[Drand](https://drand.love/) is a distributed randomness beacon. Drand nodes produce collective, publicly verifiable, unbiased, unpredictable random values at fixed intervals using bilinear pairings and threshold cryptography.

By including a drand randomness round in a signed UCAN, anyone can prove that it was created _on_ or _after_ that randomness round was generated. There’s a number of uses for this, an example is allowing the web3.storage service to account for `store/add` invocations, publicly proving that we were asked to store data within a given time frame.

Services may choose to reject UCANs with timestamps that do not correspond to a recent randomness round. In this case it's reasonable to assume that the UCAN was _probably_ not generated long after the included randomness round. There is no incentive to do so if it is likely to be rejected on receipt.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

1. Issuers **must** include a drand randomness round in UCAN [`nnc`](https://github.com/ucan-wg/spec#323-nonce) field.
1. Issuers **may** include the "chain hash" of the drand randomness chain in the [`nb`](https://github.com/ucan-wg/spec#241-nb-non-normative-fields) field. The chain hash uniquely identifies the drand chain the randomness value was taken from, if it is different from the mainnet chain operated by the League of Entropy. If omitted, it is assumed to be `8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce`.
1. Audiences **may** reject a received UCAN if the randomness of the current/recent round does not match the randomness included in the UCAN.
