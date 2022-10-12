# w3up cli UX (for uploads)

This is "not the exactly current UX", but exploring what it "could/should" be.

## Upload
Unless otherwise noted, this will auto pack into a car, and split cars if needed.

Also, will add the "carCID" to a list of CIDs associated with account, and the root/roots of cars with the split/sharded cars. (see list)

#### expected:
```w3up upload someDir```  
This will upload a directory, as a car.

---
```w3up upload somefile```  
This will upload a file, as a car.  

---
```w3up upload somefile otherfile```  
This will upload files, as a car.

---
```w3up upload [folder/]*```  
This will upload **N** files, as a car.

---
```w3up upload somefile.car```  
This will upload a car, not packing it twice.

---
```w3up upload somefile.car someothrefile.car```  
This will upload two cars, not packing it twice.

---

```w3up upload [folder/]*.car```  
This will upload **N** cars, not packing it twice.

---

#### Questions:  
What if some folder contains cars?  
What if ```upload file.txt someCar.car```?
- Present some prompt (include cars in car, y/n/a)?
- Pack everything non-car into car, and upload car "beside it"?
- Allow flags to skip prompts?
    - skip-cars
    - include-cars

## List
```w3up list```  
This should list all uploads and cars(shards) associated with them.

Expected output:
| dataCID | shards | uploadedAt |
|--------|---------|---------|
|bafy... | [bag..., bag..., bag...]|10/22/22
|bafy... | [bag..., bag..., bag...]|10/02/22

---

```w3up list --cars``` or ```w3up list --stat```  
This should list all cars associated with account.

Expected output:
| carCID | uploadedAt | size |
|--------|---------|---------|
|bag... | 10/22/22| 123KB
|bag... | 10/02/22| 123MB
