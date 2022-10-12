# W3UP interface

```
interface StoreAdd {
    can: 'store/add'
    with: AccountDID
    nb: {
        link: CID
        size: [number]
        origin: [CID] (default to empty CID bafkqaaa)
    }
}

interface StoreList {
    can: 'store/list'
    with: AccountDID
    nb: {
     limit: number     //paging
     // some cursor thing
    }
}

interface StoreRemove {
    can: 'store/remove'
    with: AccountDID
    nb: {
        link: CID
    }
}

interface UploadAdd {
    can: 'upload/add'
    with: AccountDID
    nb: {
        root: CID
        shards: [CID]
    }
}
interface UploadList {
    can: 'upload/list'
    with: AccountDID
    nb: {
     limit: number     //paging
     //some cursor thing
    }
}
interface UploadRemove {
    can: 'upload/remove'
    with: AccountDID
    nb: {
     root: CID
    }
}
```

## implementations

### Store Add
Links a "link" CID (car) to an account.
generates a signed URL to upload the linked CID.

optionally:
adds an origin to point to another CID that is part of same "data set".


### Store List
Lists the link CIDs (cars) associated with given account, optionally paged/etc.

| carCID | origin | size | uploadedAt |
|--------|--------|------|-------|
|bag...  |bag.... or baf...(empty cid) | 123|1231298
|bag...  |bag.... or baf...(empty cid) | 321|23423432

### Store Remove
unlinks some link CID (car) from given account.
CAR stays in bucket.

### Upload Add
Links a "root" data CID to account (dag cid).
Links that "root" to X car/shard CIDs.

### Upload List
Lists the link CIDs (cars) associated with given account, optionally paged/etc.

| dataCID | shards | uploadedAt |
|--------|-------- |------|
|baf...  | [bag..., bag...]| 1231298
|bag...  | [bag..., bag...]| 23423432

### Upload Remove
unlinks some root data CID from given account.
