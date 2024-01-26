# Provider Protocol

![stable](https://img.shields.io/badge/status-stable-brightgreen.svg?style=flat-square)

## Editors

- [Irakli Gozalishvili](https://github.com/Gozala), [DAG House](https://dag.house/)

## Authors

- [Irakli Gozalishvili](https://github.com/Gozala), [DAG House](https://dag.house/)

# Abstract

The W3 protocol governs user interactions within self-certified Public Key Infrastructure (PKI)-based namespaces. Access control to these namespaces, for simplicity referred to as spaces, is managed through delegated capabilities in [UCAN] format.

Users can create spaces and delegate capabilities on it to various user agents without anyone's permission or intervention.

Here we introduce notion of the capability provider, or [provider] for short. [Provider] is protocol compliant capability implementation that performs a task for the invoked capability.

## Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC2119](https://datatracker.ietf.org/doc/html/rfc2119).

# Introduction

In web2, a user _(which could be an individual or an organization)_ directly correlates to a (name) space _(usually behind a walled garden)_ they're given access to. In this model, a user authenticates using credentials or a server issued (secret) authorization token to gain access to a set of capabilities with-in a bound (name) space.

> If there is a notion of sharing capabilities it's usually limited & very domain specific. Sharing across applications is extremely rare and usually involves large cross-organizational efforts.

With a [UCAN][] based authorization model, things are different. User creates a (name)space _(addressed by [did:key][] URI)_ locally and can delegate set of capabilities to an agent _(also addressed by [did:key][] URI)_ that acts on user behalf. Agent can invoke any of the delegated capabilities or (re)delegate them. This model enables a wide range of possibilities that are difficult, to impossible, in the web2 model. Capabilities form the protocol, making sharing and interop implicit in every layer of the stack. Inevitably this breaks 1 to 1 correlation between users and spaces. Each user may have access to a multitude of spaces _(that they either own or were delegated access to)_ and multiple users may have access to the same (shared) space.

> The implications of this are tremendous, we are no longer building apps behind walled gardens, but rather tap into the rich network of information with self describing protocols.

## Concepts

### Roles

There are several distinct roles that [principal]s may assume in described specification:

| Name        | Description                                                                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Principal | The general class of entities that interact with a UCAN. Listed in the `iss` or `aud` field |
| Account    | [Principal] identified by memorable identifier like [`did:mailto`]. |
| Agent       | [Principal] identified by [`did:key`] identifier, representing a user in some application installation |
| Issuer | Principal sharing access. It is the signer of the [UCAN]. Listed in the `iss` field |
| Audience | Principal access is shared with. Listed in the `aud` field |

### Provider

Provider is service implementing protocol complaint capability handlers. When [space] is provisioned with a provider, capabilities invoked on that space are routed to a corresponding capability provider.

As we have above established in the introduction, users create spaces and manage access through delegated capabilities. However, when capability `store/add` of `did:key:zAlice` [space] is invoked, some program needs to perform a task corresponding to that capability.

Programs that perform can perform such tasks in protocol compliant manner are offered by capability providers, or providers for short, through a [subscription]. Users can get a subscription from service by agreeing to their terms of service. [Subscription] can be used to provision [space] with capabilities, offered under the terms of subscription.

Capability invoked on the space is routed to the capability provider that space is provisioned with. If [space] is not provisioned with invoked capability, invocation SHOULD fail.

### Subscription

Subscription is an agreement to terms of service. Broadly speaking [customer] agree to pay metered service fee for the provided service and in return [provider] service agrees to provide set of protocol compliant capabilities.

Every [UCAN] invocation gets a signed receipt from the [provider] and can be used by the [customer] to hold service accountable if they violate terms of service.

Subscription MAY be suspended or terminated by the [provider] if [customer] violates terms of service. [Customer] MAY terminate subscription when they no longer wish to receive the service.

When subscription is established, [provider] MUST delegate `subscription/*` capabilities to the subscribed [customer]. Capabilities under `subscription/*` namespace MUST follow described protocol, allowing [customer] to manage their subscription and provision spaces with capabilities offered.

### Provision

[Customer] with an active [subscription] MAY provision [space] with set of capabilities offered by the [subscription]. [Customer] MAY set limits on the space provision to manage costs, which makes provisioning [space] controlled by third party financially viable.

[Subscription] can be conceptualized as a leasing agreement between [provider] and [customer], in which case [provision] can be viewed as subleasing agreement between [customer] and a [space].

### Customer

Customer is a user [account] that has a [subscription] with a service [provider].

ℹ️ Customer does not need to own or even have access to a [space], e.g. employer MAY setup an [account], setup [subscription] and use it to [provision] employee [space]s.

### Space

Namespace, or space for short, is an owned resource that can be shared. It corresponds to the asymmetric keypair and is identified by the [`did:key`] URI. Space can be provisioned with capabilities provided by the [provider] through a [subscription].

# Capabilities

Here we describe protocol for arranging subscriptions and using it to provision [space]s.

## Provider Capabilities

### Provider Add

User MAY invoke `provider/add` capability on the [account] subject (`with` field) to start a subscription with [provider] (`aud` field).

#### Subscription Provider

The audience of the invocation (`aud` field) MUST be a [provider] [DID] of the desired [subscription].

#### Subscription Customer

The subject of the invocation (`with` field) MUST be a [customer] [DID] of the desired [subscription].

#### Subscription Plan

Provider MAY offer multiple subscription plans. Invocation MAY specify desired plan using `nb.product` field.

#### Provider Add Example

```json
{
  "v": "0.9.1",
  "iss": "did:key:z6Mkk...xALi",
  "aud": "did:web:web3.storage",
  "att": [
    {
      "with": "did:mailto:web.mail:alice",
      "can": "provider/add",
      "nb": {
        "product": "did:web:lite.web3.storage"
      }
    }
  ],
  "prf": [{ "/": "bafy...prf1" }],
  "exp": 1685602800,
  "s": {
    "/": {
      "bytes": "7aEDQJbJqmyMxTxcK05XQKWfvxG+Tv+LWCJeE18RSMnciCZ/RQ21U75LA0uFSvIjdqnF5RaauZTE8mh2ZYMBBejdJQ4"
    }
  }
}
```

#### Provider Add IPLD Schema

```ipldsch
type ProviderAddCapability struct {
  with      AccountDID
  nb        ProviderAdd
}

type ProviderAdd struct {
  product optional String
}
```

#### Subscription State

[Provider] MUST return a variant of the `SubscriptionState` on a successful invocation of the `provider/add`.

#### Subscription State IPLD Schema

```ipldsch
type SubscriptionState union {
  PendingSubscription     "pending"
  ActiveSubscription      "active"
} representation keyed
```

#### Pending Subscription

[Provider] MUST return `PendingSubscription` variant when it requires an out-of-bound interaction to start a subscription. For example provider MAY require payment setup for the billing.

##### Pending Subscription Schema

```ipldsch
type PendingSubscription struct {
  provider      ProviderDID
  order         String
  url           URLString
}

type URLString = string
type ProviderDID = DID
```

##### Pending Subscription URL

The `url` field MUST be set to the location user is expected to navigate, to complete subscription process.

##### Pending Subscription Provider

The `provider` field MUST be set to the [DID] of the [subscription] [provider].

#### Active Subscription

[Provider] MUST return `ActiveSubscription` variant when out-of-bound interaction is not required. For example provider may offer a free plan to any [account]. Provider could return `ActiveSubscription` if it already has billing info for the [account].

##### Active Subscription Schema

```ipldsch
type ActiveSubscription struct {
  provider          ProviderDID
  product           ProductDID
  order             String
  proof             Link
}
```

##### Active Subscription Provider

The `provider` field MUST be set to the [DID] of the [subscription] [provider].

##### Active Subscription Plan

The `product` field MUST be set to the chosen subscription plan.

##### Subscription Proof

The `proof` field MUST be a link to a valid delegation for `subscription/*` capabilities. The audience (`aud` field) of the `proof` MUST be set to the [customer] of the subscription. Subject (`with` field) of the `proof` MUST be set to the [provider] of the subscription. The `nb.customer` field of the `proof` MUST be set to the [customer] of the subscription. The `nb.order` field of the `proof` MUST be set to the unique identifier of the subscription.

###### Subscription Proof Example

```json
{
  "v": "0.9.1",
  "iss": "did:web:web3.storage",
  "aud": "did:mailto:web.mail:alice",
  "att": [
    {
      "can": "subscription/*",
      "with": "did:web:web3.storage",
      "nb": {
        "customer": "did:mailto:web.mail:alice",
        "order": "bafy...prf1"
      }
    }
  ],
  "prf": [],
  "exp": 1685602800,
  "s": {
    "/": {
      "bytes": "7aEDQ..dJQ4"
    }
  }
}
```

### Provider List

User MAY invoke `provider/list` capability on the [account] subject (`with` field) to list all subscriptions it has with a [provider] (`aud` field).

#### Provider List Schema

```ipldsch
type ProviderListCapability struct {
  with      AccountDID
  nb        ProviderList
}

type struct ProviderList struct {}
```

### Provider Remove

User MAY invoke `provider/remove` capability on the [account] subject (`with` field) to cancel a subscription with [provider] (`aud` field).

#### Provider Remove Schema

```ipldsch
type ProviderRemoveCapability struct {
  with    AccountDID
  nb      ProviderRemove
}

type ProviderRemove struct {
  order optional String
}
```

## Subscription Capabilities

### Subscription Capabilities Schema

```ipldsch
type Subscription union {
  SubscriptionAddCapability       "subscription/add"
  SubscriptionRemoveCapability    "subscription/remove"
  SubscriptionListCapability      "subscription/list"
} representation inline {
  discriminantKey "can"
}
```

### Subscription Add

User MAY invoke `subscription/add` capability to provision desired [space] with the capabilities provided through subscription.

#### Subscription Add Schema

```ipldsch
type SubscriptionAddCapability struct {
  with      ProviderDID
  nb        SubscriptionAdd
}

type SubscriptionAdd struct {
  customer  AccountDID
  order     String
  consumer  SpaceDID
  budget    Budget
}

type Budget { String: Int }
```

#### Subscription Consumer

The `nb.consumer` MUST be set to the [space] DID to be provisioned.

#### Subscription Budget

The `nb.budget` MUST be set to the map where keys are names of the capacities and values are the allowed utilization per billing cycle.

> ℹ️ Adding [space] to the subscription twice only causes previous budget to be merged with the new one.

### Subscription Remove

User MAY invoke `subscription/remove` capability to remove [space] from this subscription.

#### Subscription Remove Schema

```ipldsch
type SubscriptionRemoveCapability struct {
  with      ProviderDID
  nb        SubscriptionRemove
}

type SubscriptionRemove struct {
  customer  AccountDID
  order     String
  consumer  SpaceDID
}
```

### Subscription List

Agent MAY invoke `subscription/list` capability to list provisions under this subscription.

#### Subscription List Schema

```ipldsch
type SubscriptionListCapability struct {
  with      ProviderDID
  nb        SubscriptionList
}

type SubscriptionList struct {
  customer  AccountDID
  order     String
}
```

[did:key]: https://w3c-ccg.github.io/did-method-key/
[UCAN]:https://github.com/ucan-wg/spec/blob/692e8aab59b763a783fe1484131c3f40d997b69a/README.md
[principal]:https://github.com/ucan-wg/spec/blob/
[provider]:#provider
[`did:mailto`]:./did-mailto.md
[`did:key`]:https://w3c-ccg.github.io/did-method-key/
[customer]:#customer
[account]:#account
[space]:#space
[subscription]:#subscription
[provision]:#provision
[DID]:https://www.w3.org/TR/did-core/
