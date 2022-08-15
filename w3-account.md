# w3-accounts

## Prelude

I would like to argue that .storage services still think about accounts in web2 terms:

1. `Account`  pretty directly correlates to the user which may be an individual or organization.
2. `User` funds the account to provide a service.

This design seems to introduce silly obstacles. For example we have notion of "Agent DID" which represents a user in some software installation (e.g. uploads-cli, webapp etc...) which user may link to their account. In turn all uploads linked to registered "Agent DID" gets funded by the account it's registered with. On the other hand we would like to identify arbitrary mutable state upload session, w3name, etc with a DID, which meansn those DIDs need to be registered with an account for so to do proper accounting.

This ends up unecessarily tangling multilpe things:

1. "Agent DID" can register other agents, however "upload session" DID should not be able to do that.
2. Even though multiple users and possibly organizations may share some data bucket DID only one can fund it's operations or multiple users would need to join accounts.


## Crowdfund Accounts

I think we can do much better if we take inspiration from [solana accounts][]. What if accounts were just "data stores" with some "cash balance" to fund the storage.

1. We could allow donating some funds to an account to increase it's balance:

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

[solana accounts]:https://docs.solana.com/developing/programming-model/accounts

[did:key]:https://w3c-ccg.github.io/did-method-key/