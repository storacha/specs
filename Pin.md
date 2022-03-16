# Inter Planetary Transactional Memory (IPTM)

Following document describes:

1. Schema for representing DAGs that change over time, which from here on we will refer to as `Document`s.
1. Content derived addressing scheme for `Document` states.
1. Transactional update protocol for these `Documents`.
1. Document publishing protocol and associated concensus algorithm.


### Document Model

Document represents a view of the DAG in time, uniquely identified by [ed25519][] public key. It is state derived from set of operations that were authorized via corresponding private key (through [UCAN][]).

> Because documents are identified by [ed25519][] public key, that CAN represent
> - [IPNS][] names.
> - [did:key][] identifiers.
> - Actors in [UCAN][] authorization.


Documents can also be addressed in "specific state" by [CID][] _(which can be simply derived from CIDs of Shards it consists of, which will cover in more detail later)_ 


### Document States

Document can be in two logical states. Transitional state, here on referred as `Draft`, where it's in the process of transmittion _(e.g. in progress upload)_ where it has no `root`. Published document with a specific `root` is referred as `Edition`.

Following is an [IPLD schema][] definition for the `Document` object

```ipldsch
type Document union {
    Draft "draft"
    Edition "edition"
} representation inline {
  discriminantKey "status"
}

type Draft {
  -- Shards of the DAG this draft is comprised of
  shards: [&Shard]
}

type Edition {
  shards: [&Shard]
  root: Link
}

```

#### Draft


`Draft` represents in-flight document, usually while it's content is transmitted, which occurs prior to initial publish or between subsequent editions.


It's `shard` field links to all the `Shard`s it is comprised of, which are [CAR][] encoded set of blocks.

Every possible `Draft` state can be addressed by `CID` which can be computed by encoding it as DAG-CBOR node with `shards` sorted alphabetically (There's relevant prior art of [ZDAG hearder compression][] we colud borrow from)

> 💡 Please note that, while possible, `Draft`s are not meant to be stored. They are primarily a way to reference specific states of a document without having to retransmit a lot of data.


#### Edition

`Edition` simply represents a state in which specific `Draft` is assigned a `root` node that MUST be present in one of it's shards.

> `Edition`s can also be uniquely addressed via CID pretty much the same way as `Draft`s, although we currently have no practical need for this.


### Document update protocol

Documents in our model are represented via "append only" DAGs and can be updated using two types of transactions:

- `Append` - Appends provided DAG shards to the document state.
- `Publish` - Publishes a `root` of the DAG for a specified `Draft`.


Following is an [IPLD schema][] definition for the `Transaction` object


```ipldsch
type Transaction union {
    Append "append"
    Publish "publish"
} representation inline {
  discriminantKey "type"
}

type Append {
  -- Document ID to append provided shards to
  id ID
  -- Shards to be appended
  shards: [&Shard]
  -- UCAN authorization of this append
  proof &UCAN
}

type Publish {
  -- Document ID to append provided shard to
  id ID
  -- State of the document to publish
  draft: &Draft
  -- Root to be published
  root: Link
  -- Shard in which root is located
  shard: &Shard
  -- UCAN authorization to publish this document
  proof &UCAN
}

-- Binary representation of the ed25519 public key
type ID = Bytes
-- TODO: Define actual structure
type UCAN = Link
```

### Append

Append operation is both [commutative][] and [idempotent][idempotence], in other words they can be applied in any order and multiple times yet result in the same document state, that is because result of application is just addition of provided `shards` into document's `shards` set.

> It is worth noting that `Append` tranisions document from `Draft` or a `Edition` state into a `Draft` state, unless it has been already applied in which case it is noop.


### Publish

Publish operation simply assigns root to a specific document `Draft`. Since conflicting publish operations could occur, e.g. when two operations link `root` to a different `CID` we apply both operations in an order of operation CIDs, those operation sorted lowest alphabetically wins.

> In practice we expect this to be really rare and of limited value to an malicious actor since root could only point to the CID within the document shards.

##### Logical clock

Publishing a document may have a side effects (e.g. publishing it on IPNS). That is to say if given document state `D(a, b, c, d)` _(lower case letters signify shards)_ applying concurrent publish operations `P(a, b)` and `P(c, d)` may have visible side-effects despite been out of date.

> Please note that `publish` operations themself MUST be part of the document shards which naturally creates causal relationships new operation implicitly refers older ones. More on this can be found in [Merkle CRDT][] paper.


In order to reconcile concurrent publish operations we define total order (only) among published drafts as follows:

1. Given drafts `D1` and `D2`, if all shards of `D1` are included in `D2` we say `D1 <- D2` (`D1` predates `D2`).
2. Given drafts `D1` and `D2` where neither `D1` nor `D2` includes shards of the other `D1 <- D2` if:
   1. Number of shards in `D2` is greater than in `D1`
   2. Number of shards in `D2` is equal to number of shards in `D1` & `CID` of `D1 < D2`. 

## Appliactions

### Large Uploads in dotStorage

This section we describe practical application of this specification in dotStorage service(s), by walking through a large uploads flow, which would enbale service to list "in progress" and "complete" uploads.



1. Client generates [ed25519][] keypair.
2. Client derives `Document` ID and corresponding `Append` / `Publish` UCANs for it from keypair.
3. Client passes large file to a `@ipld/unixfs` library to get a stream of blocks.
4. Blocks are read from the stream and packed into CARs of 200MiB in size.
5. Each CAR is packet is wrapped in the outer CAR, with `Append` operation which links to a nested packet CAR by it's CID in `shards` and sends it of to the dotStorage designated endpoint.
6. Once all packets `Append`-ed client produces `Publish` operation, by deriving `Draft` CID from all the CAR packet `CID`s it produced and with `root` corresponding to file `root` CID.
7. Clien sends `Publish` operation and awaits it's completion.


> Note that in this use case `Document` is used to represent _upload session_ which is discarded on success.
> Also note that wrapper cars could `Append` / `Publish` shards into more then one document.

<!-- TODO Reframe these as applications

### IPNS

dotStorage services could mirror `Document`s to corresponding [IPNS][] names, making it possible to access arbitrary uploads / pins through an IPNS resoultion.

> `Document` state (`Draft` or `Release`) could be used to decide when to propagate changes through the network e.g. sevice could choose to announce only `Release` states.


### did:key

dotStorage service could also provide interface for accessing content under `did:key` that correspond to a given keys. Basically we can build IPNS like system except with delegated publishing through UCANs before integrating that into IPNS.

### UCAN

By representing `Documents`s as first class objects identified by `did:key` they become actors in UCANs delegated capabilties system.

dotStorage user could issue delegated token for specific `Document` object and excercise that capability to update given `Document` object or delegate that capability to another actor in the system.
-->


### Incremental update flow

In this flow submits incremental updates through ordered transactions `p1 <- p2 <- c2`. Note that client does not need to await for `p1` to finish before submitting `p2` since it is aware of `p1` CID at creation it can create `p2` which will only apply after `p1` and only if it succeeds (same with `c2`)


```
    c1()--+   - Commit c1 with no parent
          |
       R(c1)  - Init Release with c0 parent 
          |
          |
 p1(c0) --+   - Patch with c0 parent
          |
       D(p1)  - Transition to Draft with p1 parent
          |
          |
  p2(p1)--+   - Apply Patch p2 with parent p1  
          |
        D(p2) - Transition to Draft with p2 parent
          |
          |
 c2(p2) --+   - Apply Commit c2 with parent p2
          |
        R(c2) - Transition to Release with c2 Parent
```

```
    c1()--+   - Commit c1 with no parent
          |
       R(c1)  - Init Release with c0 parent 
          |
          |
 p1(c0) --+   - Patch with c0 parent
          |
       D(p1)  - Transition to Draft with p1 parent
          |
          |
  p2(p1)--+   - Apply Patch p2 with parent p1  
          |
        D(p2) - Transition to Draft with p2 parent
          |
          |
 c2(p2) --+   - Apply Commit c2 with parent p2
          |
        R(c2) - Transition to Release with c2 Parent
```

<!-- TODO - Rabase this diagrams onto current vision

### Concurrent update flow

In this flow client concurrently submits three `Patch`es each with a shards of the desired DAG followed by a `Commit` which lists all three `Patch`-es as parents.

In this flow client does not need to track concurrent patches as final commit will be applied only after it's `parents` or will be rejected otherwise.

> ⚠️ I am having second thoughts in regards to what commit should specify in `parents`. Original thinking was that it could specify nothing to imply whatever documents heads are now. Or specify `CID`s of transactions it depends on.
>
> However if we have received `c2(p1 p2)` leaving out `p3` it is not clear if `p3` was omitted as non-essential or if actor was unaware of `p3`, and if so changes from `p3` are probably aren't part of the resulting DAG.
> 
>   I am starting to think that it may be better to refuse `c2` if it does not include all the parents as actor submitting it is out of sync. I can not think of a case where intentionally omitting `p3` makes sense, nor what to do with contents of `p3`.

```
         c1()--+     - Commit c1 with no parent
               |
             R(c1)   - Init Release with c0 parent 
               |
               |
       p1(c0)--+     - Patch with c0 parent
               |
             D(p1)   - Transition to Draft with p1 parent
               |
               |
       p2(c0)--+     - Apply concurrent Patch p2 with parent c0  
               |
           D(p1 p2)  - Transition to Draft with p2 parent
               |
               |
        p3(c1)-+     - Apply Patch p3 with parent c1  
               |
         D(p1 p2 p3) - Transition to Draft with p2 parent
               |
               |
 c2(p1 p2 p3)--+    - Apply Commit c2 with parents p2, p3
               |
             R(c2)  - Transition to Release with c2 Parent
```

## Multiplayer update flow

In this flow multiple clients concurrently submit patches and race commits. One of the commits (determined by heuristics to be specified e.g. order by CID and pick the first) is applied and other is rejected.

> Non deterministic nature of this makes me really upset as there may be concurrent `c4` which would have won the race according to our heuristics yet we may receive it after we accpted c2. 
>
> This bothers me and makes me wonder if we can define protocol such that all the commits get transactions get applied it's just application order will be be determined by CID order. They would still have same links (given it's union of all links), however it may lead to `root` change which may be a problem.
> 
> This feels like [compaction problem in CRDTs](https://github.com/ipfs/notes/issues/407)

```
         c1()--+            - Commit c1 with no parent
               |
             R(c1)          - Init Release with c0 parent 
               |
               |
       p1(c0)--+            - Patch from client p
               |
             D(p1)          - Transition to Draft with p1 parent
               |
               |            - Concurrent Patch from client b
               +--b1(c0)
               |
           D(p1 b1)         - Transition to Draft with p2 parent
               |
               |
        p2(p1)-+            - Apply second Patch from p client  
               |
           D(p2 b1)         - Update p1 parent
               |
               |
               |
    c3(p2 b1)--x--c2(p1 b1) - Apply c2 and reject c3
               |
             R(c2)          - Transition to Release with c2 Parent
```
-->

[ed25519]:https://ed25519.cr.yp.to/
[UCAN]:https://whitepaper.fission.codes/access-control/ucan
[did:key]:https://w3c-ccg.github.io/did-method-key/
[IPLD Schema]:https://ipld.io/docs/schemas/
[IPNS]:https://github.com/ipfs/specs/blob/master/IPNS.md
[CAR]:https://ipld.io/specs/transport/car/carv1/
[Merkle CRDT]:https://research.protocol.ai/blog/2019/a-new-lab-for-resilient-networks-research/PL-TechRep-merkleCRDT-v0.1-Dec30.pdf
[CID]:https://docs.ipfs.io/concepts/content-addressing/
[ZDAG hearder compression]:https://github.com/mikeal/ZDAG/blob/master/SPEC.md#links_header_compression

[commutative]:https://en.wikipedia.org/wiki/Commutative_property
[idempotence]:https://en.wikipedia.org/wiki/Idempotence


