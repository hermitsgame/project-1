//var gameHandle = require('../handler/handle');
var conf = require("../../../conf/niuniuConf.js").niuConf
var tips = require("../../../conf/tips.js").tipsConf
var async = require("async")
var openRoomLogger = require("pomelo-logger").getLogger("openRoom-log");
var httpConf = require("../../../conf/httpModule.js")
var diamondConf = require("../../../conf/needDiamondConf.js")
//console.log(conf)
module.exports = function(app) {
	return new GameRemote(app);
};
var local = {}
var GameRemote = function(app) {
	var self = this
	self.app = app
	GameRemote.app = app
	GameRemote.GameService = self.app.get("GameService")
	GameRemote.backendSessionService = self.app.get('backendSessionService');
	GameRemote.NodeNumber = 0
	//房间房主映射表
	GameRemote.roomHostList = {}
    GameRemote.dbService = self.app.get("dbService")
    if(GameRemote.dbService && GameRemote.dbService.db){
    	GameRemote.db = GameRemote.dbService.db
    }
};
//执行恢复操作
GameRemote.prototype.recover = function(cb) {
	var self = this
	GameRemote.GameService.setDB(GameRemote.dbService.db)
	console.log(GameRemote.app.getCurServer())
	console.log(GameRemote.app.getServerType())
	GameRemote.dbService.db.hgetall("gameServer:roomList",function(err,data) {
		GameRemote.GameService.roomList = data
		for(var index in GameRemote.GameService.roomList){
			if(index != "flag"){
    			var params = {}
    			params.gid = GameRemote.GameService.roomList[index]
    			//还原房间
    			getRoomDB("RoomMap",index,function(params,index) {
    				return function(data) {
		    			var roomId = parseInt(index)
		    			self.app.rpc.gameNode.remote.recoverRoom(null,params,roomId,JSON.parse(data),function(flag) {
		    				console.log(flag)
		    			})
    				}
    			}(params,index))
			}
		}
		// console.log(GameRemote.GameService.roomMap)
	})
	GameRemote.dbService.db.hgetall("gameServer:roomState",function(err,data) {
		GameRemote.GameService.roomState = data
		for(var index in GameRemote.GameService.roomState){
			if(index !== "flag"){
				if(GameRemote.GameService.roomState[index] === "false"){
					GameRemote.GameService.roomState[index] = false
				}else{
					GameRemote.GameService.roomState[index] = true
				}
			}
		}		
	})
	GameRemote.dbService.db.hgetall("gameServer:userMap",function(err,data) {
		GameRemote.GameService.userMap = {}
		for(var index in data){
			if(index !== "flag"){
				GameRemote.GameService.userMap[index] = parseInt(data[index])
			}
		}
	})
	GameRemote.dbService.db.hgetall("gameServer:roomHostList",function(err,data) {
		GameRemote.roomHostList = {}
		for(var index in data){
			if(index !== "flag"){
				GameRemote.roomHostList[index] = parseInt(data[index])
			}
		}
		// console.log("roomHostList")
		// console.log(data)
		// console.log(GameRemote.roomHostList)
	})
	GameRemote.dbService.db.hgetall("gameServer:RoomMap",function(err,data) {
		GameRemote.GameService.roomMap  = {}
		for(var index in data){
			if(index !== "flag"){
				GameRemote.GameService.roomMap[index] = JSON.parse(data[index])
			}
		}
		// console.log(GameRemote.GameService.roomList)
	})
    GameRemote.dbService.db.hgetall("gameServer:AgencyReopenList",function(err,data) {
        GameRemote.GameService.AgencyReopenList  = {}
        for(var index in data){
            if(index !== "flag"){
                GameRemote.GameService.AgencyReopenList[index] = JSON.parse(data[index])
            }
        }
        // console.log(GameRemote.GameService.AgencyReopenList)
    })
    GameRemote.dbService.db.hgetall("gameServer:agencyList",function(err,data) {
        GameRemote.GameService.agencyList  = {}
        for(var index in data){
            if(index !== "flag"){
                GameRemote.GameService.agencyList[index] = JSON.parse(data[index])
            }
        }
        console.log(GameRemote.GameService.agencyList)
    })
	cb()
}

//获取代开房数据
GameRemote.prototype.getAgencyRoom = function(uid,cb) {
	var data = GameRemote.GameService.getAgencyRoom(uid) || {}
	//当前玩家数据
	if(data){
		for(var index in data.List){
			if(data.List.hasOwnProperty(index)){
				//未开始或正在游戏中
				if(data.List[index].state == 0 || data.List[index].state == 1){
					data.List[index].players = GameRemote.GameService.RoomMap[data.List[index].roomId]
					data.List[index].agencyReopenInfo = GameRemote.GameService.AgencyReopenList[data.List[index].roomId]
				}
			}
		}
	}
	this.app.rpc.db.remote.getPlayerObject(null,uid,"refreshList",function(refreshList) {
		data.refreshList = refreshList
		if(cb){
			cb(data)
		}
	})
}

GameRemote.prototype.onFrame = function(uid, sid,code,params,cb) {
	console.log("onFrame : "+code)
	if(GameRemote.GameService.userMap[uid] !== undefined){
		var roomId = GameRemote.GameService.userMap[uid]
		params = {}
		params.gid = GameRemote.GameService.roomList[roomId]
		this.app.rpc.gameNode.remote.onFrame(null,params,uid,code,function (flag){
			cb(flag)
		})
	}else if(code == "agencyFinish"){
		var roomId = params.roomId
		params.gid = GameRemote.GameService.roomList[roomId]
		console.log("params.gid : "+params.gid)
		if(params.gid !== undefined && params.gid !== false){
			console.log(11111111)
			this.app.rpc.gameNode.remote.onFrame(null,params,uid,code,function (flag){
				if(flag){
					delete GameRemote.GameService.AgencyReopenList[roomId]
					delRoomDB("AgencyReopenList",roomId)
				}
				cb(flag)
			})
		}else{
			console.log(22222222)
			cb(false)
		}
	}else{
		cb(false)
	}
}

GameRemote.userConnectorMap = {}


//用户连接
GameRemote.prototype.userConnect = function(uid,sid,cb) {
	GameRemote.userConnectorMap[uid] = sid
	if(cb){
		cb()
	}
}

GameRemote.prototype.receive = function(uid, sid,code,params,cb) {
	var self = this
	//加入房间需要用户不在房间内
	if(code == "join"){
		if(!GameRemote.GameService.userMap[uid]){
			//无效条件判断
			if(typeof(params.roomId) != "number" || params.roomId < 0 
				|| GameRemote.GameService.roomList[params.roomId] === undefined || GameRemote.GameService.roomState[params.roomId]){
				//console.log("params.roomId : "+params.roomId)
				//console.log("type : "+typeof(params.roomId))
                //console.log(GameRemote.GameService.roomList[roomId])
                cb(false,{"code" : tips.NO_ROOM})
                return
			}
			async.waterfall([
				function(next) {
					//判断该房间房主是否开启近俱乐部成员可加入
					self.app.rpc.db.remote.checkClubLimit(null,GameRemote.roomHostList[params.roomId],uid,function(flag) {
						if(flag){
							next()
						}else{
			                cb(false,{"code" : tips.CLUB_LIMIT})
			                return
						}
					})
				},
				function() {
					var roomId = params.roomId
					params.gid = GameRemote.GameService.roomList[roomId]
					self.app.rpc.gameNode.remote.join(null,params,uid,sid,roomId,function(flag,msg,playerInfo){
						if(flag === true){
							GameRemote.GameService.userMap[uid] = roomId;
							setRoomDB("userMap",uid,roomId)
							if(GameRemote.GameService.RoomMap[roomId]){
								var info = {
									"uid" : playerInfo.uid,
									"nickname" : playerInfo.nickname,
									"head" : playerInfo.head
								}
								GameRemote.GameService.RoomMap[roomId].push(info)
								setRoomDB("RoomMap",roomId,JSON.stringify(GameRemote.GameService.RoomMap[roomId]))
							}
						}
						cb(flag,msg)
						return
					})
				}
			],function (err, result) {
				console.log(err)
				console.log(result)
				cb(false)
				return
		  	})
		}else{
			cb(false)
			return
		}
	}else if(code == "getRoomInfo"){
		//无效条件判断
		if(typeof(params.roomId) != "number" || params.roomId < 0 
			|| GameRemote.GameService.roomList[params.roomId] === undefined || GameRemote.GameService.roomState[params.roomId]){
			//console.log("params.roomId : "+params.roomId)
			//console.log("type : "+typeof(params.roomId))
            //console.log(GameRemote.GameService.roomList[roomId])
            cb(false,{"code" : tips.NO_ROOM})
            return
		}
		var roomId = params.roomId
		params.gid = GameRemote.GameService.roomList[roomId]
		self.app.rpc.gameNode.remote.getRoomInfo(null,params,uid,sid,roomId,function(flag){
			cb(flag)
		})
	}else if(code == "newRoom"){
		//无效数据判断
		if(!params.gameNumber || typeof(params.gameNumber) !== "number" || (params.gameNumber != 10 && params.gameNumber != 15 && params.gameNumber != 20)){
	      console.log("agency error   param.gameNumber : "+params.gameNumber)
	      cb(false)
	      return
	    }
		if(!params.playerNumber || typeof(params.playerNumber) !== "number" || (params.playerNumber != 6 && params.playerNumber != 9)){
	      console.log("agency error   param.playerNumber : "+params.playerNumber)
	      cb(false)
	      return
	    }
	    if(!params.gameType || !conf.GAME_TYPE[params.gameType]){
	    	console.log("agency error   param.gameType : "+params.gameType)
	    	cb(false)
	    	return
	    }
	    if(!params.consumeMode || params.consumeMode < 1 || params.consumeMode > 3){
	    	console.log("agency error   param.consumeMode : "+params.consumeMode)
	    	cb(false)
	    	return	    	
	    }
	    if(!diamondConf.getNeedDiamond(params.gameType,params.playerNumber,params.consumeMode,params.gameNumber)){
	    	console.log("无钻石配置")
	    	console.log(params)
	    	cb(false)
	    	return
	    }
	    self.app.rpc.db.remote.checkGameSwitch(null,params.gameType,function(flag) {
	    	if(flag == true){
			  async.waterfall([
					function(next) {
						//获取玩家钻石
						self.app.rpc.db.remote.getValue(null,uid,"diamond",function(data){
							next(null,data)
						})
					}, 
					function(data,next) {
						//console.log("a111111 : "+GameRemote.GameService.userMap[uid])
						//判断是否满足准入数额
						var diamond = data
						var needMond = diamondConf.getNeedDiamond(params.gameType,params.playerNumber,params.consumeMode,params.gameNumber)		
						if(diamond >= needMond && GameRemote.GameService.userMap[uid] === undefined){
							next(null)
						}else{
							cb(false,{"code" :tips.NO_DIAMOND})
						}
						return
					},
					function(next) {
						//console.log("a222222")
						//获取玩家信息
						//console.log(GameRemote.dbService)
						self.app.rpc.db.remote.getPlayerInfoByUid(null,uid,function(data) {
							next(null,data)
						})
					},
					function(playerInfo) {
						//console.log("a3333")
						//找到空闲房间ID
						delete playerInfo["history"]
						params.playerInfo = playerInfo
						var roomId = GameRemote.GameService.getUnusedRoom(params.gameType)
						if(roomId !== false){		
							//分配游戏服务器
							GameRemote.NodeNumber++
							var nodeLength = GameRemote.app.getServersByType('gameNode').length
							if(GameRemote.NodeNumber >= nodeLength){
								GameRemote.NodeNumber = 0
							}
							//记录房间对应游戏服务器
							GameRemote.GameService.roomList[roomId] = GameRemote.NodeNumber
							setRoomDB("roomList",roomId,GameRemote.NodeNumber)
							params.gid = GameRemote.GameService.roomList[roomId]
							//与游戏服务器连接
							self.app.rpc.gameNode.remote.newRoom(null,params,uid,sid,roomId,function (flag) {
								// console.log("======== : "+flag)
								if(flag === true){
									GameRemote.GameService.userMap[uid] = roomId;
									setRoomDB("userMap",uid,roomId)
									GameRemote.GameService.roomState[roomId] = false;
									setRoomDB("roomState",roomId,false)
									GameRemote.GameService.RoomMap[roomId] = []
									GameRemote.roomHostList[roomId] = uid
									setRoomDB("roomHostList",roomId,uid)
									var info = {
										"uid" : playerInfo.uid,
										"nickname" : playerInfo.playerInfo,
										"head" : playerInfo.head
									}
									GameRemote.GameService.RoomMap[roomId].push(info)
									setRoomDB("RoomMap",roomId,JSON.stringify(GameRemote.GameService.RoomMap[roomId]))
								}else{
									GameRemote.GameService.roomState[roomId] = true
									setRoomDB("roomState",roomId,true)
									GameRemote.GameService.roomList[roomId] = false
									delRoomDB("roomList",roomId)
								}
								cb(flag)
							})
						}else{
							cb(false,{"code" :tips.FULL_ROOM})
						}
					}
			  	], function (err, result) {
					console.log(err)
					console.log(result)
					cb(false)
					return
			  });
	    	}else{
	    		cb(false,{"code" : tips.GAME_CLOSE})
	    	}
	    })
	}else if(code == "agency"){
		//代开房
		//TODO  无效数据判断
	    if(!params.gameType || !conf.GAME_TYPE[params.gameType]){
	    	cb(false)
	    	return
	    }
		if(!params.gameNumber || typeof(params.gameNumber) !== "number" || (params.gameNumber != 10 && params.gameNumber != 15 && params.gameNumber != 20)){
	      console.log("agency error   param.gameNumber : "+params.gameNumber)
	      console.log(typeof(params.gameNumber))
	      console.log((params.gameNumber != 10 && params.gameNumber != 15 && params.gameNumber != 20))
	      cb(false)
	      return
	    }
		if(!params.playerNumber || typeof(params.playerNumber) !== "number" || (params.playerNumber != 6 && params.playerNumber != 9)){
	      console.log("agency error   param.playerNumber : "+params.playerNumber)
	      cb(false)
	      return
	    }
	    if(!params.consumeMode || params.consumeMode < 1 || params.consumeMode > 3){
	    	cb(false)
	    	return
	    }
	    if(!diamondConf.getNeedDiamond(params.gameType,params.playerNumber,params.consumeMode,params.gameNumber)){
	    	console.log("无钻石配置")
	    	console.log(params)
	    	cb(false)
	    	return
	    }	    
	    var roomId = 0
	    var needMond = 0

	    self.app.rpc.db.remote.checkGameSwitch(null,params.gameType,function(flag) {
	    	if(flag == true){
		    async.waterfall([
		    	function(next) {
		    		//检查有没有空闲房间
		    		if(params.reopenId && GameRemote.GameService.AgencyReopenList[params.reopenId] && !GameRemote.GameService.roomList[params.reopenId]){
		    			roomId = params.reopenId
		    		}else{
		    			roomId = GameRemote.GameService.getUnusedRoom(params.gameType)
		    		}
		    		if(roomId !== false){
		    			next()
		    		}else{
		    			cb(false,{"code" : tips.FULL_ROOM})
		    		}
		    	},
		    	function(next) {
					//获取玩家钻石
					self.app.rpc.db.remote.getValue(null,uid,"diamond",function(data){
						next(null,data)
					})	    		
		    	},
		    	function(data,next) {
		    		//检查钻石是否足够
					var diamond = data
					needMond = diamondConf.getNeedDiamond(params.gameType,params.playerNumber,"agency",params.gameNumber)				
					if(diamond < needMond){
						cb(false,{"code" : tips.NO_DIAMOND})
						return
					}else{
						next()
					}
		    	},
		    	function(next) {
		    		//代开房
		    		//分配游戏服务器
					GameRemote.NodeNumber++
					var nodeLength = GameRemote.app.getServersByType('gameNode').length
					if(GameRemote.NodeNumber >= nodeLength){
						GameRemote.NodeNumber = 0
					}
					//记录房间对应游戏服务器
					GameRemote.GameService.roomList[roomId] = GameRemote.NodeNumber
					setRoomDB("roomList",roomId,GameRemote.NodeNumber)
					params.gid = GameRemote.GameService.roomList[roomId]
					//与游戏服务器连接
					self.app.rpc.gameNode.remote.agencyRoom(null,params,uid,sid,roomId,function (flag) {
						// console.log("======== : "+flag)
						if(flag === true){
							GameRemote.GameService.roomState[roomId] = false;
							setRoomDB("roomState",roomId,false)
							GameRemote.roomHostList[roomId] = uid
							setRoomDB("roomHostList",roomId,uid)
	                        //保存代开房记录   state : 0 未开始   1 正在游戏中 2 已结束   3 已失效 
	                        var agencyRoomInfo = {
	                            "roomId" : roomId,
	                            "state" : 0,
	                            "gameType" : params.gameType,
	                            "gameNumber" : params.gameNumber,
	                            "gameMode" : params.gameMode,
	                            "cardMode" : params.cardMode,
	                            "basic" : params.basic,
	                            "basicType" : params.basicType,
	                            "maxBet" : params.maxBet,
	                            "maxRound" : params.maxRound,
	                            "stuffyRound" : params.stuffyRound,
	                            "beginTime" : (new Date()).valueOf(),
	                            "playerNumber" : params.playerNumber
	                        }
	                        GameRemote.GameService.setAgencyRoom(uid,agencyRoomInfo)
	                        GameRemote.GameService.RoomMap[roomId] = []
	                        setRoomDB("RoomMap",roomId,JSON.stringify(GameRemote.GameService.RoomMap[roomId]))
	                        if(GameRemote.GameService.AgencyReopenList[roomId]){
	                        	GameRemote.GameService.AgencyReopenList[roomId].count--
	                        	setRoomDB("AgencyReopenList",roomId,JSON.stringify(GameRemote.GameService.AgencyReopenList[roomId]))
	                        }else{
		                        GameRemote.GameService.AgencyReopenList[roomId] = {
		                        	"uid" : uid,
		                        	"params" : params,
		                        	"count" : 1
		                        }
		                        setRoomDB("AgencyReopenList",roomId,JSON.stringify(GameRemote.GameService.AgencyReopenList[roomId]))
	                        }
							next(null,roomId)
						}else{
							GameRemote.GameService.roomState[roomId] = true
							setRoomDB("roomState",roomId,true)
							GameRemote.GameService.roomList[roomId] = false
							delRoomDB("roomList",roomId)
							cb(false)
						}
					})
		    	},function(roomId) {
					//扣除钻石
					GameRemote.app.rpc.db.remote.setValue(null,uid,"diamond",-(needMond),function(flag) {
						if(!flag){
							//删除房间
							GameRemote.GameService.roomState[roomId] = true
							setRoomDB("roomState",roomId,true)
							GameRemote.GameService.roomList[roomId] = false
							delRoomDB("roomList",roomId)
							cb(false)
							return
						}
						//钻石消耗记录
						GameRemote.app.rpc.db.remote.setValue(null,uid,"useDiamond",needMond,function() {})
						httpConf.coinChangeRecord(uid,7,-needMond,roomId)
						cb(true,{"roomId" : roomId})
					})
		    	}
		    	], function (err, result) {
				console.log(err)
				console.log(result)
				cb(false)
				return
		  })
	    	}else{
	    		cb(false,{"code" : tips.GAME_CLOSE})
	    	}
	    })
	}else{
		//用户存在房间内时才执行
		//console.log("room id : " + GameRemote.GameService.userMap[uid])
		if(GameRemote.GameService.userMap[uid] !== undefined){
			var roomId = GameRemote.GameService.userMap[uid];
			if(roomId != undefined){
				if(!params){
					params = {}
				}
				params.gid = GameRemote.GameService.roomList[roomId]
				self.app.rpc.gameNode.remote.receive(null,params,uid,sid,roomId,code,function (flag){
					cb(flag)
				})
			}else{
			    cb(false)
			}
		}
		else{
			cb(false)
		}
	}
};

//游戏结束回调
GameRemote.prototype.gameOver = function(roomId,players,flag,agencyId,maxGameNumber,cb) {
	//解锁房间内玩家   清理房间  更新代开房记录
	var roomPlayerCount = 0
	for(var index in players){
		if(players.hasOwnProperty(index)){
			if(players[index].isActive){		
                roomPlayerCount++
                delete GameRemote.GameService.userMap[players[index].uid]
                delRoomDB("userMap",players[index].uid)
			}
		}
	}
	//更新代开房记录   state : 0 未结束   1 正在游戏中 2 已结束   3 已失效 
	if(agencyId){
		var agencyRoomInfo = GameRemote.GameService.getAgencyRoomByID(agencyId,roomId)
		agencyRoomInfo.endTime = (new Date()).valueOf()
		agencyRoomInfo.state = 2
		if(flag == true){
			agencyRoomInfo.state = 3
		}else{
			var agencyPlayer = {}
			var nowIndex = 0
			for(var index in players){
				if(players.hasOwnProperty(index)){
					if(players[index].isActive){
						agencyPlayer[nowIndex++] = {
							"name" : players[index].playerInfo.nickname,
							"score" : players[index].score,
							"uid" : players[index].uid
						}
					}
				}
			}
			agencyRoomInfo.player = agencyPlayer
		}
		GameRemote.GameService.setAgencyRoomByID(agencyId,roomId,agencyRoomInfo)
		//若为正常结束   则判断是否需要重开
		if(agencyRoomInfo.state == 2){
			if(GameRemote.GameService.AgencyReopenList[roomId] && GameRemote.GameService.AgencyReopenList[roomId].count > 1){
				//重开当局
				var tmpUid = GameRemote.GameService.AgencyReopenList[roomId].uid
				var tmpSid = GameRemote.userConnectorMap[tmpUid]
				var tmpParams = GameRemote.GameService.AgencyReopenList[roomId].params
				tmpParams.reopenId = roomId
				this.receive(tmpUid, tmpSid,"agency",tmpParams,function(flag) {
					if(!flag){
						delete GameRemote.GameService.AgencyReopenList[roomId]
						delRoomDB("AgencyReopenList",roomId)
					}
				})
			}else{
				delete GameRemote.GameService.AgencyReopenList[roomId]
				delRoomDB("AgencyReopenList",roomId)
			}
		}else{
			delete GameRemote.GameService.AgencyReopenList[roomId]
			delRoomDB("AgencyReopenList",roomId)
		}
	}

	GameRemote.GameService.roomState[roomId] = true
	setRoomDB("roomState",roomId,true)
	GameRemote.GameService.roomList[roomId] = false
	delRoomDB("roomList",roomId)
	delete GameRemote.GameService.RoomMap[roomId]
	delRoomDB("RoomMap",roomId)
	delete GameRemote.roomHostList[roomId]
	delRoomDB("roomHostList",roomId)
	//删除房间记录
	GameRemote.dbService.db.del("gameNodeRoom:"+roomId,function(err,data) {
		if(err){
			console.log(err)
		}
	})
	if(cb){
		cb()
	}
}

//修改代开房间剩余数量
GameRemote.prototype.changeAgencyReopenCount = function(uid,roomId,count,cb) {
	if(!count || typeof(count) !== "number" || count < 1 || count > 500){
		cb(false)
		return
	}
	if(!GameRemote.GameService.AgencyReopenList[roomId]){
		cb(false)
		return
	}
	var data = GameRemote.GameService.getAgencyRoom(uid)
	var flag = false
	if(data){
		for(var index in data.List){
			if(data.List.hasOwnProperty(index)){
				//未开始或正在游戏中
				if(data.List[index].roomId == roomId){
					flag = true
					break
				}
			}
		}
	}
	if(flag){
		GameRemote.GameService.AgencyReopenList[roomId].count = count
		setRoomDB("AgencyReopenList",roomId,JSON.stringify(GameRemote.GameService.AgencyReopenList[roomId]))
		cb(true)
	}else{
		cb(false)
	}
}

//游戏开始回调
GameRemote.prototype.gameBeginCB = function(roomId,agencyId,cb) {
	console.log("gameBeginCB========== agencyId : "+agencyId)
	//更新代开房数据
	if(agencyId){
		var agencyRoom = GameRemote.GameService.getAgencyRoomByID(agencyId,roomId)
		agencyRoom.state = 1
		GameRemote.GameService.setAgencyRoomByID(agencyId,roomId,agencyRoom)
	}
	if(cb){
		cb()
	}
}

GameRemote.prototype.kick = function(uid,cb) {
	console.log("user leave : "+uid)
	if(GameRemote.GameService.userMap[uid] != undefined){
		var roomId = GameRemote.GameService.userMap[uid]
		var params = {}
		params.gid = GameRemote.GameService.roomList[roomId]
		this.app.rpc.gameNode.remote.disconnect(null,params,uid,null,roomId,function (flag){
			cb(flag)
		})
	}
	if(cb){
		cb()
	}
};

//检测是否需要重连
GameRemote.prototype.reconnection = function(uid, sid,cb) {
	if(GameRemote.GameService.userMap[uid] !== undefined){
		var roomId = GameRemote.GameService.userMap[uid]
		var params = {}
		params.gid = GameRemote.GameService.roomList[roomId]
		this.app.rpc.gameNode.remote.reconnection(null,params,uid,sid,roomId,function (flag){
			cb(flag)
		})
	}else{
		cb()
	}
}

//用户退出房间
GameRemote.prototype.userQuit = function(uid,cb) {
	var roomId = GameRemote.GameService.userMap[uid]
	if(GameRemote.GameService.RoomMap[roomId]){
		for(var index in GameRemote.GameService.RoomMap[roomId]){
			if(GameRemote.GameService.RoomMap[roomId].hasOwnProperty(index)){
				if(GameRemote.GameService.RoomMap[roomId][index].uid == uid){
					GameRemote.GameService.RoomMap[roomId].splice(index,1)
					setRoomDB("RoomMap",roomId,JSON.stringify(GameRemote.GameService.RoomMap[roomId]))
					break;
				}
			}
		}
	}
	delete GameRemote.GameService.userMap[uid]
	setRoomDB("userMap",uid)
	cb(true)
}

//通知玩家
GameRemote.prototype.sendByUid = function(uid,notify,cb) {
	var params = {}
	params.cid = GameRemote.userConnectorMap[uid]
	if(params.cid){
		GameRemote.app.rpc.connector.remote.sendByUid(null,params,uid,notify,function(){})
	}
	cb()
}

var deepCopy = function(source) {
  var result={}
  for (var key in source) {
        result[key] = typeof source[key]==="object"? deepCopy(source[key]): source[key]
     } 
  return result;
}

var getRoomDB = function(hashKey,subKey,cb){
	GameRemote.dbService.db.hget("gameServer:"+hashKey,subKey,function(err,data) {
		if(err){
			cb(false)
		}else{
			cb(data)
		}
	})
}

var setRoomDB = function(hashKey,subKey,data,cb){
	GameRemote.dbService.db.hset("gameServer:"+hashKey,subKey,data,function(err,data) {
		if(err){
			console.log("setRoomDB error : "+err)
			if(cb){
				cb(false)
			}
		}else{
			console.log(data)
			if(cb){
				cb(data)
			}
		}
	})
}

var delRoomDB = function(hashKey,subKey) {
	GameRemote.dbService.db.hdel("gameServer:"+hashKey,subKey,function(err,data) {
		if(err){
			console.log(err)
		}
	})
}