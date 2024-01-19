# Space

![status:reliable](https://img.shields.io/badge/status-reliable-green.svg?style=flat-square)

## Editors

- [Vasco Santos], [Protocol Labs]

## Authors

- [Vasco Santos], [Protocol Labs]

## Abstract

A Space can be defined as a namespace for stored content. It is created locally, offline, and associated with a cryptographic key pair (identified by the did:key of the public key). Afterwards, a space MAY be registered with a web3.storage [account](./w3-account.md) and [providers](./w3-provider.md) MAY be added to the space.

- [Capabilities](#capabilities)
  - [`space/info`](#spaceinfo)

## Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC2119](https://datatracker.ietf.org/doc/html/rfc2119).

## Capabilities

### `space/info`

Get information about a given space, such as registered providers.

> `did:key:zAliceAgent` invokes `space/info` capability provided by `did:web:web3.storage`

```json
{
  "iss": "did:key:zAliceAgent",
  "aud": "did:web:web3.storage",
  "att": [
    {
      "with": "did:key:zAlice",
      "can": "space/info"
    }
  ],
  "prf": [],
  "sig": "..."
}
```

#### Space Info Failure

```json
{
  "ran": "bafy...spaceInfo",
  "out": {
    "error": {
      "name": "SpaceUnknown"
    }
  }
}
```

#### Space Info Success

```json
{
  "ran": "bafy...spaceInfo",
  "out": {
    "ok": {
      "did": "did:key:zAlice",
      "providers": [
        "did:web:free.web3.storage"
      ]
    }
  }
}
```

[Protocol Labs]: https://protocol.ai/
[Vasco Santos]: https://github.com/vasco-santos
