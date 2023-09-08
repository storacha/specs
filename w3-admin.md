# Admin Protocol

![status:wip](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)

## Editors

- [Travis Vachon](https://github.com/travis), [Protocol Labs](https://protocol.ai/)

## Authors

- [Travis Vachon](https://github.com/travis), [Protocol Labs](https://protocol.ai/)

# Abstract

Storage providers in the w3 family of protocols need to be able to get information about the customers, subscriptions and "consumers" (ie, spaces) 
they work with. The capabilities described in this document all act on the "service" resource (ie, `did:web:web3.storage`) and can be delegated
to administrative users by creating delegations signed with the service signer's private key.

- [Capabilities](#capabilities)
  - [`consumer/get`](#consumer-get)
  - [`customer/get`](#customer-get)
  - [`subscription/get`](#subscription-get)

## Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC2119](https://datatracker.ietf.org/doc/html/rfc2119).

## Capabilities

### consumer/get

Get information about a consumer (ie, a space).

#### inputs

`consumer: SpaceDID`

#### returns

```typescript
{
  did: SpaceDID
  allocated: number
  limit: number
  subscription: string
}
```

#### errors

`ConsumerNotFound`

#### capability definition

```javascript=
export const get = capability({
  can: 'consumer/get',
  with: ProviderDID,
  nb: struct({
    consumer: SpaceDID,
  }),
  derives: (child, parent) => {
    return (
      and(equalWith(child, parent)) ||
      and(equal(child.nb.consumer, parent.nb.consumer, 'consumer')) ||
      ok({})
    )
  },
})
```

### customer/get

Get information about a customer.

#### inputs

`customer: DID<mailto>`

#### returns

```typescript
  did: AccountDID
  subscriptions: string[]
}
```

#### errors

`CustomerNotFound`

#### capability definition

```javascript=
export const get = capability({
  can: 'customer/get',
  with: ProviderDID,
  nb: struct({
    customer: AccountDID,
  }),
  derives: (child, parent) => {
    return (
      and(equalWith(child, parent)) ||
      and(equal(child.nb.customer, parent.nb.customer, 'customer')) ||
      ok({})
    )
  },
})
```

### subscription/get

Get information about a subscription.

#### inputs

`subscription: string`

#### returns

```typescript
{
  customer: DID<mailto>
  consumer?: SpaceDID
}
```

#### errors

`SubscriptionNotFound`

#### capability definition

```javascript=
export const get = capability({
  can: 'subscription/get',
  with: ProviderDID,
  nb: struct({
    subscription: Schema.string(),
  }),
  derives: (child, parent) => {
    return (
      and(equalWith(child, parent)) ||
      and(equal(child.nb.subscription, parent.nb.subscription, 'consumer')) ||
      ok({})
    )
  },
})
```
