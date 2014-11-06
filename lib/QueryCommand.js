module.exports = QueryCommand

function QueryCommand(query, args) {
	if (!(this instanceof QueryCommand)) return new QueryCommand(query, args)
		
	this.query = query
	this.args = args
}