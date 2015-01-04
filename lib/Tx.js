/*
	turn web sql api into something more nodish and nicer
*/
var _ = require('lodash')
var QueryCommand = require('./QueryCommand.js')
var util = require('util')

module.exports = Tx

function Tx(db) {
	if (!(this instanceof Tx)) return new Tx(db)

	this._db = db
	this._queryCommands = []

	// make it easier to override in subclasses
	this._execTransaction = _.bind(db.transaction, db)

	this._executed = false
}

/*
	chain one or more queries in the transaction
*/
Tx.prototype.query = function (query, args) {

	// transform to array if its a arguments object
	if (args && !util.isArray(args)) {
		args = this.params(args)
	}

	var queryCommand = new QueryCommand(query, args)

	this._currentQuery = queryCommand.id = this._queryCommands.push(queryCommand)

	return this
}

/*
	execute the transaction
*/
Tx.prototype.execute = function(fn) {

	if (this._executed)
		throw new Error('this transaction was already executed, create a new one yourself or using copy()')

	if (this._queryCommands.length === 0)
		throw new Error('no queries queued, use query() first')

	if (typeof(fn) !== 'function')
		throw new Error('must provide a callback')

	this._txUserCallback = fn

	this._execTransaction(
		_.bind(this._txCallback, this),
		_.bind(this._txErrorCallback, this),
		_.bind(this._txSuccessCallback, this)
	)
}

/*
	create a fresh copy, ready for execution of this transaction
*/
Tx.prototype.copy = function() {
	var tx = this._newLikeThis()

	for (var i = 0; i < this._queryCommands.length; i++) {
		var queryCommand = this._queryCommands[i]
		tx.query(queryCommand.query, queryCommand.args)
	}

	return tx
}

/*
	turn function arguments object into database arguments
*/
Tx.prototype.params = function (args) {
	// just a callback no arguments
	if (args.length < 2) {
		return []
	}

	var result = []

	// copy all arguments except the last one (which is a callback)
	for (var i = 0, len = args.length - 1; i < len; i++) {
		result.push(args[i])
	}

	return result
}

Tx.prototype._newLikeThis = function() {
	return new Tx(this._db)
}

/*
	run all the queries inside the tx context
*/
Tx.prototype._txCallback = function(tx) {
	this._executed = true

	var queryCommands = this._queryCommands

	for (var i = 0; i < queryCommands.length; i++) {
		var command = queryCommands[i]
		var successCallback = _.bind(this._executeSqlSuccessCallback, this, command)
		var errorCallback = _.bind(this._executeSqlErrorCallback, this, command)
		tx.executeSql(command.query, command.args, successCallback, errorCallback)
	}
}

//TODO need to replace _txErrorCallback and _txSuccessCallback
// with a single method, but in order to do that I need to know what
// happens with errors that are not the result of executeSql() (if
// there are errors like that)
Tx.prototype._txErrorCallback = function(err) {
	this._txUserCallback(err)
}

Tx.prototype._txSuccessCallback = function() {
	this._txUserCallback(this._error, this._queryCommands)
}

Tx.prototype._executeSqlSuccessCallback = function(queryCommand, tx, result) {
	queryCommand.result = result

	// an attempt to make api a little simpler for accessing results
	if (result) {
		queryCommand.rowsAffected = result.rowsAffected

		if (result.rows) {
			queryCommand.rows = result.rows
		}
	}
}

Tx.prototype._executeSqlErrorCallback = function(queryCommand, tx, err) {
	this._error = err
	queryCommand.error = err
	err.query = queryCommand.query
}
