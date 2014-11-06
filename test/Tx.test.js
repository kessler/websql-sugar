var assert = require('assert')
var Tx = require('../lib/Tx.js')

describe('Tx', function () {
	var tx, dbApi, txApi

	beforeEach(function () {
		
		// web sql db api mock
		dbApi = { 
			transaction: function (txCallback, errorCallback, successCallback) {
				this.transactionCalled = true
				// call txCallback and successCallback as if I was the database
				// if we have an error in this dummy db, call error instead
				var error = this.error
				setImmediate(function () {
					txCallback(txApi)
					
					if (error) {					
						callback = function () {
							errorCallback(new Error('test'))
							successCallback()
						}
					} else {					
						callback = successCallback
					}

					setImmediate(function () {
						setImmediate(callback)	
					})
				})
			}
		}

		// web sql tx api mock
		txApi = {	
			queries: [],
			executeSql: function (query, args, callback) {
				this.queries.push(query)
				setImmediate(callback)
			} 
		}

		tx = new Tx(dbApi)
	})

	it('executes a queries in a transaction', function (done) {

		var q1 = 'SELECT * FROM table1'
 		var q2 = 'SELECT * FROM table2'

		tx.query(q1).query(q2).execute(function (err, queries) {
			assert.strictEqual(queries.length, 2)
			assert.strictEqual(queries[0].query, q1)
			assert.strictEqual(queries[1].query, q2)
			
			assert(dbApi.transactionCalled)

			assert(txApi.queries.length, 2)
			assert.strictEqual(txApi.queries[0], q1)
			assert.strictEqual(txApi.queries[1], q2)
			done(err)
		})
	})

	it('throws an error if no queries were issued', function () {
		assert.throws(function () {
			tx.execute(function(err) {})
		})
	})

	it('throws an error if tx was already executed', function () {
		tx._executed = true
		assert.throws(function () {
			tx.query('1=1').execute()
		})	
	})
})