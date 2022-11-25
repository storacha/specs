# w3-account

In web3.storage account is a convenience for aggregating capabilities across various user spaces under same identity in order to simplify recovery and authorization flows.

Users are not required to set up yet another account, instead they could use associate their spaces with their email account for simple authorization flows.

> In the future we plan to simplify this even further by adopting [UCAN mailto][] identifiers.

User CAN delegate full access to a space to their email account using delegation like shown below

> Delegates all capabilities for `did:key:zAlice` space to the `alice@web.mail` account.

 ```ts
{
  iss: "did:key:zAgent",
  aud: "did:dns:web3.storage",
  att: [{
    with: "did:key:zAgent",
    can: "access/delegate",
    nb: {
      access: Link<{
        iss: "did:key:zAlice",
        aud: "did:mailto:alice@web.mail",
        att: [{ with: "did:key:zAlice", can: "*" }],
        exp: null,
        sig: "..."
      }>
     }
    }
  }],
  sig: "..."
}
```
 
## Authorization

User may authorize agent(s) by delegating set of capabilities to it. Maintaining delegations across multiple spaces, agents and devices can get complicated. To keep things simple users may delegate capabilities from all the spaces to their [`did:mailto`][] identifier. When users wishes to claim delegated capabilities, they can obtain delegation from the service allowing local agent to act as [`did:mailto`][] identifier after performing email verification.

> Example below illustrates agent invoking `ucan/sign` capability in order to get authorization from a service to act as `did:mailto:alice@web.mail`.

```ts
{
  iss: "did:key:zAgent",
  aud: "did:dns:web3.storage",
  att: [{
    with: "did:key:zAgent",
	  can: "ucan/sign",
	  nb: { as: "did:mailto:alice@web.mail" }
	}]
}
```

Service will send delegation to an email address with a verification link. When link is clicked `ucan/sign` capability will be delegated to a requested resource.

> This delegation authorizes `did:key:zAgent` to identify as `did:mailto:alice@web.mail`.

```ts
{
  iss: "did:dns:web3.storage",
  aud: "did:mailto:alice@web.mail",
  att: [{
	  with: "did:dns:web3.storage",
    can: "ucan/sign",
    nb: { as: "did:key:zAgent" }
  }],
  exp: null
  sig: "..."
}
```

Above delegation could be added to `prf` field of the UCAN allowing `did:key:zAgent` to sign on behalf of `did:mailto:alice@web.mail` principal.

```ts
{
  iss: "did:mailto:alice@web.mail",
  aud: "did:dns:web3.storage",
  att: [{
	  with: "did:mailto:alice@web.mail",
    can: "access/list"
  }],
  prf: [{
    iss: "did:dns:web3.storage",
    aud: "did:mailto:alice@web.mail",
	  att: [{
		  with: "did:dns:web3.storage",
	    can: "ucan/sign",
	    nb: { as: "did:key:zAgent" }
	  }],
	  exp: null
	  sig: "..."
  }]
}
```


Any set of capabilities that were delegated to `did:mailto:alice@web.mail` could be (re)delegated to a local agent:

```ts
{
  iss: "did:mailto:alice@web.mail",
  aud: "did:key:zNewAgent",
  att: [{ with: "did:key:zAlice", can: "*" }],
  prf: [
	  // Proof that did:key:zAgent could sign UCANs issued
	  // by did:mailto:alice@web.mail
	  {
	    iss: "did:dns:web3.storage",
	    aud: "did:mailto:alice@web.mail",
		  att: [{
			  with: "did:dns:web3.storage",
		    can: "ucan/sign",
		    nb: { as: "did:key:zAgent" }
		  }],
		  exp: null
		  sig: "..."
	  },
	  // Proof that did:mailto:alice@web.mail has been delegated
	  // capability for did:key:zAlice
	  {
	    iss: "did:key:zAlice",
	    aud: "did:mailto:alice@web.mail",
	    att: [{ with: "did:key:zAlice", can: "*" }],
	    exp: null,
	    sig: "..."
	  }
  ]
}
```

### Future plans

Using delegation from `did:dns:web3.storage` as proof that `did:key:zAgent` can sign UCANs as `did:mailto:alice@web.mail` is not ideal, however in the context where `did:dns:web3.storage` is an `aud` it is a reasonable compromise.

Long term we would like to upgrade this to using UCAN mailto instead so that account authorization is universal across various services.

### Free provider

web3.storage offers one "free provider" per account. Free provider will be denied if `consumer` space is not specified or if it already has free provider. Please note that adding "free provider" to the space is more than once has no effect (even when it was obtained by different accounts) because space has set of providers, so provider is either part of the set or not.

[UCAN mailto]:https://github.com/ucan-wg/ucan-mailto/
[`did:mailto`]:https://github.com/ucan-wg/did-mailto/