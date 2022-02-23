
# Revision

Following is an [IPLD Schema] representation of the `Revision` objects (or whatever we want to call it), which:

1. Can be in `Draft` or `Release` state.
    - Allow _coordinated_ `Release` updates.
    - Allow _concurrent_ `Draft` updates.
3. Are identified by an [ed25519][] public key, that can represent
    - [IPNS][] names.
    - [did:key][] identifiers.
    - Actors in [UCAN][] authorization.


This design would address several problems in .storage services:

### Large uploads

Large uploads that span multiple CAR files would gain a first class representation via `Revision` objects. Client application wishing to upload large file (or any other DAG) will be able to accomplish that by:


1. Self issuing a new `Revision` identifier (and corresponding UCAN) by generating new [ed25519][] keypair.
1. Submitting concurrent `Patch` transactions (in [CAR][] format). Each transaction will contain DAG shards, subset of blocks that would feet upload quota.
1. Finalizing upload by submitting `Commit` transaction (in [CAR][] format), setting `root` of the `Revision` to a `CID` of the large file.


This would allow .storage service to list "in progress" uploads (keyed by `Revision` id) and "finished" uploads (keyed by `CID` or/and `Revision` id).

### IPNS

.storage services could mirror `Revisions`s to corresponding [IPNS][] names, making it possible to access arbitrary uploads / pins through an IPNS resoultion.

> `Revision` state (`Draft` or `Release`) could be used to decide when to propagate changes through the network e.g. sevice could choose to only announce only `Release` states.


### did:key

.storage service could also provide interface for accessing content under `did:key` that correspond to a given keys. Basically we can build IPNS like system except with delegated publishing through UCANs before integrating that into IPNS.

### UCAN

By representing `Revision`s as first class objects identified by `did:key` they become actors in UCANs delegated capabilties system.

.storage user could issue delegated token for specific `Revision` object and excercise that capability to update given `Revision` object or delegate that capability to another actor in the system.


## Schema

Following is an [IPLD schema][] definition for the `Revision` object. 


```ipldsch
-- Revision represents (IPNS) named pointer to a DAG that
-- is either in "draft" or fully "release" state.
-- In both cases it is anotated pointer to a DAG.
type Pin union {
    Draft "draft"
    Release "release"
} representation inline {
  discriminantKey "status"
}

-- Represents partially pinned DAG. Think of it as
-- dirty tree in the git, head points to previous
-- `Revision`.
-- Please note: Even though it links to a previous
-- revision that does not imply it is pinned (you
-- would need to include that link in the links
-- explicitly)
type Draft struct {
  -- Link to a previous pin revision in "release" state
  head &Release
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
type Release struct {
    -- Root representing current state of the revision.
    root Link
    -- Previous version of this pin (not sure what
    -- would genesis block pint to maybe we need
    -- a special genesis variant of "Pin" union)
    head &Release
    -- We have links to all the relevant sub-DAGs
    -- because `root` may not be traversable e.g
    -- if it is encrypted. By providing links service
    -- can traverse it and pin all the relevant blocks
    -- even when it can't make sense of them.
    links [Link]
}
```

### Pin Update Protocol

General idea is that clients on the network could submit `Transactions`s to perform `Revesion` updates. Following is the [IPLD schema][] for the transaction.

```ipldsch
type Transaction union {
    Patch "patch"
    Commit "commit"
} representation inline {
  discriminantKey "type"
}

-- When "Patch" transaction is received, service 
-- performs following steps:
-- 1. Verify that current release head corresponds
--    to provided head (if pin is in draft state
--    it checks against it's head). If provided
--    head points to older revision (heads form the
--    merkle clock) it should deny transaction. If
--    provided head is newer revision (than known to
--    service) state of the revision on service is
--    out of date and it still refuses transaction
--    as it is unable to process it yet.
-- 2. If revision is in "release" state transitions
--    it to "draft" state in which `head` & `links`
--    match what was provided.
--    If pin is in "draft" state update it's `links`
--    to union of the provided links and local state
--    links. 
--
-- Note that service may or may not publish IPNS
-- record after processing "Patch" transaction.
type Patch {
  -- Revision identifier that is it's public key
  id ID
  -- Pointer to the head patch assumes revision is on.
  head &Release
  -- Set of links to be included in the next
  -- release of the revision.
  links [Link]
  -- This would link to IPLD representation of
  -- the UCAN (with "patch" capability) in which
  -- invocation audience is service ID this patch
  -- was send to and root issuer is the revision DID.
  -- This allows service to publish a new IPNS
  -- record (assuming we add support for UCANs in
  -- IPNS).
  -- Note: service needs to generate IPNS record
  -- update based on it's local `revision` state
  -- which may be different from the one submitted
  -- by a client. Client is responsible to do
  -- necessary coordination.
  proof &UCAN
}

-- When "Commit" transaction is recieved service
-- performs same steps as with "Patch". Main
-- difference is that after processing this
-- transaction Revision will transition to Release
-- state. If revision was in Release state new state
-- will contain only provided links, otherwise
-- it will contain union of all the links that were
-- received via patches and links provided via
-- Commit.
--
-- General expectation is that service will update IPNS
-- record after processing "commit" transaction.
type Commit {
  -- Revision identifier that is it's public key
  id ID
  -- pointer to the head of the pin.
  head &Release
  -- The root of the DAG for a new revisions it is
  -- implicitly implied to be in the links.
  root Link
  -- Set of links to be included in the next
  -- release of the revision.
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

1. Verify that claimed transaction(s) are warrented by provided provided UCAN (Ensuring that client is allowed to update `Revision`).
3. Perform atomic transaction either succesfully updating ALL `Revisions` (as per transaction) or failing and NOT updating non of the revisions. (Rejecting request and provided [CAR][] all together).


### 🚧 Transaction Serialization 🚧

> Note this requires more consideration, what follows is a just a current thinking on the matter.

`Transaction`s MAY be serialized as CAR files. In this serilaziation format transaction to be executed
will be referenced as CAR roots and point to the DAG-CBOR encoded `Transaction` object with couple of
nuances:

1. Transaction `links` may link to CAR CID which is to be intepreted as a set of `links` for all the blocks contained in the corresponding CAR.

   > **Note:** We do not currently have CAR IPLD codec. Idea is to iterate on this and define spec based on lessons learned.

2. If `links` field are omitted from transaction object that implies links to all the blocks of this CAR (except transaction blocks).

> 💔 I do not like "implicit links" as that seems impractical in case of multiple transactions. Even for a single transaction case `Transaction` may want to link a DAG known to be available at the destination e.g. CID of the previous revision.
>
> At the same time it would be impractical to list
> all the CIDs in the car in transaction itself.
>
> 💭 I'm starting to think we may want nested CARs, that way actual blocks can be included by encoding them via CAR codec. Which then can be referenced from the transaction in the outer CAR.
> ```
> |--------- Header --------||------- Data -------|
> [ varint | DAG-CBOR block ][Transaction][DAG CAR]
> ```
> That would allow breaking blocks into arbitrary sets and refer to them from the multilpe transactions.

[ed25519]:https://ed25519.cr.yp.to/
[UCAN]:https://whitepaper.fission.codes/access-control/ucan
[did:key]:https://w3c-ccg.github.io/did-method-key/
[IPLD Schema]:https://ipld.io/docs/schemas/
[IPNS]:https://github.com/ipfs/specs/blob/master/IPNS.md
[CAR]:https://ipld.io/specs/transport/car/carv1/
