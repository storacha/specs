# Merkle Clock

![wip](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)

## Editors

* [Alan Shaw](https://github.com/alanshaw), [DAG House](https://dag.house/)

## Authors

* [Alan Shaw](https://github.com/alanshaw), [DAG House](https://dag.house/)

## Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## Abstract

This specification describes a method of managing a [Merkle Clock](https://arxiv.org/pdf/2004.00107.pdf) of partially ordered events via UCAN invocations. Specifically, we define two capabilities:

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

### `parents`

The `parents` property of an event is an array of zero or more links to events that precede it. The parent events SHOULD be the current _head_ of the clock the event is being added to.

### `data`

The `data` property of an event is application specific data that SHOULD describe the operation that occurred, such that a total order can always be derived independently from the partial order presented by the clock DAG.

## Advancing a clock

An agent MAY invoke a `clock/advance` capability to advance the head of a merkle clock. The event block and other ancestor events MAY be sent with the invocation, to allow the recipient to advance their local clock without calling out to the IPFS network. Event blocks MUST be made available to the IPFS network to allow other participants to read and advance their clocks without receiving an explicit invocation.

A successful invocation MUST return the new head of the recipients clock. The recipient may be the target of invocations from _other_ participants so the resultant head is not necessarily the single event sent in the invocation.

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

An agent MAY invoke a `clock/head` capability to fetch the current head of the clock (the most recent event(s) as known to the clock). The invocation returns an array of CIDs to clock events.

### Example

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
