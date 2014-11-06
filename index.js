var util = require('util')
var _ = require('lodash')
var Tx = require('./lib/Tx')
var ReadonlyTx = require('./lib/ReadonlyTx')

/**
 * Creates a new websql datbase or connects to an existing one
 *
 * @param {Window} window - a browser window object
 * @param {String} options.name - name of the database (Required)
 * @param {String} options.version - version of the database (Require)
 * @param {String} options.description - description of the database (Default: name + ' database')
 * @param {Number} options.size - estimated size of the database (default 2m)
 *
 * @returns {Object} an api object to the database
 * @api public
 */
module.exports = function(window, options) {

	if (!options)
		throw new Error('must provide options argument that specifies database name and version')

	if (!options.name)
		throw new Error('missing database name (options.name)')

	if (!options.version)
		throw new Error('missing database version (options.version)')

	options.description = options.description || options.name + ' database'
	options.size = options.size || 2 * 1024 * 1024

	var db = window.openDatabase(options.name, options.version, options.description, options.size)


	/****************************************************/
	/*	public api										*/
	/****************************************************/

	var publicApi = {
		/**
		 *	core api
		 */
		tx: newTx,
		readonlyTx: newRtx,
		rtx: newRtx,

		/**
		 *	utils
		 */
		resetDb: resetDb,
		listTables: listTables,

		/**
		 *	The following are functions that should wrap user callback in db layer, they help reduce a lot of boilerplate code
		 */

		/**
		 *	return the rows of the first result set,
		 *
		 *	(if this is used in a batch context the other queries will be ignored)
		 */
		singleSelectCallback: singleSelectCallback,

		/**
		 *	given a result set, return the first item from the first query, or nothing
		 */
		singleValueCallback: singleValueCallback,

		/**
		 *	replies with a single result from an insert operation (most probably a new id)
		 */
		singleInsertCallback: singleInsertCallback

	}

	return publicApi

	/****************************************************/
	/*	implementation								*/
	/****************************************************/

	function newTx() {
		return new Tx(db)
	}

	function newRtx() {
		return new ReadonlyTx(db)
	}

	function resetDb(cb) {
		var tx = newTx()

		for (var i = 0; i < dbInfo.tables.length; i++) {
			var table = dbInfo.tables[i]
			tx.query('DROP TABLE ' + table)
		}

		tx.execute(cb)
	}

	function listTables(cb) {

		var tx = newTx()

		tx.query('select * from sqlite_master')

		tx.execute(singleSelectCallback(cb))
	}

	// TODO This is probably not the best idea in the world
	// since it is implemented by copying the results to a new
	// array (more memory and more iteration)
	// so at some point the future I might want to improve on this
	function singleSelectCallback(cb) {
		return function ssc(err, queryCommands) {
			if (err) return printAndCallback(cb, err)

			if (util.isArray(queryCommands)) {

				if (queryCommands.length >= 1 &&
					queryCommands[0] instanceof QueryCommand) {

					var realResults = []
					var rows = queryCommands[0].result.rows

					for (var i = 0; i < rows.length; i++) {
						realResults.push(rows.item(i))
					}

					cb(null, realResults, queryCommands)

				} else {
					cb(null)
				}

			} else {
				throw new Error('invalid use of singleSelectCallback')
			}
		}
	}

	function singleValueCallback(cb) {
		return function ssc(err, queryCommands) {
			if (err) return printAndCallback(cb, err)

			if (util.isArray(queryCommands) && queryCommands.length >= 1 && queryCommands[0] instanceof QueryCommand) {

				if (queryCommands[0].result.rows.length >= 1) {
					cb(null, queryCommands[0].result.rows.item(0))
				} else {
					cb()
				}

			} else {
				throw new Error('invalid use of singleValueCallback')
			}
		}
	}

	function singleInsertCallback(cb) {
		return function sic(err, queryCommands) {
			if (err) return printAndCallback(cb, err)

			// websql api really sucks
			return cb(null, queryCommands[0].result.insertId)
		}
	}
}
