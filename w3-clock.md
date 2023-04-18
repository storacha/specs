# Merkle Clock

![wip](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)

## Editors

* [Alan Shaw](https://github.com/alanshaw), [DAG House](https://dag.house/)

## Authors

* [Alan Shaw](https://github.com/alanshaw), [DAG House](https://dag.house/)

## Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## Abstract

This specification describes a method of managing a [Merkle Clock](https://arxiv.org/pdf/2004.00107.pdf) via UCAN invocations. Specifically, we cover two capabilities:

1. Advancing a clock by adding a new event.
2. Fetching the current head of the clock (the most recent event(s) as known to the clock).

## Data Format

The data format of a Merkle Clock event:

IPLD Schema

```ipldsch
type Event struct {
  parents [&Event]
  data &Data
}

type Data = Any
```

## Advancing a clock

An agent may invoke a `clock/advance` capability to advance the head of a merkle clock.

### Example

```js
{
  "iss": "did:key:zAlice",
  "aud": "did:web:clock.web3.storage",
  "att": [
    {
      "with": "did:key:zClock",
      "can": "clock/advance",
      "nb": {
        "event": { "/": "bafkrei..." } // CID to a clock event
      }
    }
  ],
  "prf": [],
  "sig": "..."
}
```

## Fetching the clock head

An agent may invoke a `clock/head` capability to fetch the current head of the clock (the most recent event(s) as known to the clock).

```js
{
  "iss": "did:key:zAlice",
  "aud": "did:web:clock.web3.storage",
  "att": [
    {
      "with": "did:key:zClock",
      "can": "clock/head"
    }
  ],
  "prf": [],
  "sig": "..."
}
```

The invocation returns an array of CIDs to clock events.
