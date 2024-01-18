# Rate Limit Protocol

## Editors

- [Travis Vachon](https://github.com/travis), [Protocol Labs](https://protocol.ai/)

## Authors

- [Travis Vachon](https://github.com/travis), [Protocol Labs](https://protocol.ai/)

## Status

![reliable badge](https://img.shields.io/badge/status-reliable-green.svg?style=flat-square):

Reliable:
a spec that has been implemented ([in @web3-storage/upload-api](https://github.com/web3-storage/w3up/blob/main/packages/upload-api/src/rate-limit.js)). It will change as we learn how it works in practice.

## Abstract

Storage providers in the w3 family of protocols need to be able to rate limit (and in many cases, fully block) abusive users
from using their service. We describe a set of capabilities for tracking and administering such rate limits.

- [Capabilities](#capabilities)
  - [`rate-limit/` namespace](#rate-limit-namespace)
    - [`rate-limit/*`](#rate-limit)
    - [`rate-limit/add`](#rate-limitadd)
    - [`rate-limit/remove`](#rate-limitremove)
    - [`rate-limit/list`](#rate-limitlist)

## Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC2119](https://datatracker.ietf.org/doc/html/rfc2119).

## Capabilities

### `rate-limit/` namespace

The `rate-limit/` namespace contains capabilities relating to rate limits. It expects a resource URI identifying the service provider whose services
will be rate limited.

#### `rate-limit/*`

> Delegate all capabilities in the `rate-limit/` namespace

The `rate-limit/*` capability is the "top" capability of the `rate-limit/*` namespace. `rate-limit/*` can be delegated to a user agent, but cannot be invoked directly. Instead, it allows the agent to derive any capability in the `rate-limit/` namespace, provided the resource URI matches the one in the `rate-limit/*` capability delegation.

In other words, if an agent has a delegation for `rate-limit/*` for a given provider URI, they can invoke any capability in the `rate-limit/` namespace using that provider as the resource.

#### rate-limit/add

Given a subject ID (e.g., a`did:mailto`, a URL, a domain name, etc), set a rate limit for the entity represented by that ID. The semantics of both the subject and rate are intentionally abstract, and the service is expected to record them without much processing.

Consumers of rate limits are expected to query the underlying data store where they are stored for the subjects they care about and interpret the `rate` value in a way that makes sense for their use case.

Returns an ID that can be used to remove this limit later.

##### inputs

`subject: string`
`rate: number`

##### returns

```typescript
{
    id: string
}
```

##### errors

##### capability definition

```javascript=
export const add = capability({
  can: 'rate-limit/add',
  with: ProviderDID,
  nb: struct({
    subject: Schema.string(),
    rate: Schema.number()
  }),
  derives: (child, parent) => {
    return (
      and(equalWith(child, parent)) ||
      and(equal(child.nb.subject, parent.nb.subject, 'subject')) ||
      and(equal(child.nb.rate, parent.nb.rate, 'rate')) ||
      ok({})
    )
  },
})
```

##### Implementations

- @web3-storage/capabilities [defines `rate-limit/add` capability](https://github.com/web3-storage/w3up/blob/3244a26ac10fb76858903f5271111d350cca05e8/packages/capabilities/src/rate-limit.js#L20)
- @web3-storage/upload-api [handles `rate-limit/add` invocations](https://github.com/web3-storage/w3up/blob/3244a26ac10fb76858903f5271111d350cca05e8/packages/upload-api/src/rate-limit.js#L10)

#### rate-limit/list

Given a subject ID (e.g., a`did:mailto`, a URL, a domain name, etc), list all rate limits that apply to the given subject.

##### inputs

`subject: string`

##### returns

```typescript
{
    limits: [
        {
            id: '123',
            limit: 0
        },
        {
            id: '456',
            limit: 2
        }
    ]
}
```

##### errors

##### capability definition

```javascript=
export const remove = capability({
  can: 'rate-limit/list',
  with: ProviderDID,
  nb: struct({
    subject: Schema.string()
  }),
  derives: (child, parent) => {
    return (
      and(equalWith(child, parent)) ||
      and(equal(child.nb.subject, parent.nb.subject, 'subject')) ||
      ok({})
    )
  },
})
```

##### Implementations

- @web3-storage/capabilities [defines `rate-limit/list` capability](https://github.com/web3-storage/w3up/blob/3244a26ac10fb76858903f5271111d350cca05e8/packages/capabilities/src/rate-limit.js#L58)
- @web3-storage/upload-api [handles `rate-limit/list` invocations](https://github.com/web3-storage/w3up/blob/3244a26ac10fb76858903f5271111d350cca05e8/packages/upload-api/src/rate-limit.js#L12)

#### rate-limit/remove

Given a rate limit ID (returned from `rate-limit/add` or `rate-limit/list`), remove the identified rate limit.

##### inputs

`id: string`

##### returns

```typescript
{}
```

##### errors

`RateLimitsNotFound`

##### capability definition

```javascript=
export const remove = capability({
  can: 'rate-limit/remove',
  with: ProviderDID,
  nb: struct({
    id: Schema.string().array()
  }),
  derives: (child, parent) => {
    return (
      and(equalWith(child, parent)) ||
      and(equal(child.nb.id, parent.nb.id, 'id')) ||
      ok({})
    )
  },
})
```

##### Implementations

- @web3-storage/capabilities [defines `rate-limit/remove` capability](https://github.com/web3-storage/w3up/blob/3244a26ac10fb76858903f5271111d350cca05e8/packages/capabilities/src/rate-limit.js#L40)
- @web3-storage/upload-api [handles `rate-limit/remove` invocations](https://github.com/web3-storage/w3up/blob/3244a26ac10fb76858903f5271111d350cca05e8/packages/upload-api/src/rate-limit.js#L11)
