# UCAN Invocation Specification v0.1.0

## Editors

- [Brooklyn Zelenka](https://github.com/expede/), [Fission](https://fission.codes/)

## Authors

- [Brooklyn Zelenka](https://github.com/expede/), [Fission](https://fission.codes/)
- [Irakli Gozalishvili](https://github.com/Gozala), [DAG House](https://dag.house/)

## Depends On

- [DAG-CBOR](https://ipld.io/specs/codecs/dag-cbor/spec/)
- [UCAN](https://github.com/ucan-wg/spec/)
- [UCAN-IPLD](https://github.com/ucan-wg/ucan-ipld/)
- [Varsig](https://github.com/ChainAgnostic/varsig/)

# 0 Abstract

UCAN Invocation defines a format for expressing the intention to run delegated capabilities from a UCAN, the attested receipts from an execution, and how to extend computation via promise pipelining.

## Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

# 1 Introduction

> Just because you can doesn't mean that you should
>
> — Anonymous

UCAN is a chained-capability format. A UCAN contains all of the information that one would need to perform some task, and the provable authority to do so. This begs the question: can UCAN be used directly as an RPC language?

Some teams have had success with UCAN directly for RPC when the intention is clear from context. This can be successful when there is more information on the channel than the UCAN itself (such as an HTTP path that a UCAN is sent to). However, capability invocation contains strictly more information than delegation: all of the authority of UCAN, plus the command to perform the task.

## 1.1 Intuition

## 1.1.1 Car Keys

Consider the following fictitious scenario:

Akiko is going away for the weekend. Her good friend Boris is going to borrow her car while she's away. They meet at a nearby cafe, and Akiko hands Boris her car keys. Boris now has the capability to drive Akiko's car whenever he wants to. Depending on their plans for the rest of the day, Akiko may find Boris quite rude if he immediately leaves the cafe to go for a drive. On the other hand, if Akiko asks Boris to run some last minute pre-vacation errands for that require a car, she may expect Boris to immediately drive off.

## 1.1.2 Lazy vs Eager Evaluation

In a referentially transparent setting, the description of a task is equivalent to having done so: a function and its results are interchangeable. [Programming languages with call-by-need semantics](https://en.wikipedia.org/wiki/Haskell) have shown that this can be an elegant programming model, especially for pure functions. However, _when_ something will run can sometimes be unclear.

Most languages use eager evaluation. Eager languages must contend directly with the distinction between a reference to a function and a command to run it. For instance, in JavaScript, adding parentheses to a function will run it. Omitting them lets the program pass around a reference to the function without immediately invoking it.

```js
const message = () => alert("hello world")
message // Nothing happens
message() // A message interups the user
```

Delegating a capability is like the statement `message`. Task is akin to `message()`. It's true that sometimes we know to run things from their surrounding context without the parentheses:

```js
;[1, 2, 3].map(message) // Message runs 3 times
```

However, there is clearly a distinction between passing a function and invoking it. The same is true for capabilities: delegating the authority to do something is not the same as asking for it to be done immediately, even if sometimes it's clear from context.

## 1.2 Separation of Concerns

Information about the scheduling, order, and pipelining of tasks is orthogonal to the flow of authority. An agent collaborating with the original executor does not need to know that their call is 3 invocations deep; they only need to know that they been asked to perform some task by the latest invoker.

As we shall see in the [discussion of promise pipelining](#6-promise-pipelining), asking an agent to perform a sequence of tasks before you know the exact parameters requires delegating capabilities for all possible steps in the pipeline. Pulling pipelining detail out of the core UCAN spec serves two functions: it keeps the UCAN spec focused on the flow of authority, and makes salient the level of de facto authority that the executor has (since they can claim any value as having returned for any step).

```
  ────────────────────────────────────────────Time──────────────────────────────────────────────────────►

┌──────────────────────────────────────────Delegation─────────────────────────────────────────────────────┐
│                                                                                                         │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐         ┌─────────┐                ┌─────────┐                 │
│  │         │   │         │   │         │         │         │                │         │                 │
│  │  Alice  ├──►│   Bob   ├──►│  Carol  ├────────►│   Dan   ├───────────────►│  Erin   │                 │
│  │         │   │         │   │         │         │         │                │         │                 │
│  └─────────┘   └─────────┘   └─────────┘         └─────────┘                └─────────┘                 │
│                                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────Invocation─────────────────────────────────────────────────────┐
│                                                                                                         │
│                              ┌─────────┐         ┌─────────┐                                            │
│                              │         │         │         │                                            │
│                              │  Carol  ╞═══All══►│   Dan   │                                            │
│                              │         │         │         │                                            │
│                              └─────────┘         └─────────┘                                            │
│                                                                                                         │
│                                                  ┌─────────┐                              ┌─────────┐   │
│                                                  │         │                              │         │   │
│                                                  │   Dan   ╞═══════════Update DB═════════►│  Erin   │   │
│                                                  │         │                              │         │   │
│                                                  └─────────┘                              └─────────┘   │
│                                                                                                         │
│                                                           ┌─────────┐                ┌─────────┐        │
│                                                           │         │                │         │        │
│                                                           │   Dan   ╞═══Read Email══►│  Erin   │        │
│                                                           │         │           ▲    │         │        │
│                                                           └─────────┘           ┆    └─────────┘        │
│                                                                               With                      │
│                                                                               Result                    │
│                                                                  ┌─────────┐   Of         ┌─────────┐   │
│                                                                  │         │    ┆         │         │   │
│                                                                  │   Dan   ╞════Set DNS══►│  Erin   │   │
│                                                                  │         │              │         │   │
│                                                                  └─────────┘              └─────────┘   │
│                                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## 1.3 A Note On Serialization

The JSON examples below are given in [DAG-JSON](https://ipld.io/docs/codecs/known/dag-json/), but UCAN Task is actually defined as IPLD. This makes UCAN Task agnostic to encoding. DAG-JSON follows particular conventions around wrapping CIDs and binary data in tags like so:

```json
// CID
{"/": "Qmf412jQZiuVUtdgnB36FXFX7xg5V6KEbSJ4dpQuhkLyfD"}

// Bytes (e.g. a signature)
{"/": {"bytes": "s0m3Byte5"}}
```

This format help disambiguate type information in generic DAG-JSON tooling. However, your presentation need not be in this specific format, as long as it can be converted to and from this cleanly. As it is used for the signature format, DAG-CBOR is RECOMMENDED.

## 1.4 Signatures

All payloads described in this spec MUST be signed with a [Varsig](https://github.com/ChainAgnostic/varsig/).

# 2 High-Level Concepts

## 2.1 Roles

Task adds two new roles to UCAN: invoker and executor. The existing UCAN delegator and delegate principals MUST persist to the invocation.

| UCAN Field | Delegation                             | Task                            |
| ---------- | -------------------------------------- | ------------------------------- |
| `iss`      | Delegator: transfer authority (active) | Invoker: request task (active)  |
| `aud`      | Delegate: gain authority (passive)     | Executor: perform task (active) |

### 2.1.1 Invoker

The invoker signals to the executor that a task associated with a UCAN SHOULD be performed.

The invoker MUST be the UCAN delegator. Their DID MUST be authenticated in the `iss` field of the contained UCAN.

### 2.1.2 Executor

The executor is directed to perform some task described in the UCAN by the invoker.

The executor MUST be the UCAN delegate. Their DID MUST be set the in `aud` field of the contained UCAN.

## 2.2 Components

![](./diagrams/concepts.svg)

### 2.2.1 Closure

A [Closure](#3-closure) is like a deferred function application: a request to perform some action on a resource with specific inputs.

### 2.2.2 Task

A [Task](#4-task) extends a Closure with additional metadata that is not used to describe the meaning of the computation or effect to be run.

### 2.2.3 Batch

A [Batch](#5-batch) is a way of requesting more than one action at once.

### 2.2.4 Invocation

An [Invocation](#6-invocation) is the cryptographically signed container for a Batch. This is the step that "forces" the "deferred" Closure.

### 2.2.5 Pointers

An [Invocation Pointer](#7-pointer) identifies a specific invocation. An Invoked Task Pointer points to a unique Task inside an Invocation.

### 2.2.6 Result

A [Result](#8-result) is the output of a Closure.

### 2.2.7 Receipt

A [Receipt](#9-receipt) describes the output of an invocation, referenced by its Invocation Pointer.

### 2.2.8 Promise

A [promise](#10-promise) is a reference to the receipt of an action that has yet to return a receipt.

## 2.3 IPLD Schema

```ipldsch
type Closure struct {
  with   URI
  do     Ability
  inputs Any
}

type Task struct {
  with   URI
  do     Ability
  inputs Any
  meta {String : Any} (implicit {})
}

type Batch union {
  | Named {String : Task}
  | List  [Task]
}

type Invocation struct {
  uiv  SemVer
  run  Batch
  prf  [&UCAN]
  nnc  String
  meta {String : Any} (implicit {})
  sig  Varsig
}

type InvocationPointer union {
  | "/" -- Relative to the current invocation
  | &Invocation
}

type InvokedTaskPointer struct {
  envl  InvocationPointer
  label String
} representation tuple

type Receipt struct {
  ran  &InvocationPointer
  out  {String : Result}
  rec  {String : &Receipt}
  meta {String : Any}
  sig  Varsig
}

type Result union {
  | Any ("ok")  -- Success
  | Any ("err") -- Failure
} representation keyed

type Promise union {
  | InvokedTaskPointer "promise/ok"
  | InvokedTaskPointer "promise/err"
  | InvokedTaskPointer "promise/*"
} representation keyed
```

# 3 Closure

A Closure is the smallest unit of work that can be requested from a UCAN. It describes one `(resource, ability, inputs)` triple. The `inputs` field is free form, and depend on the specific resource and ability being interacted with, and not described in this specification.

Using the JavaScript analogy from the introduction, a Closure is similar to wrapping a call in an anonymous function:

```json
{
  "with": "mailto://alice@example.com",
  "do": "msg/send",
  "inputs": {
    "to": ["bob@example.com", "carol@example.com"],
    "subject": "hello",
    "body": "world"
  }
}
```

```js
// Pseudocode
;() =>
  msg.send("mailto:alice@example.com", {
    to: ["bob@example.com", "carol@example.com"],
    subject: "hello",
    body: "world",
  })
```

Later, when we explore [Promises](# 10-promise), this also includes capturing the promise:

```json
{
  "mailingList": {
    "with": "https://example.com/mailinglist",
    "do": "crud/read"
  },
  "sendEmail": {
    "with": "mailto://alice@example.com",
    "do": "msg/send",
    "inputs": {
      "to": {"promise/*": ["/", "get-mailing-list"]}
      "subject": "hello",
      "body": "world"
    }
  }
}
```

```js
// Pseudocode
const mailingList = crud.read("https://exmaple.com/mailinglist", {}) // ---┐
//    │
const sendEmail = () =>
  msg.send("mailto:alice@example.com", {
    //    │
    to: mailingList, // <----------------------------------------------------┘
    subject: "hello",
    body: "world",
  })
```

## 3.1 Fields

```ipldsch
type Closure struct {
  with   URI
  do     Ability
  inputs Any
}
```

### 3.1.1 Resource

The `with` field MUST contain the [URI](https://en.wikipedia.org/wiki/Uniform_Resource_Identifier) of the resource being accessed. If the resource being accessed is some static data, it is RECOMMENDED to reference it by the [`data`](https://en.wikipedia.org/wiki/Data_URI_scheme), [`ipfs`](https://docs.ipfs.tech/how-to/address-ipfs-on-web/#native-urls), or [`magnet`](https://en.wikipedia.org/wiki/Magnet_URI_scheme) URI schemes.

### 3.1.2 Ability

The `do` field MUST contain a [UCAN Ability](https://github.com/ucan-wg/spec/#23-ability). This field can be thought of as the message or trait being sent to the resource.

### 3.1.3 Inputs

The `inputs` field MUST contain any arguments expected by the URI/Ability pair. This MAY be different between different URIs and Abilities, and is thus left to the executor to define the shape of this data.

### 3.2 DAG-JSON Examples

Interacting with an HTTP API:

```json
{
  "with": "https://example.com/blog/posts",
  "do": "crud/create",
  "inputs": {
    "headers": {
      "content-type": "application/json"
    },
    "payload": {
      "title": "How UCAN Tasks Changed My Life",
      "body": "This is the story of how one spec changed everything...",
      "topics": ["authz", "journal"],
      "draft": true
    }
  }
}
```

Sending Email:

```json
{
  "with": "mailto:akiko@example.com",
  "do": "msg/send",
  "inputs": {
    "to": ["boris@example.com", "carol@example.com"],
    "subject": "Coffee",
    "body": "Hey you two, I'd love to get coffee sometime and talk about UCAN Tasks!"
  }
}
```

Running WebAssembly from binary:

```json
{
  "with": "data:application/wasm;base64,AHdhc21lci11bml2ZXJzYWwAAAAAAOAEAAAAAAAAAAD9e7+p/QMAkSAEABH9e8GowANf1uz///8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////8AAAAACAAAACoAAAAIAAAABAAAACsAAAAMAAAACAAAANz///8AAAAA1P///wMAAAAlAAAALAAAAAAAAAAUAAAA/Xu/qf0DAJHzDx/44wMBqvMDAqphAkC5YAA/1mACALnzB0H4/XvBqMADX9bU////LAAAAAAAAAAAAAAAAAAAAAAAAAAvVXNlcnMvZXhwZWRlL0Rlc2t0b3AvdGVzdC53YXQAAGFkZF9vbmUHAAAAAAAAAAAAAAAAYWRkX29uZV9mAAAADAAAAAAAAAABAAAAAAAAAAkAAADk////AAAAAPz///8BAAAA9f///wEAAAAAAAAAAQAAAB4AAACM////pP///wAAAACc////AQAAAAAAAAAAAAAAnP///wAAAAAAAAAAlP7//wAAAACM/v//iP///wAAAAABAAAAiP///6D///8BAAAAqP///wEAAACk////AAAAAJz///8AAAAAlP///wAAAACM////AAAAAIT///8AAAAAAAAAAAAAAAAAAAAAAAAAAET+//8BAAAAWP7//wEAAABY/v//AQAAAID+//8BAAAAxP7//wEAAADU/v//AAAAAMz+//8AAAAAxP7//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU////pP///wAAAAAAAQEBAQAAAAAAAACQ////AAAAAIj///8AAAAAAAAAAAAAAADQAQAAAAAAAA==",
  "do": "wasm/run",
  "inputs": {
    "func": "add_one",
    "args": [42]
  }
}
```

Executing all of the capabilities in a UCAN directly:

```json
{
  "with": "ipfs://bafkreiemaanh3kxqchhcdx3yckeb3xvmboztptlgtmnu5jp63bvymxtlva",
  "do": "ucan/run",
  "inputs": null
}
```

# 4 Task

A Task is subtype of a [Closure](#3-closure), adding an OPTIONAL metadata field. If not present, the `meta` field defaults to an empty map. A Task can be trivially converted to a Closure by removing the `meta` field.

```ipldsch
type Task struct {
  with   URI
  do     Ability
  inputs Any
  meta {String : Any} (implicit {})
}
```

## 4.1 Fields

### 4.1.1 Closure Fields

The `with`, `do`, and `inputs` field from [Closure](#3-closure) remain unchanged.

### 4.1.2 Metadata

The OPTIONAL `meta` field MAY be used to include human-readable descriptions, tags, execution hints, resource limits, and so on. If present, the `meta` field MUST contain a map with string keys. The contents of the map are left undefined to encourage extensible use.

## 4.2 DAG-JSON Examples

Sending Email:

```json
{
  "with": "mailto:akiko@example.com",
  "do": "msg/send",
  "inputs": {
    "to": ["boris@example.com", "carol@example.com"],
    "subject": "Coffee",
    "body": "Hey you two, I'd love to get coffee sometime and talk about UCAN Tasks!"
  },
  "meta": {
    "dev/tags": ["friends", "coffee"],
    "dev/priority": "high"
  }
}
```

Running WebAssembly from binary:

```json
{
  "with": "data:application/wasm;base64,AHdhc21lci11bml2ZXJzYWwAAAAAAOAEAAAAAAAAAAD9e7+p/QMAkSAEABH9e8GowANf1uz///8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////8AAAAACAAAACoAAAAIAAAABAAAACsAAAAMAAAACAAAANz///8AAAAA1P///wMAAAAlAAAALAAAAAAAAAAUAAAA/Xu/qf0DAJHzDx/44wMBqvMDAqphAkC5YAA/1mACALnzB0H4/XvBqMADX9bU////LAAAAAAAAAAAAAAAAAAAAAAAAAAvVXNlcnMvZXhwZWRlL0Rlc2t0b3AvdGVzdC53YXQAAGFkZF9vbmUHAAAAAAAAAAAAAAAAYWRkX29uZV9mAAAADAAAAAAAAAABAAAAAAAAAAkAAADk////AAAAAPz///8BAAAA9f///wEAAAAAAAAAAQAAAB4AAACM////pP///wAAAACc////AQAAAAAAAAAAAAAAnP///wAAAAAAAAAAlP7//wAAAACM/v//iP///wAAAAABAAAAiP///6D///8BAAAAqP///wEAAACk////AAAAAJz///8AAAAAlP///wAAAACM////AAAAAIT///8AAAAAAAAAAAAAAAAAAAAAAAAAAET+//8BAAAAWP7//wEAAABY/v//AQAAAID+//8BAAAAxP7//wEAAADU/v//AAAAAMz+//8AAAAAxP7//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU////pP///wAAAAAAAQEBAQAAAAAAAACQ////AAAAAIj///8AAAAAAAAAAAAAAADQAQAAAAAAAA==",
  "do": "wasm/run",
  "inputs": {
    "func": "add_one",
    "args": [42]
  },
  "meta": {
    "dev/notes": "The standard Wasm demo",
    "ipvm/verification": "attestation",
    "ipvm/resources": {
      "gas": 5000
    }
  }
}
```

# 5 Batch

A Batch is a collection of Tasks, either as a `List` (array) or `Named` (map). In many situations, sending multiple requests in a Batch is more efficient than one-at-a-time.

A `List` is sugar for a `Named` map, where the keys are the array index number as strings.

```ipldsch
type Batch union {
  | Named {String : Task}
  | List  [Task]
}
```

## 5.1 Fields

Each Task in a Batch contains MAY be referenced by a string label.

## 5.2 DAG-JSON Examples

### 5.2.1 Named

```json
{
  "left": {
    "with": "https://example.com/blog/posts",
    "do": "crud/create",
    "inputs": {
      "headers": {
        "content-type": "application/json"
      },
      "payload": {
        "title": "How UCAN Tasks Changed My Life",
        "body": "This is the story of how one spec changed everything...",
        "topics": ["authz", "journal"],
        "draft": true
      }
    }
  },
  "right": {
    "with": "mailto:akiko@example.com",
    "do": "msg/send",
    "inputs": {
      "to": ["boris@example.com", "carol@example.com"],
      "subject": "Coffee",
      "body": "Hey you two, I'd love to get coffee sometime and talk about UCAN Tasks!"
    },
    "meta": {
      "dev/tags": ["friends", "coffee"],
      "dev/priority": "high"
    }
  }
}
```

### 5.2.2 List

```json
[
  {
    "with": "https://example.com/blog/posts",
    "do": "crud/create",
    "inputs": {
      "headers": {
        "content-type": "application/json"
      },
      "payload": {
        "title": "How UCAN Tasks Changed My Life",
        "body": "This is the story of how one spec changed everything...",
        "topics": ["authz", "journal"],
        "draft": true
      }
    }
  },
  {
    "with": "mailto:akiko@example.com",
    "do": "msg/send",
    "inputs": {
      "to": ["boris@example.com", "carol@example.com"],
      "subject": "Coffee",
      "body": "Hey you two, I'd love to get coffee sometime and talk about UCAN Tasks!"
    },
    "meta": {
      "dev/tags": ["friends", "coffee"],
      "dev/priority": "high"
    }
  }
]
```

# 6 Invocation

As [noted in the introduction](#112-lazy-vs-eager-evaluation), there is a difference between a reference to a function and calling that function. [Closures](#3-closure) and [Tasks](#4-task) are not executable until they have been provided provable authority from the [Invoker](#211-invoker) (in the form of UCANs), and signed with the Invoker's private key.

## 6.1 IPLD Schema

```ipldsch
type Invocation struct {
  uiv  SemVer
  run  Batch
  prf  [&UCAN]
  nnc  String
  meta {String : Any} (implicit {})
  sig  Varsig
}
```

## 6.2 Fields

An Invocation authorizes one or more Tasks to be run. There are a few invariants that MUST hold between the `run`, `prf` and `sig` fields:

- All of the `prf` UCANs MUST list the Invoker in their `iss`
- The `sig` field MUST be produced by the Invoker
- All of the `run` Tasks MUST be provably authorized by the UCANs in the `prf` field
- The Executor(s) MUST be listed in the `aud` field of a UCAN that grants it the authority to perform some action on a resource, or be the root authority for it

### 6.2.1 UCAN Task Version

The `uiv` field MUST contain the SemVer-formatted version of the UCAN Task Specification that this struct conforms to.

### 6.2.2 Task

The `run` field MUST contain a link to the [Task](#31-single-invocation) itself.

### 6.2.3 Proofs

The `prf` field MUST contain links to any UCANs that provide the authority to run the actions. All of the outermost `aud` fields MUST be set to the [Executor](#212-executor)'s DID. All of the outermost `iss` field MUST be set to the [Invoker](#211-invoker)'s DID.

### 6.2.4 Nonce

The `nnc` field MUST include a random nonce field expressed in ASCII. This field ensures that multiple invocations are unique.

### 6.2.5 Metadata

If present, the OPTIONAL `meta` map MAY contain free form fields. This provides a place for extension of the invocation type.

Data inside the `meta` field SHOULD NOT be used for [Receipts](#9-receipt).

### 6.2.6 Signature

The `sig` field MUST contain a [Varsig](https://github.com/ChainAgnostic/varsig) of the `inv`, `prf`, and `nnc` fields.

## 6.3 DAG-JSON Examples

```json
{
  "uiv": "0.1.0",
  "nnc": "6c*97-3=",
  "run": {
    "left": {
      "with": "https://example.com/blog/posts",
      "do": "crud/create",
      "inputs": {
        "headers": {
          "content-type": "application/json"
        },
        "payload": {
          "title": "How UCAN Tasks Changed My Life",
          "body": "This is the story of how one spec changed everything...",
          "topics": ["authz", "journal"],
          "draft": true
        }
      }
    },
    "right": {
      "with": "mailto:akiko@example.com",
      "do": "msg/send",
      "inputs": {
        "to": ["boris@example.com", "carol@example.com"],
        "subject": "Coffee",
        "body": "Hey you two, I'd love to get coffee sometime and talk about UCAN Tasks!"
      },
      "meta": {
        "dev/tags": ["friends", "coffee"],
        "dev/priority": "high"
      }
    }
  },
  "prf": [
    { "/": "bafkreie2cyfsaqv5jjy2gadr7mmupmearkvcg7llybfdd7b6fvzzmhazuy" },
    { "/": "bafkreibbz5pksvfjyima4x4mduqpmvql2l4gh5afaj4ktmw6rwompxynx4" }
  ],
  "meta": {
    "notes/personal": "I felt like making an invocation today!",
    "ipvm/config": {
      "time": [5, "minutes"],
      "gas": 3000
    }
  },
  "sig": {
    "/": {
      "bytes:": "5vNn4--uTeGk_vayyPuNTYJ71Yr2nWkc6AkTv1QPWSgetpsu8SHegWoDakPVTdxkWb6nhVKAz6JdpgnjABppC7"
    }
  }
}
```

# 7 Pointer

An Invocation Pointer references a specific [Invocation](#6-invocation), either directly by CID (absolute), or from inside the Invocation itself (relative).

```ipldsch
type InvocationPointer union {
  | "/" -- Relative to the current invocation
  | &Invocation
}
```

An Invoked Task Pointer references a specific Task inside a Batch, by the name of the label. If the Batch is unlabelled (a `List`), then the index represented as a string MUST be used.

```ipldsch
type InvokedTaskPointer struct {
  envl  InvocationPointer
  label String
} representation tuple
```

## 7.2 DAG-JSON Examples

### 7.2.1 Relative

#### 7.2.1.1 Named

This relative pointer:

```json
["/", "some-label"]
```

Will select the marked fields in these Named invocations:

```json
{
  "uiv": "0.1.0",
  "nnc": "6c*97-3=",
  "run": {
    "some-label": {
      // <- Selects this
      "with": "https://example.com/blog/posts",
      "do": "crud/create",
      "inputs": {
        "headers": {
          "content-type": "application/json"
        },
        "payload": {
          "title": "How UCAN Tasks Changed My Life",
          "body": "This is the story of how one spec changed everything...",
          "topics": ["authz", "journal"],
          "draft": true
        }
      }
    },
    "some-other-label": {
      "with": "mailto:akiko@example.com",
      "do": "msg/send",
      "inputs": {
        "to": ["boris@example.com", "carol@example.com"],
        "subject": "Coffee",
        "body": "Hey you two, I'd love to get coffee sometime and talk about UCAN Tasks!"
      },
      "meta": {
        "dev/tags": ["friends", "coffee"],
        "dev/priority": "high",
        "dev/notes": {
          "select-task": ["/", "some-label"] // <- Pointer here
        }
      }
    }
  },
  "prf": [
    { "/": "bafkreibbz5pksvfjyima4x4mduqpmvql2l4gh5afaj4ktmw6rwompxynx4" }
  ],
  "sig": {
    "/": {
      "bytes:": "5vNn4--uTeGk_vayyPuNTYJ71Yr2nWkc6AkTv1QPWSgetpsu8SHegWoDakPVTdxkWb6nhVKAz6JdpgnjABppC7"
    }
  }
}
```

```json
{
  "uiv": "0.1.0",
  "nnc": "myNonce529",
  "run": {
    "some-label": { // <- Selects this
      "with": "data:application/wasm;base64,AHdhc21lci11bml2ZXJzYWwAAAAAAOAEAAAAAAAAAAD9e7+p/QMAkSAEABH9e8GowANf1uz///8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////8AAAAACAAAACoAAAAIAAAABAAAACsAAAAMAAAACAAAANz///8AAAAA1P///wMAAAAlAAAALAAAAAAAAAAUAAAA/Xu/qf0DAJHzDx/44wMBqvMDAqphAkC5YAA/1mACALnzB0H4/XvBqMADX9bU////LAAAAAAAAAAAAAAAAAAAAAAAAAAvVXNlcnMvZXhwZWRlL0Rlc2t0b3AvdGVzdC53YXQAAGFkZF9vbmUHAAAAAAAAAAAAAAAAYWRkX29uZV9mAAAADAAAAAAAAAABAAAAAAAAAAkAAADk////AAAAAPz///8BAAAA9f///wEAAAAAAAAAAQAAAB4AAACM////pP///wAAAACc////AQAAAAAAAAAAAAAAnP///wAAAAAAAAAAlP7//wAAAACM/v//iP///wAAAAABAAAAiP///6D///8BAAAAqP///wEAAACk////AAAAAJz///8AAAAAlP///wAAAACM////AAAAAIT///8AAAAAAAAAAAAAAAAAAAAAAAAAAET+//8BAAAAWP7//wEAAABY/v//AQAAAID+//8BAAAAxP7//wEAAADU/v//AAAAAMz+//8AAAAAxP7//wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU////pP///wAAAAAAAQEBAQAAAAAAAACQ////AAAAAIj///8AAAAAAAAAAAAAAADQAQAAAAAAAA==",
      "do": "wasm/run",
      "inputs": {
        "func": "add_one",
        "args": [42]
      }
    }
  },
  "meta": {
    "dev/notes": {
      "select-task": ["/", "some-label"] // <- Pointer here
    }
  }
  "prf": [{"/": "bafkreibbz5pksvfjyima4x4mduqpmvql2l4gh5afaj4ktmw6rwompxynx4"}],
  "sig": {"/": {"bytes:": "LcZglimIwQ58T0rnkErYshq2S8MMF9G/zRqYXv/PmXs="}}
}
```

### 7.2.1.1 List

This local pointer:

```json
["/", "1"]
```

Will select the marked fields in this List invocation:

```json
{
  "uiv": "0.1.0",
  "nnc": "6c*97-3=",
  "run": [
    {
      "with": "mailto:akiko@example.com",
      "do": "msg/send",
      "inputs": {
        "to": ["boris@example.com", "carol@example.com"],
        "subject": "Coffee",
        "body": "Hey you two, I'd love to get coffee sometime and talk about UCAN Tasks!"
      },
      "meta": {
        "dev/tags": ["friends", "coffee"],
        "dev/priority": "high",
        "dev/notes": {
          "select-task": ["/", "0"] // <- Pointer here
        }
      }
    },
    // Selects this
    // vvvvvvvvvvvv
    {
      "with": "https://example.com/blog/posts",
      "do": "crud/create",
      "inputs": {
        "headers": {
          "content-type": "application/json"
        },
        "payload": {
          "title": "How UCAN Tasks Changed My Life",
          "body": "This is the story of how one spec changed everything...",
          "topics": ["authz", "journal"],
          "draft": true
        }
      }
    }
  ],
  "prf": [
    { "/": "bafkreibbz5pksvfjyima4x4mduqpmvql2l4gh5afaj4ktmw6rwompxynx4" }
  ],
  "sig": {
    "/": {
      "bytes:": "5vNn4--uTeGk_vayyPuNTYJ71Yr2nWkc6AkTv1QPWSgetpsu8SHegWoDakPVTdxkWb6nhVKAz6JdpgnjABppC7"
    }
  }
}
```

### 7.2.2 Absolute

#### 7.2.2.1 Named

This absolute pointer:

```json
[
  { "/": "bafkreiff4alf4rdi5mqg4fpxiejgotcnf2zksqanp5ctwzinmqyf7o3i2e" },
  "some-label"
]
```

Will select the marked field in this Named invocation:

```json
// CID = bafkreiff4alf4rdi5mqg4fpxiejgotcnf2zksqanp5ctwzinmqyf7o3i2e
{
  "uiv": "0.1.0",
  "nnc": "6c*97-3=",
  "run": {
    "some-label": {
      // <- Selects this
      "with": "https://example.com/blog/posts",
      "do": "crud/create",
      "inputs": {
        "headers": {
          "content-type": "application/json"
        },
        "payload": {
          "title": "How UCAN Tasks Changed My Life",
          "body": "This is the story of how one spec changed everything...",
          "topics": ["authz", "journal"],
          "draft": true
        }
      }
    },
    "some-other-label": {
      "with": "mailto:akiko@example.com",
      "do": "msg/send",
      "inputs": {
        "to": ["boris@example.com", "carol@example.com"],
        "subject": "Coffee",
        "body": "Hey you two, I'd love to get coffee sometime and talk about UCAN Tasks!"
      },
      "meta": {
        "dev/tags": ["friends", "coffee"],
        "dev/priority": "high",
        "dev/notes": {
          "select-task": ["/", "some-label"] // <- Pointer here
        }
      }
    }
  },
  "prf": [
    { "/": "bafkreibbz5pksvfjyima4x4mduqpmvql2l4gh5afaj4ktmw6rwompxynx4" }
  ],
  "sig": {
    "/": {
      "bytes:": "5vNn4--uTeGk_vayyPuNTYJ71Yr2nWkc6AkTv1QPWSgetpsu8SHegWoDakPVTdxkWb6nhVKAz6JdpgnjABppC7"
    }
  }
}
```

#### 7.2.2.1 List

This absolute pointer:

```json
[{ "/": "bafkreiew2p74l7bq3hnllbduzagdcezlab54ko4lpw72mfcvilh4ov2hkq" }, "1"]
```

Will select the marked field in this List invocation:

```json
// CID = bafkreiew2p74l7bq3hnllbduzagdcezlab54ko4lpw72mfcvilh4ov2hkq
{
  "uiv": "0.1.0",
  "nnc": "6c*97-3=",
  "run": [
    {
      "with": "mailto:akiko@example.com",
      "do": "msg/send",
      "inputs": {
        "to": ["boris@example.com", "carol@example.com"],
        "subject": "Coffee",
        "body": "Hey you two, I'd love to get coffee sometime and talk about UCAN Tasks!"
      },
      "meta": {
        "dev/tags": ["friends", "coffee"],
        "dev/priority": "high",
        "dev/notes": {
          "select-task": ["/", "0"] // <- Pointer here
        }
      }
    },
    // Selects this
    // vvvvvvvvvvvv
    {
      "with": "https://example.com/blog/posts",
      "do": "crud/create",
      "inputs": {
        "headers": {
          "content-type": "application/json"
        },
        "payload": {
          "title": "How UCAN Tasks Changed My Life",
          "body": "This is the story of how one spec changed everything...",
          "topics": ["authz", "journal"],
          "draft": true
        }
      }
    }
  ],
  "prf": [
    { "/": "bafkreibbz5pksvfjyima4x4mduqpmvql2l4gh5afaj4ktmw6rwompxynx4" }
  ],
  "sig": {
    "/": {
      "bytes:": "5vNn4--uTeGk_vayyPuNTYJ71Yr2nWkc6AkTv1QPWSgetpsu8SHegWoDakPVTdxkWb6nhVKAz6JdpgnjABppC7"
    }
  }
}
```

# 8 Result

A Result records the output of a [Task](#4-task), as well as its success or failure state.

## 8.1 Variants

```ipldsch
type Result union {
  | Any ("ok") -- Success
  | {String: Any} ("err") -- Failure
} representation keyed
```

### 8.1.1 Success

The success branch MUST contain the value returned from a successful Task wrapped in the `"ok"` tag. The exact shape of the returned data is left undefined to allow for flexibility in various Task types.

```json
{ "ok": 42 }
```

### 8.1.2 Failure

The failure branch MAY contain detail about why execution failed wrapped in the `"err"` tag. It is left undefined in this specification to allow for Task types to standardize the data that makes sense in their contexts.

If no information is available, this field SHOULD be set to `{}`.

```json
{
  "err": {
    "dev/reason": "unauthorized",
    "http/status": 401
  }
}
```

# 9 Receipt

An Invocation Receipt is an attestation of the Result of an Invocation. A Receipt MUST be signed by the Executor (the `aud` of the associated UCANs).

**NB: a Receipt this does not guarantee correctness of the result!** The statement's veracity MUST be only understood as an attestation from the executor.

Receipts MUST use the same version as the invocation that they contain.

## 9.1 Fields

```ipldsch
type Receipt struct {
  ran  &InvokedTaskPointer
  out  {String : Result}
  rec  {String : &Receipt}
  meta {String : Any}
  sig  Varsig
}
```

### 9.1.1 Task

The `inv` field MUST include a link to the Task that the Receipt is for.

### 9.1.2 Output

The `out` field MUST contain the output of steps of the call graph, indexed by the task name inside the invocation. The `out` field MAY omit any tasks that have not yet completed, or results which are not public. An `Task` may be associated to zero or more `Receipts`.

A `Result` MAY include recursive `Receipt` CIDs in on the `Success` branch. As a Task may require subdelegation, the OPTIONAL `rec` field MAY be used to include recursive `Receipt`s.

### 9.1.3 Recursive Receipt

In the case that an Invocation was subdelegated to another Executor and the Result bubbled up, a recursive Receipt SHOULD be included in the `rec` field.

### 9.1.4 Metadata Fields

The metadata field MAY be omitted or used to contain additional data about the receipt. This field MAY be used for tags, commentary, trace information, and so on.

### 9.1.5 Signature

The `sig` field MUST contain a [Varsig](https://github.com/ChainAgnostic/varsig) of the `inv`, `out`, and `meta` fields. The signature MUST be generated by the Executor, which means the public key in the `aud` field of the UCANs backing the Task.

## 9.2 DAG-JSON Examples

```json
{
  "ran": { "/": "bafkreifzjut3te2nhyekklss27nh3k72ysco7y32koao5eei66wof36n5e" },
  "out": {
    "ok": [
      {
        "from": "bob@example.com",
        "text": "Hello world!"
      },
      {
        "from": "carol@example.com",
        "text": "What's up?"
      }
    ]
  },
  "meta": {
    "time": [400, "hours"],
    "retries": 2
  },
  "sig": {
    "/": {
      "bytes": "bdNVZn_uTrQ8bgq5LocO2y3gqIyuEtvYWRUH9YT-SRK6v_SX8bjt_VZ9JIPVTdxkWb6nhVKBt6JGpgnjABpOCA"
    }
  }
}
```

# 10 Promise

> Machines grow faster and memories grow larger. But the speed of light is constant and New York is not getting any closer to Tokyo. As hardware continues to improve, the latency barrier between distant machines will increasingly dominate the performance of distributed computation. When distributed computational steps require unnecessary round trips, compositions of these steps can cause unnecessary cascading sequences of round trips
>
> — [Mark Miller](https://github.com/erights), [Robust Composition](http://www.erights.org/talks/thesis/markm-thesis.pdf)

There MAY not be enough information to described an Invocation at creation time. However, all of the information required to construct the next request in a sequence MAY be available in the same Batch, or in a previous (but not yet complete) Invocation. Waiting for each request to complete before proceeding to the next task has a performance impact due to the amount of latency. [Promise pipelining](http://erights.org/elib/distrib/pipeline.html) is a solution to this problem: by referencing a prior invocation, a pipelined invocation can direct the executor to use the output of earlier invocations into the input of a later one. This liberates the invoker from waiting for each step.

A Promise is a placeholder value MAY be used as a variable placeholder for a concrete value in a [Closure](#3-closure), waiting on a previous step to complete.

One way of seeing the names in a [`Batch`](#5-batch) is as variables for the return of each Closure. These can now be referenced by other Closures.

For example, consider the following batch:

```json
{
  "run": {
    "create-draft": {
      "with": "https://example.com/blog/posts",
      "do": "crud/create",
      "inputs": {
        "payload": {
          "title": "How UCAN Tasks Changed My Life",
          "body": "This is the story of how one spec changed everything..."
        }
      }
    },
    "get-editors": {
      "with": "https://example.com/users/editors",
      "do": "crud/read"
    },
    "notify": {
      "with": "mailto:akiko@example.com",
      "do": "msg/send",
      "inputs": {
        "to": { "promise/ok": ["/", "get-editors"] },
        "subject": "Coffee",
        "body": { "promise/ok": ["/", "create-draft"] }
      }
    }
  }
}
```

By analogy, this can be interpreted roughly as follows:

```js
const createDraft = crud.create("https://example.com/blog/posts", {
  payload: {
    title: "How UCAN Tasks Changed My Life",
    body: "This is the story of how one spec changed everything...",
  },
})

const getEditors = crud.read("https://example.com/users/editors")

const notify = msg.send("mailto:akiko@example.com", {
  to: await createDraft,
  subject: "Coffee",
  body: await getEditors,
})
```

While a Promise MAY be substituted for any field in a Closure, substituting the `do` field is NOT RECOMMENDED. The `do` field is critical in understanding what kind of action will be performed, and schedulers SHOULD use this fields to grant atomicity, parallelize tasks, and so on.

After resolution, the Task MUST be validated against the UCANs known to the Executor. A Promise resolved to a Task that is not backed by a valid UCAN MUST NOT be executed, and SHOULD return an unauthorized error to the user.

Promises MAY be used inside of a single Invocation's Closures, or across multiple Invocations, and MAY even be across multiple Invokers. As long as the pointer can be resolved, any invoked Task MAY be promised. This is sometimes referred to as ["promise pipelining"](http://erights.org/elib/distrib/pipeline.html).

A Promise MUST resolve to a [Result](#8-result). If a particular branch's value is required to be unwrapped, the Result tag (`ok` or `err`) MAY be supplied.

## 10.1 Enum & Fields

The following describe a pointer to the eventual value in a Promise, on either branch (`promise/*`), or specifically the success (`promise/ok`) or failure (`promise/err`) branches.

```ipldsch
type Promise union {
  | InvokedTaskPointer "promise/*"
  | InvokedTaskPointer "promise/ok"
  | InvokedTaskPointer "promise/err"
} representation keyed
```

If there are dependencies or ordering required, then you need a promise pipeline

## 10.2 Pipelines

Pipelining uses promises as inputs to determine the required dataflow graph. The following examples both express the following dataflow graph:

### 10.2.1 Batched

![](./diagrams/batch-pipeline.svg)

```json
{
  "uiv": "0.1.0",
  "nnc": "abcdef",
  "prf": [
    { "/": "bafkreie2cyfsaqv5jjy2gadr7mmupmearkvcg7llybfdd7b6fvzzmhazuy" },
    { "/": "bafkreibbz5pksvfjyima4x4mduqpmvql2l4gh5afaj4ktmw6rwompxynx4" }
  ],
  "run": {
    "update-dns": {
      "with": "dns:example.com?TYPE=TXT",
      "do": "crud/update",
      "inputs": { "value": "hello world" }
    },
    "notify-bob": {
      "with": "mailto://alice@example.com",
      "do": "msg/send",
      "inputs": {
        "to": "bob@example.com",
        "subject": "DNSLink for example.com",
        "body": { "promise/ok": ["/", "update-dns"] }
      }
    },
    "notify-carol": {
      "with": "mailto://alice@example.com",
      "do": "msg/send",
      "inputs": {
        "to": "carol@example.com",
        "subject": "Hey Carol, DNSLink was updated!",
        "body": { "promise/ok": ["/", "update-dns"] }
      }
    },
    "log-as-done": {
      "with": "https://example.com/report",
      "do": "crud/update",
      "inputs": {
        "payload": {
          "from": "mailto://alice@exmaple.com",
          "to": ["bob@exmaple.com", "carol@example.com"],
          "event": "email-notification"
        },
        "_": [
          { "promise/ok": ["/", "notify-bob"] },
          { "promise/ok": ["/", "notify-carol"] }
        ]
      }
    }
  },
  "sig": {
    "/": {
      "bytes": "bdNVZn_uTrQ8bgq5LocO2y3gqIyuEtvYWRUH9YT-SRK6v_SX8bjt-VZ9JIPVTdxkWb6nhVKBt6JGpgnjABpOCA"
    }
  }
}
```

### 10.2 Serial Pipeline

![](./diagrams/serial-pipeline.svg)

```json
{
  "uiv": "0.1.0",
  "nnc": "abcdef",
  "prf": [
    { "/": "bafkreifzjut3te2nhyekklss27nh3k72ysco7y32koao5eei66wof36n5e" }
  ],
  "run": {
    "update-dns": {
      "with": "dns:example.com?TYPE=TXT",
      "do": "crud/update",
      "inputs": { "value": "hello world" }
    }
  },
  "sig": {
    "/": {
      "bytes": "kQHtTruysx4S8SrvSjTwr6ttTLzc7dd7atANUYT-SRK6v_SX8bjHegWoDak2x6vTAZ6CcVKBt6JGpgnjABpsoL"
    }
  }
}
```

```json
{
  "uiv": "0.1.0",
  "nnc": "12345",
  "prf": [
    { "/": "bafkreibbz5pksvfjyima4x4mduqpmvql2l4gh5afaj4ktmw6rwompxynx4" }
  ],
  "run": {
    "notify-carol": {
      "with": "mailto://alice@example.com",
      "do": "msg/send",
      "inputs": {
        "to": "carol@example.com",
        "subject": "Hey Carol, DNSLink was updated!",
        "body": {
          "promise/ok": [
            {
              "/": "bafkreieimb4hvcwizp74vu4xfk34oivbdojzqrbpg2y3vcboqy5hwblmeu"
            },
            "update-dns"
          ]
        }
      }
    }
  },
  "sig": {
    "/": {
      "bytes": "XZRSmp5cHaXX6xWzSTxQqC95kQHtTruysx4S8SrvSjTwr6ttTLzc7dd7atANUQJXoWThUiVuCHWdMnQNQJgiJi"
    }
  }
}
```

```json
{
  "uiv": "0.1.0",
  "nnc": "02468",
  "prf": [
    { "/": "bafkreibbz5pksvfjyima4x4mduqpmvql2l4gh5afaj4ktmw6rwompxynx4" }
  ],
  "run": {
    "notify-bob": {
      "with": "mailto://alice@example.com",
      "do": "msg/send",
      "inputs": {
        "to": "bob@example.com",
        "subject": "DNSLink for example.com",
        "body": {
          "promise/ok": [
            {
              "/": "bafkreieimb4hvcwizp74vu4xfk34oivbdojzqrbpg2y3vcboqy5hwblmeu"
            },
            "update-dns"
          ]
        }
      }
    },
    "log-as-done": {
      "with": "https://example.com/report",
      "do": "crud/update",
      "inputs": {
        "payload": {
          "from": "mailto://alice@exmaple.com",
          "to": ["bob@exmaple.com", "carol@example.com"],
          "event": "email-notification"
        },
        "_": [
          { "promise/ok": ["/", "notify-bob"] },
          {
            "promise/ok": [
              {
                "/": "bafkreidcqdxosqave5u5pml3pyikiglozyscgqikvb6foppobtk3hwkjn4"
              },
              "notify-carol"
            ]
          }
        ]
      }
    }
  },
  "sig": {
    "/": {
      "bytes": "5vNn4--uTeGk_vayyPuNTYJ71Yr2nWkc6AkTv1QPWSgetpsu8SHegWoDakPVTdxkWb6nhVKAz6JdpgnjABppC7"
    }
  }
}
```

# 11 Prior Art

[ucanto RPC](https://github.com/web3-storage/ucanto) from DAG House is a production system that uses UCAN as the basis for an RPC layer.

The [Capability Transport Protocol (CapTP)](http://erights.org/elib/distrib/captp/index.html) is one of the most influential object-capability systems, and forms the basis for much of the rest of the items on this list.

The [Object Capability Network (OCapN)](https://github.com/ocapn/ocapn) protocol extends CapTP with a generalized networking layer. It has implementations from the [Spritely Institute](https://www.spritely.institute/) and [Agoric](https://agoric.com/). At time of writing, it is in the process of being standardized.

[Electronic Rights Transfer Protocol (ERTP)](https://docs.agoric.com/guides/ertp/) builds on top of CapTP for blockchain & digital asset use cases.

[Cap 'n Proto RPC](https://capnproto.org/) is an influential RPC framework [based on concepts from CapTP](https://capnproto.org/rpc.html#specification).

# 12 Acknowledgements

Many thanks to [Mark Miller](https://github.com/erights) for his [pioneering work](http://erights.org/talks/thesis/markm-thesis.pdf) on [capability systems](http://erights.org/).

Many thanks to [Luke Marsen](https://github.com/lukemarsden) and [Simon Worthington](https://github.com/simonwo) for their feedback on invocation model from their work on [Bacalhau](https://www.bacalhau.org/) and [IPVM](https://github.com/ipvm-wg).

Many thanks to [Zeeshan Lakhani](https://github.com/zeeshanlakhani) for his many suggestions, references, clarifications, and suggestions on how to restructure sections for clarity.

Thanks to [Marc-Antoine Parent](https://github.com/maparent) for his discussions of the distinction between declarations and directives both in and out of a UCAN context.

Many thanks to [Quinn Wilton](https://github.com/QuinnWilton) for her discussion of speech acts, the dangers of signing canonicalized data, and ergonomics.

Thanks to [Blaine Cook](https://github.com/blaine) for sharing their experiences with OAuth 1, irreversible design decisions, and advocating for keeping the spec simple-but-evolvable.

Thanks to [Philipp Krüger](https://github.com/matheus23/) for the enthusiastic feedback on the overall design and encoding.

Thanks to [Christine Lemmer-Webber](https://github.com/cwebber) for the many conversations about capability systems and the programming models that they enable.

Thanks to [Rod Vagg](https://github.com/rvagg/) for the clarifications on IPLD Schema implicits and the general IPLD worldview.
