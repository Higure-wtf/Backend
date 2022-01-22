# Higure.wtf Backend


This is the backend used on higure.wtf, It is based on clippy's backend. Recommend using [the imgs.bar v1 backend](https://github.com/imgs-bar/Backend) since that has more features and better security.


## How to fix counter error?
```
mongo

use database

db.counters.insert({"_id": "counter"})
```

