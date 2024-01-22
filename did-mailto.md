# did-mailto

## Editors

- [Irakli Gozalishvili](https://github.com/Gozala), [DAG House](https://dag.house/)

## Authors

- [Irakli Gozalishvili](https://github.com/Gozala), [DAG House](https://dag.house/)

## Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## Abstract

This specification describes "mailto" [DID Method] that
conforms to the core [DID-CORE] specification. The method can be used independent of any central source of truth, and is intended for bootstrapping secure interaction between two parties that can span across arbitrary number of devices. It is suitable for long sessions that need to operating under network partitions.

## Status of This Document

This document is draft of a potential specification. It has no official standing of any kind and does not represent the support or consensus of any standards organization.

## Introduction

### Overview

> This section is non-normative.

Most documentation about decentralized identifiers (DIDs) describes them as identifiers that are rooted in a public source of truth like a blockchain, a database, or similar. This publicness lets arbitrary parties resolve the DIDs to an endpoint and keys. It is an important feature for many use cases.

However, the vast majority of interactions between people, organizations, and things have simpler requirements. When Alice(Corp|Device) and Bob want to interact, there are exactly and only 2 parties in the world who should care: Alice and Bob. Instead of arbitrary parties needing to resolve their DIDs, only Alice and Bob do.

One to one interactions are excellent fit for [did:key] identifiers, however they suffer from key discovery problem and introduce additional challenges when interaction sessions span across more than two devices.

Mailto DIDs are designed to be used in conjunction with [did:key] and facilitate bootstrapping sessions between two parties that span across multiple devices.

Mailto DIDs are more accessible alternative to [did:web] and [did:dns] because a lot more people have an email address than there are people with [did:web] or [did:dns] identifier or skills to acquire one.

Mailto [did document]s are also verifiable offline, when [domain key] of the email address is known, implying significantly less network requests than with most other DIDs.

## The `did:mailto` Format

The format for the `did:key` method conforms to the [DID-CORE] specification and is encoding of the [email address]. It consists of the `did:mailto:` prefix, followed by the `domain` part of an email address, `:` character and percent encoded `local-part` of the email address.

The ABNF definition can be found below. The formal rules describing valid `domain-name` syntax are described in [RFC1035], [RFC1123], [RFC2181]. The `domain-name` and `user-name` corresponds to `domain` and `local-part` respectively of the email address described in [RFC2822]. All "mailto" DIDs MUST conform to the DID Syntax ABNF Rules.

```abnf
did       = "did:mailto:" domain-name ":" user-name
user-name = 1*idchar
idchar    = ALPHA / DIGIT / "." / "-" / "_" / pct_enc
pct_enc   = "%" HEXDIG HEXDIG
```

### EXAMPLE 1. <jsmith@example.com>

```txt
did:mailto:example.com:jsmith
```

### EXAMPLE 2. <tag+alice@web.mail>

```txt
did:mailto:web.mail:tag%2Balice
```

## Operations

The following section outlines the DID operations for the `did:mailto` method.

### Create (Register)

There is intentionally no specification for publishing `did:mailto` documents as single source of truth are not implied. Same `did:mailto` identifier MAY (intentionally) correspond to different [DID document] in different sessions.

Creating a `did:mailto` document is done by:

1. Creating a [did:key] identifier.
2. Sending an email from [DID Subject] email address with a [key authentication] message in the subject.

#### Key Authentication

Key authentication message must conform to the following ABNF definition, which refers to `did-key-format` defined in [did:key] specification

```abnf
auth = "I am also known as " did-key-format
```

##### EXAMPLE 3

```txt
I am also known as did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK
```

### Read (Resolve)

Specification intentionally does not specify how to resolve [DKIM-Signature] for the given `did:mailto` identifier as those could be arranged out of bound between participants. Optional programmatic resolution over [SMTP] could be defined in the future iterations.

The following steps MUST be executed to resolve the [DID document] from the [DKIM-Signature]:

1. Extract [key authentication] from the `subject` header.
1. Extract [did:key] from the extracted [key authentication].
1. Extract sender email address from the `from` header.
1. Resolve [DID document] from extracted [did:key].
1. Set `id` of the [DID document] to the `did:mailto` identifier of the sender email address.
1. Set `alsoKnownAs` of the document to extracted [did:key].

### Deactivate (Revoke)

Specification intentionally does not specify how to communicate [DKIM-Signature] for deactivating the DID Document.

[DID Subject] may deactivate specific [DID document] by:

1. Sending an email from [DID Subject] email address with a [key revocation] message in the subject.

#### Key Revocation

Key revocation message must conform to the following ABNF definition, which refers to `did-key-format` defined in [did:key] specification

```abnf
auth = "I revoke " did-key-format
```

##### EXAMPLE 3

```txt
I revoke did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK
```

### Update

This DID Method does not support updating the DID Document.

[did subject]: https://www.w3.org/TR/did-core/#did-subject
[did method]: https://w3c-ccg.github.io/did-spec/#specific-did-method-schemes
[did-core]: https://w3c-ccg.github.io/did-spec/
[did document]: https://www.w3.org/TR/did-core/#dfn-did-documents
[did:key]: https://w3c-ccg.github.io/did-method-key/
[did:web]: https://w3c-ccg.github.io/did-method-web/
[did:dns]: https://danubetech.github.io/did-method-dns/
[email address]: https://www.rfc-editor.org/rfc/rfc2822.html#section-3.4.1
[rfc2822]: https://www.rfc-editor.org/rfc/rfc2822.html#section-3.4.1
[rfc1035]: https://www.rfc-editor.org/rfc/rfc1035
[rfc1123]: https://www.rfc-editor.org/rfc/rfc1123
[rfc2181]: https://www.rfc-editor.org/rfc/rfc2181
[Key Authentication]: #key-authentication
[Key Revocation]: #key-revocation
[dkim-signature]: https://en.wikipedia.org/wiki/DomainKeys_Identified_Mail
[smtp]: https://en.wikipedia.org/wiki/Simple_Mail_Transfer_Protocol
[domain key]:https://en.wikipedia.org/wiki/DomainKeys_Identified_Mail
