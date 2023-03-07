# UCAN Filecoin aggregations

This document describes a simple UCAN service allowing an implementor to receive an aggregate of CAR files for inclusion in a Filecoin deal.

## Capabilities

The service exposes the following invokeable capabilities:

### `aggregate/add`

```json
{
  "iss": "did:web:web3.storage",
  "aud": "did:web:spade.storage",
  "att": [{
    "with": "did:web:spade.storage",
    "can": "aggregate/add",
    "nb": {
      "aggregate": { "/": "bagy...aggregate" }
    }
  }]
}
```

Informs the service that an aggregate of CARs is ready for a Filecoin deal. Successful response implies that the aggregate has been accepted by the service to be added to a Filecoin deal.

The `nb.aggregate` value is a CAR CID that refers to a "Ferry" aggregate, a collection of `dag-cbor` blocks with format:

```json
{
  "link": { "/": "bag..." },
  "size": 110101,
  "md5": "md5...",
  "commP": { "/": "commP..." },
  "url": "https://.../bag(...).car"
}
```

### `aggregate/deals`

```json
{
  "iss": "did:web:web3.storage",
  "aud": "did:web:spade.storage",
  "att": [{
    "with": "did:web:spade.storage",
    "can": "aggregate/deals",
    "nb": {
      "aggregate": { "/": "bagy...aggregate" }
    }
  }]
}
```

Fetch the Filecoin deals made by the Spade for the passed aggregate.

## Spade proxy

Spade does not expose an endpoint for...anything right now. For MVP we could stand up a proxy API which will provide the UCAN server for receiving `aggregate/*` invocations and another HTTP server for Spade to scrape - a way to retrieve the list of aggregates ready for a deal, as per: https://hackmd.io/8IMdCQ4TRfq9OKEdmbAjHQ.

```
                       Proxy
                      ┌─────────┬──────────┐
┌──────────────┐      │         │          │
│ Spade Cron   ├─────►│         │          │
└──────────────┘      │ HTTP    │  UCAN    │      ┌─────────────┐
                      │ Endpoint│  Endpoint│◄─────┤ w3filecoin  │
┌──────────────┐      │         │          │      └─────────────┘
│ Spade Oracle │      │         │          │
└──────▲───────┘      │         │          │
       │              └─────────┴──┬───────┘
       │                           │
       └───────────────────────────┘
```

If this works out, Spade can choose to adopt or implement an equivalent API in Go (for example).
