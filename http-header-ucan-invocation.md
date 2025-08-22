# HTTP Header UCAN Invocation

## Editors

- [Alan Shaw](https://github.com/alanshaw), [Storacha](https://storacha.network/)

## Authors

- [Alan Shaw](https://github.com/alanshaw), [Storacha](https://storacha.network/)

## Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## Abstract

This is a specification for sending [Agent Messages](https://github.com/storacha/go-ucanto/blob/06a2c2d09f708014bda62aba27bb1a146ebd29eb/core/message/datamodel/agentmessage.ipldsch#L1-L8) in HTTP headers, leaving the HTTP request/response body usable for alternative purposes. Certain aspects are inspired by the [UCAN as Bearer Token Specification](https://github.com/ucan-wg/ucan-http-bearer-token).

## Introduction

Ucanto is a UCAN RPC framework where invocations can be sent to a service, executed, a receipt generated and sent back. It involves sending and receiving an [Agent Message](https://github.com/storacha/go-ucanto/blob/06a2c2d09f708014bda62aba27bb1a146ebd29eb/core/message/datamodel/agentmessage.ipldsch#L1-L8). Agent Messages MAY include multiple invocations and multiple receipts. An Agent Message _block_ is essentially two lists of links (CIDs) to invocation blocks and receipt blocks.

Ucanto provides a HTTP Transport for Agent Messages and a codec that encodes the Agent Message DAG to a CAR file and sends/receives them in the HTTP request/response body.

This poses some challenges when authorizing access to resources and returning them in the _same_ request. Returning resources in the same request implies adding them as a block in the existing Agent Message archive. Specifically, resources are problematic to place in a CAR file because:

- The CAR format requires the content hash to preceed the data, so it has to be calculated by the service before the data can be sent. This is a preformance problem for large data.
- Adding data to a CAR requires the recipient to be capable of decoding a CAR, interpreting which block contains the data and extracting that specific block.
- Existing Ucanto implementations buffer the entire contents of the CAR in memory before calling invocation handlers or returning execution responses. This would be a significant refactor in multiple languages.
- Bookkeeping becomes more difficult since protocol implementations can no longer store Agent Message archives verbatim since they may also contain resource data.

Moving invocation/receipt data into HTTP headers allows the response body to be used to serve resources. The primary use case it to enable UCAN authorized resource retrievals.

## HTTP Header

The following HTTP header MUST be included when issuing a UCAN invocation via a HTTP GET _request_:

```yaml
X-Agent-Message: <agent-message-archive>
```

In the header, `<agent-message-archive>` is a CAR file containing an [Agent Message](https://github.com/storacha/go-ucanto/blob/06a2c2d09f708014bda62aba27bb1a146ebd29eb/core/message/datamodel/agentmessage.ipldsch#L1-L8) block, as well as an invocation block, optional proof block(s) and optional receipt block(s). The CAR file bytes MUST be gzipped and multibase encoded (base64 is RECOMMENDED).

The Agent Message in _requests_ MUST contain a single invocation. Agent Messages with multiple invocations MUST fail since the response body can only be used by one invocation at a time.

The _response_ headers MUST include an `X-Agent-Message` header, which is an agent message archive that contains a receipt for the executed invocation task. They MUST also include the standard [HTTP `Vary` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Vary) that includes `X-Agent-Message`.

## Oversize Headers

When sending UCAN invocations via HTTP headers it is important to ensure the total header size does not exceed 8 KB, in order to adhere to limits imposed by popular HTTP server software.

It is RECOMMENDED that the `X-Agent-Message` _value_ does not exceed 4 KB in size.

To save space and bandwidth an agent MAY omit proofs from the invocation. Especially if making multiple requests to the service using the same proof(s).

The response headers SHOULD include a `X-UCAN-Cache-Expiry` header, set to the cache expiry time in [Unix time](https://en.wikipedia.org/wiki/Unix_time) for proofs referenced by the invocation.

If proofs are omitted in a request and are not present in the server cache, the service MUST respond with a [HTTP 510 (Not Extended)](https://www.rfc-editor.org/rfc/rfc2774#section-7) response. The response body MUST be a [DAG-JSON](https://ipld.io/docs/codecs/known/dag-json/) encoded error object that lists the missing proofs required in order to execute the invocation. It MUST comply to the following schema:

```ipldsch
type MissingProofs struct {
  name    optional String  # Typically "MissingProofs"
  message optional String  # Instructions to resubmit the invocation
  proofs  [UCANLink]       # CIDs of the proofs that were missing
}

type UCANLink = Link  # Link to a UCAN delegation
```

e.g.

```json
{
  "name": "MissingProofs",
  "message": "proofs were missing, resubmit the invocation with the requested proofs",
  "proofs": [
    { "/": "bafyreibd7iyy74awztb3chw73f6yenasubabghjb7jjgu3wjfxrysm7qv4" }
  ]
}
```

The HTTP `Content-Type` header SHOULD be set to `application/json`. Additionally a `X-UCAN-Cache-Expiry` header SHOULD be set to allow the request to be repeated with required proofs, whilst omitting proofs that were already sent.

Note: A repeat invocation MAY omit the original invocation block since it SHOULD be cached by the server.
