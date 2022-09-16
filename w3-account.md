# w3-accounts

![status:wip](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)
[![hackmd-github-sync-badge](https://hackmd.io/Zb7gjpLsQn2w3a3JUvnFcw/badge)](https://hackmd.io/Zb7gjpLsQn2w3a3JUvnFcw)

## Abstract

Thinking about accounts in web2 terms introduces unfortunate limitations and seem to be a poor fit for User Controlled Authorization Network ([UCAN][]).

#### Access

In web2 **account** directly correlate to a **user** (which may be an individual or an organization). In this model user logs into their account using credentials or server issued (secret) token to read/write data.

With [UCAN][] based authorization model things are different. User delegates specific **account capabilities** to their **agent** (DID), that represents them in some software installation _(e.g. w3up CLI, web3.storage website, etc...)_. Agent can excercise delegated capabilities to write/read data to/from user account.

[UCAN][]s also enable delegating **account capabilities** from one user to _another user_ agent, so they can excercise them. This powerful feature enables wide range of possibilities that are difficult to impossible in web2 model. At the same time `1:1` mapping between `account:user` no longer holds instead we end up with `n:m` mapping, where a user may have access to several accounts & and serveral users may have access to the same account.

#### Funding

In web2 direct correlation between account and user leads to the system in which users fund their accounts.

However decoupling users from the accounts _(as described in previous section)_ we can enable kinds of account funding strategies.  To do so we take inspiration from [solana accounts][] _(or many other blockchains)_ and define `Account` as a "data storage" with a "cash balance" to fund it's operation. This framing implies that:

1. Accounts can be crowdfunded _(any one can donate/send funds)_ to increase it's balance.
2. Account may be owned by a different entity from one funding it.
3. Accounts may be used for shared datasets, creating convinient ways to share things without introducing data hierarchies or [ACL][]s.


## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

### Representation

Any valid [did:key][] identifier SHOULD represent a valid w3 account. Unknown accounts MAY be treated as an account with `0` balance/capacity and MAY be denied service.

:::info
All actors in w3 are also identified by [did:key][], but most [did:key]s will not correspond to accounts _(even if according to definition they technically are)_. Differnece between agent and account DIDs is purely in semantics and while same [did:key][] could be used for both, we enourage not to as two have to deal with very different threat models.
:::

### Ownership

Account MUST represents a resource identified by the [did:key][] and is _provably_ owned by the corresponding private key holder.

Any [UCAN][] capabilty for the account resource MUST be issued by an account owner _(UCAN `iss` MUST be equal to `with` of the capability)_ or it's delegate.

This implies that [UCAN][] invocations on account resource CAN be validated by verifying:

1. Signatures & time bounds in the delegation chain.
2. That root `issuer` DID is same as `with` DID of the invoked capability.


### Creation

User _agent_ CAN create a new account by generating a [keypair][public key cryptography] and deriving a valid [did:key][] identifier from it.


It is RECOMMENDED that user facing applications create an _account_ for a new user & then delegate all of it's capabilties to a local agent _(which derived from another [non-extractable key](https://developer.mozilla.org/en-US/docs/Web/API/CryptoKey#cryptokey.extractable)pair)_, allowing agent to do anything that account itself can.


```ts
{
  iss: "did:key:zAccount",
  aud: "did:key:zAgent",
  exp: null, // delegation never expires
  // allows did:key:zAgent to do anything did:key:zAcount can
  att: [{
    with: "did:key:zAccount",
    can: "*"
  }]
}
```


:::warning
It is also RECOMMENDED that user facing applications also provide a way for a user to grant agent an account access e.g. from another agent or via some account recovery scheme.
:::


### Enrollment

Users MAY unlock service features through various vouchers. Here we will describe hypothetical `free-tier` voucher, redeeming which enables a _free tier_ funding on the account.

### Voucher protocol

The `free-tier` voucher example describes a general framework for describing various service features in terms of vouchers that can be acquired by users and then independently enrolled on desired accounts.

It is RECOMMENDED to follow outlined voucher [claiming][`voucher/claim`] / [redeeming][`voucher/redeem`] protocol even if additional or completely different [constraints](#Voucher-redeeming-constraints) are imposed for claiming / redeeming them.


#### Invoking `voucher/claim`

Users agent MAY claim `free-tier` voucher for a _verifiable identity_ from a [certified verifier][] using self-issued [`voucher/claim`][] capability invocation



```ts!
{
  iss: "did:key:zAgent",
  aud: "did:key:zVerifier",
  att: [{
    can: "voucher/claim",
    with: "did:key:zAgent",
    nb: {
      // voucher identifier
      id: "free-tier"
      // who is claiming voucher
      by: "mailto:alice@web.mail",
      
      // Specific who's voucher is been claimed
      at: "did:key:zService",
    }
  }]
}
```

##### Claimed voucher `with`

The agent MAY issue claim `with` own DID or a DID it is delegate of. If `with` is different from `iss` agent implies that it claims voucher for the account matching `with` field. If `with` is same as `iss` agent implies to claim voucher for any account.

:::warning
Please note that [certified verifier][] delegates [`voucher/redeem`][] capability to the `iss` of the corresponding [`voucher/claim`][], `with` is only used to restrict account voucher maybe redeemed on.
:::



##### Claimed voucher `id`

The agent MUST provide `nb.id` caveat with a string value corresponding to the voucher been claimed.

##### Claimed voucher `by`

The agent MUST provide `nb.by` caveat with a `mailto:` URL that corresponds to the _verifiable identity_ submitting a claim.

:::info
Please note that URLs are used so that other types of verifiable identities could be used e.g. tweet attesting that DID in `with` field has access to a specific twitter handle.
:::

##### Claimed voucher `at`

The agent MAY provide OPTIONAL `nb.at` caveat, specifing a DID of the service they wish to redeem voucher `with`.

The agent MAY omit `nb.at` either because the value is implied (e.g. by `nb.id`) or because agent wishes to claim matching vouchers for all the services.


##### Certified verifier

Certified verifier is a service that had been delegated capabilities to redeem vouchers to verified identities.

In the example below `did:key:zService` delegates `voucher/redeem` capability for a `free-tier` to `did:key:zVerifier` so it MAY redelegate it to agents with a verified `mailto:` identities. 



```ts!
{
  iss: "did:key:zService",
  aud: "did:key:zVerifier",
  att: [{
    with: "did:key:zService",
    can: "voucher/redeem",
    nb: {
      id: "free-tier",
      by: "mailto:*"
    }
  }]
}
```

#### Delegating `voucher/redeem`

Verifier MUST provide [`voucher/claim`][] capability and it MUST verify an identity it was claimed `by`. If identity is verified it MUST delegate corresponding [`voucher/redeem`][] capability.

In case of email verification verifier CAN simply send [`voucher/redeem`][] delegation to the email claim was submitted `by`.

:::info
Sending delegation is not to be taken literary. In practice user facing application may await on secure channel for delegation to be transmitted once user clicks a link embedded in emal.
:::



```ts!
{
  iss: "did:key:zVerifier",
  aud: "did:key:zAgent",
  att: [{
    can: "voucher/redeem",
    with: "did:key:zService",
    nb: {
      id: "free-tier",
      by: "mailto:alice@web.mail"
    }
  }],
  // provides delegation certifying verifier
  prf: [{
    iss: "did:key:zService",
    aud: "did:key:zVerifier",
    att: [{
      with: "did:key:zService",
      can: "voucher/redeem",
      nb: {
        id: "free-tier",
        by: "mailto:*"
      }
    }]
  }]
}
```

##### Redeem voucher `aud`

The verifier MUST delegate [`voucher/redeem`][] capability to the `aud` that is the same as `iss` of the corresponding [`voucher/claim`][] capability.

##### Redeem voucher `by`

Verifier MUST delegate [`voucher/redeem`][] capabity where `nb.by` is the same as `nb.by` of the corresponding [`voucher/claim`][].

##### Redeem voucher `id`

Verifier MUST delegate [`voucher/redeem`][] capabity where `nb.id` is the same as `nb.id` of the corresponding [`voucher/claim`][].

If verifier does not posses matching [`voucher/redeem`][] capability it MUST deny service.

Verifier MAY delegate additional [`voucher/redeem`][] capabilities e.g. if `nb.id` is interpreted as a selector.


##### Redeem voucher `with`

Verifier MUST delegate [`voucher/redeem`][] capability where `with` matches `nb.at` of the corresponding [`voucher/claim`][].

Verifier MAY selector interpretation of `nb.at` as long as:

1. Omitting `nb.at` implies match all.
2. Value `*` implies match all.
3. Valid DID implies match extact DID.


##### Redeem voucher `on`

Verifier MUST delegate [`voucher/redeem`][] capability where `nb.on` is the same as `with` of the corresponding [`voucher/claim`][] as long as it is different from it's `iss`.

Verifier MUST delegate [`voucher/redeem`][] capability omitting `nb.on` if the corresponding [`voucher/claim`][] has same `iss` and `with`.


#### Invoking `voucher/redeem`

Agent may invoke [`voucher/redeem`][] capability `on` an account to enable corresponding feature(s).

When voucher is succesfully redeemed on the account, feature described by `nb.id` MUST be enabled.


```ts!
{
  iss: "did:key:zAgent",
  aud: "did:key:zService",
  // validator provides delegates capabality to redeem
  // `free-tier` voucher with `did:key:zService`
  att: [{
    can: "voucher/redeem",
    with: "did:key:zService",
    nb: {
      id: "free-tier",
      by: "mailto:alice@web.mail"
      on: "did:key:zAccount"
    }
  }],
  // provides a proof of voucher from verifer
  prf: [{
    iss: "did:key:zVerifier",
    aud: "did:key:zAgent",
    att: [{
      can: "voucher/redeem",
      with: "did:key:zService",
      nb: {
        id: "free-tier",
        by: "mailto:alice@web.mail"
      }
    }],
    // delegate voucher to the verifier
    prf: [{
      iss: "did:key:zService",
      aud: "did:key:zVerifier",
      att: [{
        with: "did:key:zService",
        can: "voucher/redeem",
        nb: {
          id: "free-tier",
          by: "mailto:*"
        }
      }]
    }]
  }]
}
```

##### Voucher redeeming constraints

Various voucher specific constraints MAY be imposed by a service, which would vary on case to case bases.

In our example redeeming `free-tier` voucher on an account SHOULD enable _free tier_ funding of that account. However following constraints are imposed to prevent gaming system


###### voucher enables feature

If account has already redeemed `free-tier` voucher it has corresponding feature enabled. Redeeming any other `free-tier` voucher SHOULD NOT have any effect as feature is already enabled.

###### voucher can be used once

Voucher is issued per verifiable identity. In our example `free-tier` voucher is associated with an email address. If voucher with the that email address was already all other `free-tier` vouchers associated with that email address are considered same and attempt to redeem them MUST fail.


#### `voucher/redeem` without delegation

In typical flow user agent claims voucher from the verifier and than excercises it with a service

```sequence
zAgent-->zVerifier: voucher/claim
zVerifier-->zAgent: voucher/redeem
zAgent-->zService: voucher/redeem
```

However since arbitrary agent MAY redeem a voucher on an arbitrary account, that implies verifier CAN redeem claimed voucher on agents behalf removing the need for a roundtip.

```sequence
zAgent-->zVerifier: voucher/claim
zVerifier-->zService: voucher/redeem
```

Verifier MAY embed `voucher/redeem` invocation link in the verification email so that clicking it automatically enrolls desired account into _free tier_ funding.

:::warning
Verifier SHOULD NOT invoke `voucher/redeem` _(or embed such a link)_ if `iss` is the same as `with` of the corresponding [`voucher/claim`][] capability because `iss` is likely to be an agent DID as opposed to account DID
:::


### Payment protocol

#### Setup

Service MAY allow user to set up a [payment method][] for purchasing products & subscribtions through vouchers.

```ts!
{
  iss: "did:key:zAgent",
  aud: "did:key:zService",
  att: [{
    can: "account/setup-payment",
    with: "did:key:zAccount",
    nb: {
      /* symmetric key encrypted with a public
         key of the `aud` so only private key
         holder is able to decrypt */
      cypher,
      /* data is the linked CBOR block that has
         been encrypted with a symmetric key
         inside the `cypher`. We inline here for
         simplicity
      */
      data: {
        type: 'card',
        card: {
          number: '4242424242424242',
          exp_month: 9,
          exp_year: 2023,
          cvc: '314',
        }
      }
    }
  }],
  prf: [{
    iss: "did:key:zAccount",
    aud: "did:key:zAgent",
    att: [{
      can: "*",
      with: "did:key:zAccount"
    }]
  }]
}
```

If payment method is setup succesfully, service will attach a "payment method" to an account (DID in the `with`) allowing account owner or their delegate to perform purchases with it.

:::warning
Service MAY instead or additionally create out of bound payment method setup flow to avoid capturing sensitive data like card info. 
:::

#### Listing payment methods


Account owner (or it's delegate) can use self-issued `account/payment-methods` capability to [list payment methods](https://stripe.com/docs/api/payment_methods/customer_list) attached to their account:

```ts!
{
  iss: "did:key:zService",
  aud: "did:key:zAgent",
  att: [{
    can: "account/payment-methods",
    with: "did:key:zAccount",
  }]
  prf: [{
    iss: "did:key:zAccount",
    aud: "did:key:zAgent",
    att: [{
      can: "*",
      with: "did:key:zAccount"
    }]
  }]
}
```

Service will respond with a list of setup payment methods

```ts!
[
  {
    id: "pm_1LiGEZ2eZvKYlo2CJABZtqVR",
    type: "card",
    name: "",
    default: true
  }
]
```

#### Purchasing


Account owner (or it's delegate) can excercise self-issued `account/buy` capability to purchase products & subscribtions in form of vouchers.

```ts!
{
  iss: "did:key:zAgent",
  aud: "did:key:zService",
  att: [{
    can: "account/buy",
    with: "did:key:zAgent",
    nb: {
      // voucher identifier
      id: "free-tier"
      // who is claiming voucher
      by: "mailto:alice@web.mail",
    }
  }]
  prf: [{
    iss: "did:key:zAccount",
    aud: "did:key:zAgent",
    att: [{
      can: "*",
      with: "did:key:zAccount"
    }]
  }]
}
```

In the example above account is buying `free-tier` subscribtion. Structure is exactly the same as [`voucher/claim`][]. Succesful purchases delegate [`voucher/redeem`] capability back to the agent (DID in `iss` field) allowing it to enable corresponding feature on desired account.



<!--

#### `account/register`


It SHOULD be possible to activate an account by proving:

1. Intention from the account owner (or it's delagate).
2. Proof of email address ownership by the account owner (or it's delegate).

Therefor `account/activate` is a rights amilpification derived that CAN be derived from `account/register` and `email/verify` capabilities when following conditions are true:

1. `with` field of derived `account/activate` MUST be equal to `nb.as` field in provided `account/register` proof.
2. `nb.as` field of derived `account/activate` MUST be equal to `with` field in provided `account/register` proof.
3. `with` field of derived `account/activate` MUST be equal to `with` field in provided `email/verify`  proof.


:::info
Abose conditions ensure that account holder (or it's delagete) wishes to register account with a claimed email address & that they have been verified to have an access to the claimed email address. 
:::

Below example illustrates UCAN delegation chain in which arbitrary `did:key:zActor` activates `did:key:zAccount` with `alice@web.mail` email address.

```
{
  aud: "did:key:zHugo",
  att: [{
     with: "did:key:gozala",
     can: "proof/account"
  }]
}
```

account/activate  account/activate-request





```ts
{
  iss: "did:key:zActor",
  aud: "did:key:zW3",
  att:[{
    can: "account/register",
    with: "mailto:alice@web.mail",
    nb: { as: "did:key:zAccount" }
  }],
  prf: [
    // Proof that agent issuer registration request. 
    {
      iss: "did:key:zAgent",
      aud: "did:key:zActor",
      att: [{
        can: "account/register-request",
        with: "did:key:zAccount",
        nb: { as: "mailto:alice@web.mail" }
      }]
      // Proof that agent can issue registration request
      prf: [{
        iss: "did:key:zAccount",
        aud: "did:key:zAgent",
        att: [{
          can: "*", // includes `account/register-request`
          with: "did:key:zAccount",
        }]
      }]
    },
    // proof of claimed email verification
    {
      iss: "did:key:zValidator",
      aud: "did:zActor",
      att: [{
        can: "proof/",
        with: "mailto:alice@web.mail",
      }]
      // proof that validator had been granted capability
      // to perform email verification
      prf: [{
        iss: "did:key:zW3",
        aud: "did:key:zValidator",
        att: [{
          can: "email/proof",
          with: "mailto:*"
        }]
      }]
    }
  ]
}
```

_Agent_ sends UCAN invocation to the _Validator_ to obtain a proof that it can access stated email


```ts!
{
  iss: "did:key:zAgent"
  aud: "did:key:zValidator",
  att: [
      {
        can: "email/validate"
        with: "did:key:zAgent"
        nb: { email: "alice@web.mail" }
      }
  ],
  prf: [
      {
        iss: "did:key:zAgent",
        aud: "did:key:zValidator",
        att: [{
          can: "account/regsiter"
        }]
      }
  ]
}
```

_Validator_ sends a mail to the specified _email_ address with a UCAN delagation that grants _Agent_ ability to register that email: 

```ts
{
  iss: "did:key:zValidator",
  aud: "did:key:zAgent",
  att: [{
    can: "email/register",
    with: "mailto:alice@web.mail"
  }]
  // proof that validator had been granted capability
  // to perform email verification
  prf: [{
    iss: "did:key:zW3",
    aud: "did:key:zValidator",
    att: [{
      can: "email/register",
      with: "mailto:*"
    }]
  }]
}
```

Agent than can invoke account activation request to the w3 service:


```ts
{
  iss: "did:key:zAgent",
  aud: "did:key:zW3",
  /**
   * You can derive valid registeration from
   * `account/register` for an account and
   * `email/register` for an email.
   *
   * ```js
   * {
   *   can: 'account/register',
   *   with: `did+mailto:${account}+${email}`
   * }
   * ```
   */
  att:[{
    can: "account/register",
    with: "did+mailto:did:key:zAlice+alice@web.mail",
  }],
  prf: [
    // Proof that agent can register account. 
    {
      iss: "did:key:zAccount",
      aud: "did:key:zAgent",
      /**
       * Which implies
       * ```js
       * { 
       *   can: 'account/register',
       *   with: 'did:key:zAccount'
       * }
       * ```
       */
      att: [{
        can: "*",
        with: "did:key:zAccount",
      }]
    },
    // Proof that agent can register email
    {
      iss: "did:key:zValidator",
      aud: "did:zActor",
      att: [{
        can: "email/register",
        with: "mailto:alice@web.mail",
      }]
      // proof that validator had been granted capability
      // to perform email verification
      prf: [{
        iss: "did:key:zW3",
        aud: "did:key:zValidator",
        att: [{
          can: "email/register",
          with: "mailto:*"
        }]
      }]
    }
  ]
}
```

-----------
## Delegate registration to validator

Agent delegates `account/register` to the validator which can either:

1. Complete registration on agent's behalf.
2. Delegate email registration capability back to agent so it can complete registration.

```ts!
{
  iss: "did:key:zAgent"
  aud: "did:key:zValidator",
  att: [{
    can: "account/register"
    with: "did:key:zAccount"
    nb: { as: "mailto:alice@web.mail" }
  }],
  // proof that agent can act on accounts behalf
  prf: [{
    iss: "did:key:zAgent",
    aud: "did:key:zAccount",
    att: [{
      can: "*",
      with: "did:key:zAccount"
    }]
  }]
}
```

Validator creates an invocation to the service to complete registration:

```ts!
{
  iss: "did:key:zValidator"
  aud: "did:key:zW3",
  att: [{
    can: "account/register"
    with: "did+mailto:did:key:zAccount+alice@web.mail"
  }]
  prf: [
    // account/register delegated from agent to validator
    {
      iss: "did:key:zAgent"
      aud: "did:key:zValidator",
      att: [{
        can: "account/register"
        with: "did:key:zAccount"
        nb: { as: "mailto:alice@web.mail" }
      }]
      prf: [{
        iss: "did:key:zAccount",
        aud: "did:key:zAgent",
        att: [{
          can: "*",
          with: "did:key:zAccount"
        }]
      }]
    }
    // email/register delegated from service to validator
    {
        iss: "did:key:zW3",
        aud: "did:key:zValidator",
        att: [{
          can: "email/register",
          with: "mailto:*",
        }]
    }
  ]
}
```

:::danger
Only problem with delegating `account/register` to the validator is that it can use it to register with arbitrary service not just with `did:key:zW3` as user intended.
:::

Following capability definition will take care of all the necessary validations.

```ts!
const AccountRegister = capability({
  can: "account/register",
  with: URI.match({ protocol: "did:" }),
  derives: (claim, from) =>
    // Can not derive if accounts don't match
   claim.with !== from.with
     ? new Failure(`Can not derive ${claim.with} from ${from.with}`)
     // Can derive if no email caveat is *
     : from.caveats.as === "*"
     ? true
     // Can derive if no email caveat is omitted
     : from.caveats.as == null
     ? true
     // can derive if emails match
     :claim.caveats.as === from.caveats.as
     : true
     // Otherwise can not derive as emails don't match 
     : new Failure(`Can not derive ${claim.caveats.as} from ${from.caveats.as}`)
})

const EmailRegister = capability({
  can: "email/register",
  with: URI.match({ protocol: "mailto:" })
  derives: (claim, from) =>
     from.with === "mailto:*" 
     ? true
     : claim.with !== from.with
     ? new Failure(`Can not derive ${claim.with} from ${from.with}`)
     : true
})


const Register = AccountRegister.and(EmailRegister).derive({
  to: capability({
    can: "account/register",
    with: URI.match({ protocol: "did+mailto:" })
    derives: (claim, from) => true,
  }),
  derives: (register, [account, email]) => {
      const [did, mailto] = register
                              .with
                              .slice('did+mailto:'.length)
                              .split('+')
                              
     if (account.with !== did) {
       return new Failure(`Can not derive ${register.with} from ${did}`)
     }
     
     if (email.with !== mailto) {
       return new Failure(`Can not derive ${register.with} from ${mailto}`)
     }
     
     if (register.caveats.as !== mailto) {
       return new Failure(`Can not register ${mailto}, because account/register uses as: ${register.caveats.as} `)
     }
     
     return true
      
    }
})
```


-----------


_Validator_ is RECOMMENDED to also embed link in the email, clicking which would invoke `account/register` capability:

```ts
{
  iss: "did:key:zValidator",
  aud: "did:key:zW3",
  att:[{
    can: "w3/register",
    with: "did:key:zW3",
    nb: {
      email: "alice@web.mail",
      account: "did:key:zAccount"
    }
  }],
  prf: [
    // Proof that agent issuer registration request. 
    {
      iss: "did:key:zAgent",
      aud: "did:key:zValidator",
      att: [{
        can: "account/register",
        with: "did:key:zAccount",
        nb: {
          email: "alice@web.mail",
          at: "did:key:zW3"
        }
      }]
      // Proof that agent can issue registration request
      prf: [{
        iss: "did:key:zAccount",
        aud: "did:key:zAgent",
        att: [{
          can: "*", // includes `account/register-request`
          with: "did:key:zAccount"
        }]
      }]
    },
    // proof of claimed email verification
    {
        iss: "did:key:zW3",
        aud: "did:key:zValidator",
        att: [{
          can: "email/proof",
          with: "did:key:zW3",
          nb: {
            email: "*" // includes alice@web.mail
          }
        }]
    }
  ]
}
```

In most cases account activation flow has following steps:

1. User specifies email address to activate account.
2. User agent invokes `account/register` capability with supported email validator service.
3. Email validator sends delegated `email/verify` capability to the agent on the given email.
4. Email validator embeds link with `account/activate` invocation in the email.


Note that validator is able to:

1. Complete activation on user behalf because it has been delegated `account/register` capability for the account.
2. Delegate `email/verify` capability to the user agent so it could complete registation.



#### `account/subsidize`

Account owner (or an authorized delegate) could subsidize 

#### `account/upgrade-tear`

```
```

#### `account/fund`

Inspiration

```
PUT /user/payment will support

{
  // this is implemented
  "paymentMethod": { "type": "creditCard": , id": "pm_..." },
  // this ben is about to implement
  "subscription": {
    "storage": { "price": "price_id_..." }
  }
}
```

```ts!
{
  iss: "did:key:zAgent",
  aud: "did:key:zW3",
  att: [{
      with: "did:key:zAlice",
      can: "account/autopay",
      nb: {
          paymentMethod: {
            "type": "creditCard": ,
            "id": "pm_..." // string
          },
          product: "tier1"
      }
  }]
  prf: [{
      iss: "did:key:zAlice",
      adu: "did:key:zAgent",
      att: [{ can: "*", with: "did:key:zAlice"}]
  }]
}
```

```ts
interface Account {
     paymentMethods: PaymentMethod[]
    subscribtions: Subscription[]
}

account/autopay 

interface Subscription {
    payment: PaymentMethod
    product: string
}
```


w3 service allows you to setup an out of bound "payment method" which can be used to purchase products & subscribtions. 


```ts
{
  iss: "did:key:zW3",
  aud: "did:key:zAgent",
  att: [{
    can: "credit/buy"
    // URI corresponding to payment method
    with: "stripe://payment/creditCard/pm..."
  }]
}
```

This capability can be excercised for purchasing  w3 products and subscribtions. E.g. you could could 2TB storage subscribtion with it:

```ts
{
  iss: "did:key:zAgent",
  aud: "did:key:zW3",
  att: [{
      can: "credit/buy",
      with: "stripe://payment/creditCard/pm...",
      nb: {
          account: "did:key:zAlice",
          product: "2TB Subscribption"
      }
  }],
  prf:[{
      iss: "did:key:zW3",
      aud: "did:key:zAgent",
      att: [{
        can: "credit/buy"
        // URI corresponding to payment method
        with: "stripe://payment/creditCard/pm..."
      }]
    }]
}
```
-->


<!--

We could allow donating some funds to an account to increase it's balance:

    ```ts
    {
      iss: "did:key:zAlice",
      aud: "did:key:zWebStorage",
      att: [
        {
          can: "account/donate"
          with: "did:key:zAlice",
          to: "did:key:zDataStore"
          card: encrypt({
            publicKey: "did:key:zWebStorage",
            payload: JSON.stringify(cardInfo)
          })
          amount: 10 // 10USD
        }
      ]
    }
    ```
    
2. We could allow setting up an autopay for an account:

   ```ts
   {
      iss: "did:key:zAlice",
      aud: "did:key:zWebStorage",
      att: [
        {
          can: "account/autopay"
          with: "did:key:zAlice",
          card: encrypt({
            publicKey: "did:key:zWebStorage",
            payload: JSON.stringify(cardInfo)
          })
          amount: 10 // 10USD
        }
      ]
    }
   ```
   
 3. We could allow sponsoring one account from any other:


  ```ts
  {
      iss: "did:key:zAlice",
      aud: "did:key:zWebStorage",
      att: [
        {
          can: "account/sponsor"
          with: "did:key:zAlice",
          to: "did:key:zSponsored"
        }
      ]
    }
  ```




If we rethink things in this terms we untangle several things:

1. Any [did:key][] is an "account" it's just new ones (to our service) have `0` balance and can not store any data.
2. "Account registration" turns into account funding by email validation. In other words service just sponsors provided DID with some balance when you click verification email.
3. Users and apps no longer need to associate various app specific [did:key][]s with some accounts. Instead they could just fund them to store specific data. 
4. We could in the future tie DAOs and other interesting mechanisms for fundnig accounts.
5. Our accounting becomes a lot more simpler as we no longer care about users we simply care about the balance.

-->
[solana accounts]:https://docs.solana.com/developing/programming-model/accounts

[did:key]:https://w3c-ccg.github.io/did-method-key/
[UCAN]:https://github.com/ucan-wg/spec/#57-revocation
[ACL]:https://en.wikipedia.org/wiki/Access-control_list
[public key cryptography]:https://en.wikipedia.org/wiki/Public-key_cryptography

[`voucher/redeem`]:#Delegating-voucherredeem
[`voucher/claim`]:#Invoking-voucherclaim
[certified verifier]:#certified-verifier
[payment method]:https://stripe.com/docs/api/payment_methods/object