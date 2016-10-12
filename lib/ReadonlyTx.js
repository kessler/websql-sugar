var bind = require('lodash.bind')
var inherits = require('util').inherits
var Tx = require('./Tx.js')

module.exports = ReadonlyTx

inherits(ReadonlyTx, Tx)
function ReadonlyTx(db) {
	if (!(this instanceof ReadonlyTx)) return new ReadonlyTx(db)

	Tx.call(this, db)

	// override default db.transaction with .readTransaction
	this._execTransaction = bind(db.readTransaction, db)
}

Tx.prototype._newLikeThis = function() {
	return new ReadonlyTx(this._db)
}
