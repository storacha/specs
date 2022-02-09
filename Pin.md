# ⚠️ Disclaimer ⚠️

> Since writing this I have realized that while incermental writing approach described here would work well in centralized system (single writer) it will be problematic in decentralized system where multiple actors may be doing concurrent updates e.g. if  web3 application uses web3.storage service from multiple clients they would fail to transact or will have to coordinate updates (version & index).
>
> I think we could do better by using grow-only sets when patching the pin object and only coordinate pin update between `Pinned` states. That way `Transient` pins could be updated concurrently without coordination & only coordinate updates on `Pinned` pins. 

# Pins

Following is an IPLD Schema representation of the "pin" objects (or whatever we want to call it) which:

1. Can be in "tranisent" or "pinned" state
    - To allow incermental updates through series of transactions.
    - To have `tranisent` representation series of between udates.
3. Are identified by an [ed25519][] public key. Therefor they can represent
    - IPNS names
    - [did:key][] identifiers
    - Actors in [UCAN][] authorization


This design would address several problems in .storage services:

### Large uploads

Large uploads that span multiple CAR files would gain a first class representation. Client application will be able to self issue new "pin" identifier and through incremental transactions amend it's state by uploading DAG shards via CAR files. Each transaction would amend `Pin` object with additional DAG shard head(s) followed by a final trasaction changing `Pin` from `Transient` state to `Pinned` state pointing to
a desired DAG root cid (that was provided in one of the transaction).

This way would allow .storage service to list not only succesful, but also "in progress" uploads (pins). Additional metadata could also be used to provide domain specific information about the status. E.g. applications built on top of web3.storage could utilize this to provide human readable description along with domain specific status `code`.


### IPNS

.storage services could directly map pins to corresponding IPNS names, making it possible to access arbitrary uploads / pins through an IPNS resoultion.

Pin status could be used to decide when to propagate pin updates through the network e.g. sevice could choose to only announce only pinned states.

### did:key

.storage service could also provide interface for accessing content under `did:key` that correspond to a given keys. Basically we can build IPNS like system except with delegated publishing through UCANs before integrating that into IPNS.

### UCAN

By representing pins as first class objects identified by `did:key` they become actors in UCANs delegated capabilties system.

.storage user could issue delegated token for specific `Pin` object and excercise that capability to update given `Pin` object or delegate that capability to another actor in the system.


## Schema

Following is an IPLD schema definition for the `Pin` object. 

> 💭 One one hand we would like to specify enough structure to be able to make sense of it in applications (be it .storage or it's clients), but on the other hand boxing actual DAG just to give it a "status" info seems awkward.


```ipldsch
-- Pin represents (IPNS) named pointer to a DAG that
-- is either in "transient" state that is partially
-- or fully "pinned" state. In both cases it is
-- anotated pointer to DAG head(s).
type Pin union {
    Transient "transient"
    Pinned "pinned"
} representation inline {
  discriminantKey "status"
}

-- Represents partially pinned DAG. Think of it as
-- dirty tree in the git, head points to previous
-- revision.
-- Please note: Even though pin links to a previous
-- revision of the pin there is does not imply it is
-- pinned (you would need to include that link in the
-- index for that)
type Transient struct {
  -- Link to a previous pin revision in "pinned" state
  head &Pinned
  -- Set of DAG roots that next pinned state will be
  -- comprised of.
  -- Please note that providing blocks under DAG
  -- happens out of band meaning that DAG under the
  -- link could be partial.
  links [Link]
}

-- Represents fully pinned DAG with some metadata.
-- Please note that fully pinned DAG does not imply
-- that full DAG is pinned, but rather provided
-- subdag
type Pinned struct {
    -- Root representing current state of the pin.
    root Link
    -- Previous version of this pin (not sure what
    -- would genesis block pint to maybe we need
    -- a special genesis variant of "Pin" union)
    head &Pinned
    -- We have links to all the relevant sub-DAGs
    -- because `root` may not be traversable e.g
    -- if it is encrypted. By providing links service
    -- can traverse it and pin all the relevant blocks
    -- even when it can't make sense of them.
    links [Link]
}
```

### Pin Update Protocol

General idea is that clients on the network could submit `Transactions` to perform `Pin` updates. Following is the IPLD schema for the transaction.

> 🤔 Transaction and Pin are structurally almost identical, I wonder if it would make sense to make them actually identically. That way we could have `PUT` / `PATCH` operations where first replaces former value with new one and later patches it. 

```ipldsch
type Transaction union {
    Patch "patch"
    Commit "commit"
} representation inline {
  discriminantKey "type"
}

-- When "Patch" transaction is received, service 
-- performs following steps:
-- 1. Verify that current pin head corresponds to
--    provided head (if pin is in transient state it
--    checks it checks against it's head). If provided
--    head points to older revision (heads form the
--    merkle clock) it should deny transaction. If
--    provided head is newer revision (than known to
--    service) state of the pin on service is out of
--    date and it still refuses transaction as it is
--    unable to process it yet.
-- 2. If pin is in "pinned" state transitions pin to
--    "transient" state in which `head` & `links` match
--    what was provided.
--    If pin is in "tranisent" state update it's `links`
--    to union of the provided links and pin state
--    links. 
--
-- Note that service may or may not publish IPNS
-- record after processing "Patch" transaction.
type Patch {
  -- Pin identifier that is it's public key
  pin ID
  -- pointer to the head this pin.
  head &Pinned
  -- Set of links to be included in the next
  -- revision of the pin.
  links [Link]
  -- This would link to IPLD representation of
  -- the UCAN (wich "patch" capability) in which
  -- outermost audience is service ID this patch was
  -- send to and innermost issuer is the pin ID.
  -- This would allow pinning service to publish a
  -- new IPNS record (assuming we add support for
  -- UCANs in IPNS).
  -- Note: service needs to generate IPNS record
  -- update based on it's pin state which may be
  -- different from the one submitted by a client.
  proof &UCAN
}

-- When "Commit" transaction is recieved service
-- perform same steps as with "Patch". Main
-- difference is that after processing this
-- transaction Pin will transition to Pinned
-- state. If pin was in Pinned state new state
-- will contain only provided links, otherwise
-- it will contain union of provided links and links
-- in the current state.
--
-- General expectation is that service will update IPNS
-- record after processing "commit" transaction.
type Commit {
  -- Pin identifier that is it's public key
  pin ID
  -- pointer to the head of the pin.
  head &Pinned
  -- The root of the DAG for a new revisions
  -- it is implicitly implied to be in the links.
  root Link
  -- Set of links to be included in the next
  -- revision of the pin.
  links [Link]
  -- This would link to the IPLD representation of
  -- the UCAN (with "commit" capability) in which 
  -- outermost audience is service ID and innermost
  -- issuer is pin ID. That way service can verify that
  -- commit is warranted and generate own IPNS update
  -- record given it's current state.
  proof &UCAN
}



-- Binary representation of the ed25519 public key
type ID = Bytes
-- TODO: Define actual structure
type UCAN = Link
```

In the .storage setting it is expected that client will:

1. Provide CAR encoded DAG shard(s) + (non empty) set `Transaction` blocks.

In the .storage setting it is expect that service will:

1. Verify that claimed transaction(s) are warrented by provided provided UCAN.
3. Perform atomic transaction either succesfully updating ALL `Pins` or failing and updating no pins.

[ed25519]:https://ed25519.cr.yp.to/
[UCAN]:https://whitepaper.fission.codes/access-control/ucan
[did:key]:https://w3c-ccg.github.io/did-method-key/