# Space

![status:reliable](https://img.shields.io/badge/status-reliable-green.svg?style=flat-square)

## Editors

- [Vasco Santos], [Protocol Labs]

## Authors

- [Vasco Santos], [Protocol Labs]

## Abstract

A plan specifies limits and restrictions on usage. Different plans have different limits and different price points. Accounts select a plan so that they can be billed the correct amount each period.

- [Capabilities](#capabilities)
  - [`plan/get`](#planget)
  - [`plan/set`](#planset)

## Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC2119](https://datatracker.ietf.org/doc/html/rfc2119).

## Capabilities

### `plan/get`

Capability can be invoked to get information about the plan that the account is currently signed up for.

> `did:mailto:web.mail:alice` invokes `plan/get` capability provided by `did:web:web3.storage`

```json
{
  "iss": "did:mailto:web.mail:alice",
  "aud": "did:web:web3.storage",
  "att": [
    {
      "with": "did:mailto:web.mail:alice",
      "can": "plan/get"
    }
  ],
  "prf": [],
  "sig": "..."
}
```

#### Plan Get Failure

```json
{
  "ran": "bafy...planGet",
  "out": {
    "error": {
      "name": "PlanNotFound"
    }
  }
}
```

#### Plan Get Success

```json
{
  "ran": "bafy...planGet",
  "out": {
    "ok": {
      "product": "did:web:starter.web3.storage",
      "updatedAt": "2024-01-05T06:56:26.074Z"
    }
  }
}
```

### `plan/set`

Capability can be invoked to change a billing plan of an account.

> `did:mailto:web.mail:alice` invokes `plan/set` capability provided by `did:web:web3.storage`

```json
{
  "iss": "did:mailto:web.mail:alice",
  "aud": "did:web:web3.storage",
  "att": [
    {
      "with": "did:mailto:web.mail:alice",
      "can": "plan/set",
      "nb": {
        "product": "did:web:starter.web3.storage"
      }
    }
  ],
  "prf": [],
  "sig": "..."
}
```

#### Plan Set Failure

```json
{
  "ran": "bafy...planSet",
  "out": {
    "error": {
      "name": "AccountNotFound"
    }
  }
}
```

#### Plan Set Success

```json
{
  "ran": "bafy...planSet",
  "out": {
    "ok": {}
  }
}
```
