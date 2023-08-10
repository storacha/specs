# Rate Limit Protocol

![status:wip](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)

## Editors

- [Travis Vachon], [Protocol Labs]

## Authors

- [Travis Vachon], [Protocol Labs]

# Abstract

Storage providers in the w3 family of protocols need to be able to rate limit (and in many cases, fully block) abusive users
from using their service. We describe a set of capabilities for tracking and administering such rate limits.

- [Capabilities](#capabilities)
  - [`rate-limit/` namespace](#rate-limit-namespace)
    - [`rate-limit/*`](#rate-limit)
    - [`rate-limit/add`](#ratelimitadd)
    - [`rate-limit/remove`](#ratelimitremove)
    - [`rate-limit/list`](#ratelimitlist)

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

Given a subject ID (eg, a`did:mailto`, a URL, a domain name, etc), set a rate limit for the entity represented by that ID. The semantics of both the subject and rate are intentionally abstract, and the service is expected to record them without much processing.

Consumers of rate limits are expected to query the underlying datastore where they are stored for the subjects they care about and interpret the `rate` value in a way that makes sense for their usecase.

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

#### rate-limit/list

Given a subject ID (eg, a`did:mailto`, a URL, a domain name, etc), list all rate limits that apply to the given subject.

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