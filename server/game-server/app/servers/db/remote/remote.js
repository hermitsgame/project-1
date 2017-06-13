module.exports = function(app) {
	return new DBRemote(app);
};

var DBRemote = function(app) {
	this.app = app
    DBRemote.dbService = this.app.get("dbService")
    if(DBRemote.dbService && DBRemote.dbService.db){
    	DBRemote.db = DBRemote.dbService.db
    }
    
}

var createAccount = function(result,cb) {
	DBRemote.dbService.setUserId(result.unionid,function(playerId) {
		var uid = playerId
		DBRemote.dbService.setPlayer(uid,"diamond",100)
		DBRemote.dbService.setPlayer(uid,"nickname",result.nickname)
		DBRemote.dbService.setPlayer(uid,"head",result.headimgurl)
		DBRemote.dbService.setPlayer(uid,"uid",uid)
		DBRemote.dbService.setPlayer(uid,"sex",result.sex)
		var history = {}
		history.allGames = 0
		history.List = {}
		DBRemote.dbService.setPlayerObject(uid,"history",history)
		cb(true)
	})
}
//每次登陆更新微信信息
var updateAccount = function(result) {
	var uid = result.playerId
	DBRemote.dbService.setPlayer(uid,"nickname",result.nickname)
	DBRemote.dbService.setPlayer(uid,"head",result.headimgurl)
	DBRemote.dbService.setPlayer(uid,"sex",result.sex)
}
//检查账号是否存在
DBRemote.prototype.check = function(result,cb) {
	//console.log("=================")
	//console.log("result.unionid : "+result.unionid)
	DBRemote.dbService.getPlayerString(result.unionid,"uidMap",function(data) {
		console.log("data : "+data)
		if(!data){
			createAccount(result,cb)
			console.log("create ok!!")
		}else{
			result.playerId = parseInt(data)
			updateAccount(result)
			if(cb){
				cb(true)
			}
		}
	})
}
//获取一个空闲ID
DBRemote.prototype.getPlayerId = function(cb) {
	DBRemote.dbService.db.get("nn:acc:lastid",function(err,data) {
		cb(data)
	})
} 

DBRemote.prototype.getPlayerInfoByUid = function(uid,cb) {
	DBRemote.dbService.getPlayerInfoByUid(uid,cb)
}

DBRemote.prototype.getPlayerInfo = function(uid,cb) {
	DBRemote.dbService.getPlayerInfo(uid,cb)
}
DBRemote.prototype.getNotify = function(cb) {
	DBRemote.dbService.getNotify(cb)
}
DBRemote.prototype.setValue = function(uid,name,value,cb) {
	console.log("uid : "+uid+" name : "+name+ " value : "+value)
	DBRemote.dbService.getPlayer(uid,name,function(data) {
		if(data != null){
			//console.log("data : "+data)
			//console.log('value :'+value)
			value = parseInt(data) + parseInt(value)
			//console.log('value :'+value)
			DBRemote.dbService.setPlayer(uid,name,value,cb)
		}else{
			if(cb){
				cb(false)
			}
		}
	})
}
DBRemote.prototype.setHistory = function(uid,record,cb) {
	console.log("uid : "+uid)
	console.log(record)
	DBRemote.dbService.getHistory(uid,function(data) {
		console.log("data : ")
		console.log(data)
		data.allGames += 1
		for(var i = 9;i > 0;i--){
			if(data.List[i - 1]){
				data.List[i] = data.List[i - 1]
			}
		}
		data.List[0] = record
		DBRemote.dbService.setHistory(uid,data)
		if(cb){
			cb()
		}
	})
}

DBRemote.prototype.getValue = function(uid,name,cb) {
	DBRemote.dbService.getPlayer(uid,name,cb)
}