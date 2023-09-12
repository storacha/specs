# Admin Protocol

![status:wip](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)

## Editors

- [Travis Vachon](https://github.com/travis), [Protocol Labs](https://protocol.ai/)

## Authors

- [Travis Vachon](https://github.com/travis), [Protocol Labs](https://protocol.ai/)

# Abstract

Storage providers in the w3 family of protocols need to be able to get information about the customers, subscriptions and "consumers" (i.e., spaces)
they work with. The capabilities described in this document all act on the "service" resource (i.e., `did:web:web3.storage`) and can be delegated
to administrative users by creating delegations signed with the service signer's private key.

- [Capabilities](#capabilities)
  - [`consumer/get`](#consumerget)
  - [`customer/get`](#customerget)
  - [`subscription/get`](#subscriptionget)
  - [`trace/upload/add`](#traceuploadadd)
  - [`trace/store/add`](#tracestoreadd)

## Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC2119](https://datatracker.ietf.org/doc/html/rfc2119).

## Capabilities

### `consumer/get`

Get information about a consumer (i.e., a space).

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

```javascript
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

### `customer/get`

Get information about a customer.

#### inputs

`customer: DID<mailto>`

#### returns

```typescript
{
  did: AccountDID
  subscriptions: string[]
}
```

#### errors

`CustomerNotFound`

#### capability definition

```javascript
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

### `subscription/get`

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

```javascript
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

### `trace/upload/add`

Get information about a content CID. This does not return the actual data identified by the CID, just metadata our
system tracks, e.g. the spaces the content identified by a given CID has been uploaded to and the dates the uploads happened.

#### inputs

`root: CID`

#### returns

The `uploads` property will be a list of spaces the given root CID's content has been uploaded to, along
with the date it was uploaded.

```typescript
{
  uploads: Array<{space: SpaceDID, insertedAt: Date}>
}
```

### `trace/store/add`

Get information about a shard (i.e., a CAR that contains part of an upload) CID. This
does not return the actual data identified by the CID, just metadata our system tracks,
e.g. the spaces the CAR identified by a given CID has been stored in and the date it was stored.

#### inputs

`link: CID`

#### returns

The `stores` property will be a list of spaces the specified shard was stored in, along with the date on
which it was stored.

```typescript
{
  stores: Array<{space: SpaceDID, insertedAt: Date}>
}
```