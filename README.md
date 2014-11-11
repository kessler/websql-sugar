# websql-sugar

Using this to build data access layers on top of websql, e.g:

```
var db = require('websql-sugar')({ name: 'mydb', version: '1.1' })

module.exports = {
    listScans: function (cb) {
        // readonly api
        // select queries can be issued from newTx() too 
        // the singleSelectCallback will require the user of the result to write less boilerplate code
        // and just handle the actual data
        db.newRtx().query('SELECT * FROM scan').execute(db.singleSelectCallback(cb))
    },

    insertFoo: function (x, y, cb) {
        db.newTx()
            .query('INSERT INTO foo (x, y) VALUES (?, ?)',[x, y])
            .execute(db.singleInsertCallback(cb))
    },

    updateScan: function (endTime, infected, id, cb) {
        db.newTx()
            // can just pass the arguments if they appear in the same order of the query parameters
            .query('UPDATE scan SET end=?, infected=? WHERE id=?', arguments) 
            .execute(db.singleSelectCallback(cb))
    }    
}
```

### Why?

1. who designs a properties that throws exceptions? printing objects is like walking in a mine field.

2. the callbacks are not node.js style :(
