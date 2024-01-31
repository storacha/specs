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

With a [UCAN][] based authorization model, things are different. A user creates a (name)space _(addressed by [did:key][] URI)_ locally and can delegate a set of capabilities to an agent _(also addressed by [did:key][] URI)_ that acts on the user's behalf. The user's software "agent" can invoke any of the delegated capabilities or (re)delegate them. This model enables a wide range of possibilities that are difficult or impossible in the web2 model. Capabilities can be assembled into a protocol, making sharing and interop implicit in every layer of the stack. Inevitably this breaks the 1 to 1 correlation between users and spaces. Each user may have access to a multitude of spaces _(that they either own or were delegated access to)_ and multiple users may have access to the same (shared) space.

> The implications of this are tremendous, we are no longer building apps behind walled gardens, but rather tap into the rich network of information with self describing protocols.

## Concepts

### Roles

There are several distinct roles that [principal]s may assume in this specification:

| Name        | Description                                                                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Principal | The general class of entities that interact with a UCAN. Identified by a DID that can be used in the `iss` or `aud` field of a UCAN. |
| Account    | A [Principal] identified by memorable identifier like [`did:mailto`]. |
| Agent       | A [Principal] identified by [`did:key`] identifier, representing a user in an application. |
| Issuer | A [principal] delegating capabilities to another [principal]. It is the signer of the [UCAN]. Specified in the `iss` field of a UCAN. |
| Audience | Principal access is shared with. Specified in the `aud` field of a UCAN. |

### Provider

A provider is service implementing protocol complaint capability handlers. When a [space] is provisioned with a provider, capabilities invoked on that space are routed to a corresponding capability provider.

As established in the introduction, users create spaces and manage access through delegated capabilities. However, when a capability (say, `store/add`) is invoked on a [space] (say, `did:key:zAlicesSpace`) is invoked, some program needs to perform a task corresponding to that capability.

Programs that perform can perform such tasks in a protocol compliant manner are offered by capability providers, or providers for short, through a [subscription]. Users can get a subscription from a service by agreeing to their terms of service. A [subscription] can be used to provision a [space] with capabilities, contingent on the terms of subscription.

A capability invoked on the space is routed to the capability provider that space is provisioned with. If a [space] is not provisioned with the invoked capability, invocation SHOULD fail.

### Subscription

A subscription is an agreement to some terms of service. Broadly speaking a [customer] agrees to pay a metered service fee for the provided service and in return the [provider] service agrees to provide a set of protocol compliant capabilities.

Every [UCAN] invocation gets a signed receipt from the [provider] and can be used by the [customer] to hold service accountable if they violate terms of service.

A subscription MAY be suspended or terminated by the [provider] if the [customer] violates the terms of service. A [customer] MAY terminate a subscription when they no longer wish to receive the service.

When a subscription is established, the [provider] MUST delegate `subscription/*` capabilities to the subscribed [customer]. Capabilities under `subscription/*` namespace MUST follow the described protocol, allowing the [customer] to manage their subscription and provision spaces with capabilities offered.

### Provision

A [customer] with an active [subscription] MAY provision a [space] with set of capabilities offered by the [subscription]. A [customer] MAY set limits on the space provision to manage costs, which makes provisioning a [space] controlled by third party financially viable.

A [subscription] can be conceptualized as a leasing agreement between a [provider] and a [customer], in which case a [provision] can be viewed as a subleasing agreement between a [customer] and a [space].

### Customer

A customer is a user [account] that has a [subscription] with a service [provider].

ℹ️ A customer does not need to own or even have access to a [space], e.g. an employer MAY setup an [account], setup a [subscription] and use it to [provision] employee [space]s.

### Space

A namespace, often referred as a "space", is an owned resource that can be shared. It corresponds to a unique asymmetric cryptographic keypair and is identified by a [`did:key`] URI. A space can be provisioned with capabilities provided by a [provider] through a [subscription].

# Capabilities

Here we describe a protocol for arranging subscriptions and using them to provision [space]s.

## Provider Capabilities

### Provider Add

A user MAY invoke the `provider/add` capability on the [account] subject (`with` field) to start a subscription with a [provider] (`aud` field).

#### Subscription Provider

The audience of the invocation (`aud` field) MUST be the [provider] [DID] of the desired [subscription].

#### Subscription Customer

The subject of the invocation (`with` field) MUST be the [customer] [DID] of the desired [subscription].

#### Subscription Plan

A provider MAY offer multiple subscription plans. An invocation MAY specify the user's desired plan using `nb.product` field.

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

A [Provider] MUST return a variant of the `SubscriptionState` on a successful invocation of the `provider/add`.

#### Subscription State IPLD Schema

```ipldsch
type SubscriptionState union {
  PendingSubscription     "pending"
  ActiveSubscription      "active"
} representation keyed
```

#### Pending Subscription

A [Provider] MUST return a `PendingSubscription` variant when it requires an out-of-bound interaction to start a subscription. For example, a provider MAY require payment setup for the billing.

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

The `url` field MUST be set to the location to which the user is expected to navigate to complete subscription process.

##### Pending Subscription Provider

The `provider` field MUST be set to the [DID] of the [subscription] [provider].

#### Active Subscription

A [Provider] MUST return an `ActiveSubscription` variant when out-of-bound interaction is not required. For example, a provider may offer a free plan to any [account]. The provider could return `ActiveSubscription` if it already has billing info for the [account].

##### Active Subscription Schema

```ipldsch
type ActiveSubscription struct {
  provider          ProviderDID
  product           URL
  order             String
  proof             Link
}
```

##### Active Subscription Provider

The `provider` field MUST be set to the [DID] of the [subscription] [provider].

##### Active Subscription Plan

The `product` field MUST be set to the chosen subscription plan.

##### Subscription Proof

The `proof` field of the `provider/add` invocation MUST be a link to a valid delegation of `subscription/*` capabilities. 

The audience (`aud` field) of the delegation (the `proof`) MUST be set to the [customer] of the subscription. The subject (`with` field) of the `proof` MUST be set to the [provider] of the subscription. The `nb.customer` field of the `proof` MUST be set to the [customer] of the subscription. The `nb.order` field of the `proof` MUST be set to the unique identifier of the subscription.

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

A user MAY invoke the `provider/list` capability on the [account] subject (`with` field) to list all subscriptions it has with a [provider] (`aud` field).

#### Provider List Schema

```ipldsch
type ProviderListCapability struct {
  with      AccountDID
  nb        ProviderList
}

type struct ProviderList struct {}
```

### Provider Remove

A user MAY invoke the `provider/remove` capability on the [account] subject (`with` field) to cancel a subscription with [provider] (`aud` field).

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

A user MAY invoke the `subscription/add` capability to provision desired [space] with the capabilities provided through the subscription.

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

> ℹ️ Adding a [space] to a subscription twice only causes previous budget to be merged with the new one.

### Subscription Remove

A user MAY invoke the `subscription/remove` capability to remove a [space] from this subscription.

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

An agent MAY invoke the `subscription/list` capability to list provisions under this subscription.

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
[principal]:https://github.com/ucan-wg/spec/blob/692e8aab59b763a783fe1484131c3f40d997b69a/README.md#321-principals
[provider]:#provider
[`did:mailto`]:./did-mailto.md
[`did:key`]:https://w3c-ccg.github.io/did-method-key/
[customer]:#customer
[account]:#account
[space]:#space
[subscription]:#subscription
[provision]:#provision
[DID]:https://www.w3.org/TR/did-core/
