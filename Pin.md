
# Pins

Following is an [IPLD Schema] representation of the `Pin` objects (or whatever we want to call it), which:

1. Can be in `Tranisent` or `Pinned` state.
    - Allow incermental `Pinned` state updates.
    - Allow concurrent `Tranisent` state updates.
3. Are identified by an [ed25519][] public key, that can represent
    - [IPNS][] names.
    - [did:key][] identifiers.
    - Actors in [UCAN][] authorization.


This design would address several problems in .storage services:

### Large uploads

Large uploads that span multiple CAR files would gain a first class representation via `Pin` objects. Client application wishing to upload large file (or any other DAG) will be able to accomplish that by:


1. Self issuing a new `Pin` identifier (and corresponding UCAN) by generating new [ed25519][] keypair.
1. Submitting concurrent `Patch` transactions (in [CAR][] format). Each transaction will contain DAG shards, subset of blocks that would feet upload quota.
1. Finalizing upload by submitting `Commit` transaction (in [CAR][] format), setting `Pin` root to a `CID` of the large file.


This way would allow .storage service to list "in progress" uploads (keyed by `Pin` id) and complete uploads (keyed by `CID` or/and `Pin` id).

### IPNS

.storage services could mirror `Pin`s to corresponding [IPNS][] names, making it possible to access arbitrary uploads / pins through an IPNS resoultion.

> Pin state (`Transient` or `Pinned`) could be used to decide when to propagate pin changes through the network e.g. sevice could choose to only announce only `Pinned` states.


### did:key

.storage service could also provide interface for accessing content under `did:key` that correspond to a given keys. Basically we can build IPNS like system except with delegated publishing through UCANs before integrating that into IPNS.

### UCAN

By representing pins as first class objects identified by `did:key` they become actors in UCANs delegated capabilties system.

.storage user could issue delegated token for specific `Pin` object and excercise that capability to update given `Pin` object or delegate that capability to another actor in the system.


## Schema

Following is an [IPLD schema][] definition for the `Pin` object. 


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

General idea is that clients on the network could submit `Transactions`s to perform `Pin` updates. Following is the [IPLD schema][] for the transaction.

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

1. Provide DAG shard(s) in [CAR][] format.
4. Include `Transaction` blocks in the provided [CAR][] and list them in [roots](https://ipld.io/specs/transport/car/carv1/#number-of-roots).

In the .storage setting it is expect that service will:

1. Verify that claimed transaction(s) are warrented by provided provided UCAN (Ensuring that client is allowed to update `Pin`).
3. Perform atomic transaction either succesfully updating ALL `Pins` (as per transaction) or failing and NOT updating any of the pins. (Rejecting request and provide [CAR][] all together).

[ed25519]:https://ed25519.cr.yp.to/
[UCAN]:https://whitepaper.fission.codes/access-control/ucan
[did:key]:https://w3c-ccg.github.io/did-method-key/
[IPLD Schema]:https://ipld.io/docs/schemas/
[IPNS]:https://github.com/ipfs/specs/blob/master/IPNS.md
[CAR]:https://ipld.io/specs/transport/car/carv1/