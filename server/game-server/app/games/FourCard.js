//四咖
var logic = require("./logic/FourCardLogic.js")
var conf = require("../conf/niuniuConf.js").niuConf
var tips = require("../conf/tips.js").tipsConf
var frameFactory = require("./frame/frame.js")
var MING_CARD_NUM = 3               //明牌数量
//游戏状态
var minBet = 5
var maxBet = 50
//创建房间
module.exports.createRoom = function(roomId,db,channelService,playerNumber,gameBegincb,gameOvercb) {
  console.log("createRoom"+roomId)
  var roomBeginCB = gameBegincb
  var roomCallBack = gameOvercb
  var frame = frameFactory.createFrame()
  var gameDB = db
  var room = {}
  room.roomId = roomId
  room.roomType = "fourCard"
  room.isRecord = true
  room.channel = channelService.getChannel(roomId,true)
  room.handle = {}   //玩家操作
  room.halfwayEnter = true             //允许中途加入
  room.agencyId = 0                    //代开房玩家ID
  room.beginTime = (new Date()).valueOf()
  room.MatchStream = {}
  //房间初始化
  var local = {}                       //私有方法
  var player = {}                      //玩家属性
  var gameState = conf.GS_FREE         //游戏状态
  var banker = -1                      //庄家椅子号
  var roomHost = -1                    //房主椅子号
  var timer                            //定时器句柄
  room.GAME_PLAYER = playerNumber      //游戏人数
  GAME_PLAYER = playerNumber
  var curPlayer = -1                   //当前操作玩家
  var curRound = 0                     //当前轮数
  var curBet = 0                       //当前下注
  var result = {}                      //牌型
  var basic = 0                        //房间底分
  var actionFlag = true                //行动标志
  var tmpGameState = 0
  //游戏属性
  var cards = {}                       //牌组
  var cardCount = 0                    //卡牌剩余数量
  var cardSlot = {}
  for(var i = 1;i <= 13;i++){
    for(var j = 0;j < 4;j++){
      cards[cardCount++] = {num : i,type : j}
    }
  }
  //斗公牛模式积分池
  var robState,betList
  room.runCount = 0
   //房间初始化
   local.init = function() {
      //console.log("enter init=====================================")
      room.gameMode = conf.MODE_GAME_FOURCARD//游戏模式
      room.gameNumber = 0                  //游戏局数
      room.maxGameNumber = 0               //游戏最大局数
      room.consumeMode = 0                 //消耗模式
      room.bankerMode  = 0                 //定庄模式
      //房间属性
      room.state = true                    //房间状态，true为可创建
      room.playerCount  = 0                //房间内玩家人数
      room.xsjFlag = false                 //瞎眼杀九点
      room.zsxFlag = false                 //庄杀闲
      gameState = conf.GS_FREE              //游戏状态
      room.chairMap = {}                   //玩家UID与椅子号映射表
      banker = -1                      //庄家椅子号
      roomHost = -1                    //房主椅子号
      timer = undefined                //定时器句柄
      curRound = 0
      //游戏属性
      robState = new Array(GAME_PLAYER) //抢庄状态记录
      cards = {}                       //牌组
      cardCount = 0                    //卡牌剩余数量
      for(var i = 1;i <= 13;i++){
        for(var j = 0;j < 4;j++){
          cards[cardCount++] = {num : i,type : j}
        }
      }
      //console.log("enter init=====================================111111111111111")
      //下注信息
      betList = new Array(GAME_PLAYER)
      for(var  i = 0;i < GAME_PLAYER;i++){
        betList[i] = 0
      }
      //玩家属性
      player = {}
      for(var i = 0;i < GAME_PLAYER;i++){
        local.initChairInfo(i)
      }    
      channelService.destroyChannel(roomId)
      room.channel = channelService.getChannel(roomId,true)
      }
      local.newRoom = function(uid,sid,param,cb) {
      //console.log("newRoom")
      log("newRoom"+uid)
        //无效条件判断
      if(!param.consumeMode || typeof(param.consumeMode) !== "number" || param.consumeMode > 3 || param.consumeMode < 0){
        log("newRoom error   param.consumeMode : "+param.consumeMode)
        cb(false)
        return
      }
      if(!param.gameNumber || typeof(param.gameNumber) !== "number"){
        log("newRoom error   param.gameNumber : "+param.gameNumber)
        cb(false)
        return
      }
      if(!param.bankerMode || typeof(param.bankerMode) !== "number" || 
        (param.bankerMode != conf.MODE_BANKER_ROB && param.bankerMode != conf.MODE_BANKER_HOST && param.bankerMode != conf.MODE_BANKER_ORDER)){
        log("newRoom error   param.bankerMode : "+param.bankerMode)
        cb(false)
        return
      }
      if(!param.cardMode || typeof(param.cardMode) !== "number" || param.cardMode > 2 || param.cardMode < 0){
        log("newRoom error   param.cardMode : "+param.cardMode)
        cb(false)
        return
      }
      if(typeof(param.waitMode) !== "number" || param.waitMode < 0 || param.waitMode > 2){
        log("newRoom error   param.waitMode : "+param.waitMode)
        cb(false)
        return
      }
      if(param.xsj === true){
        room.xsjFlag = true
      }
      if(param.zsx === true){
        room.zsxFlag = true
      }
      frame.start(param.waitMode)
      logic.init(room.xsjFlag)
      room.waitMode = param.waitMode
      //是否允许中途加入
      if(param.halfwayEnter === false){
        room.halfwayEnter = false
      }
      //房间初始化
      local.init()
      basic = param.basic
      room.state = false
      room.playerCount  = 0            //房间内玩家人数
      gameState = conf.GS_FREE         //游戏状态
      room.chairMap = {}               //玩家UID与椅子号映射表
      roomHost = 0                     //房主椅子号
      banker = roomHost                //庄家椅子号
      room.gameNumber = param.gameNumber                 //游戏局数
      room.bankerMode = param.bankerMode                 //定庄模式
      room.maxGameNumber = param.gameNumber              //游戏最大局数
      room.consumeMode = param.consumeMode               //消耗模式
      room.cardMode = param.cardMode                     //明牌模式
      //备份
      local.backups(function() {
        cb(true)
      })
    }
    room.handle.agency = function(uid,sid,param,cb) {
      local.newRoom(uid,sid,param,function(flag) {
        if(flag){
          roomHost = -1
          room.agencyId = uid
          room.consumeMode = "agency"
          //备份
          local.backups()
        }
        cb(flag)
      })
    }
    //创建房间
    room.handle.newRoom = function(uid,sid,param,cb) {
      local.newRoom(uid,sid,param,function(flag) {
        if(flag){
          room.handle.join(uid,sid,{ip : param.ip,playerInfo : param.playerInfo},cb)
        }else{
          cb(false)
        }
      })
    }

    //玩家加入
    room.handle.join = function(uid,sid,param,cb) {
      log("serverId"+sid)
      //房间未创建不可加入
      if(room.state == true){
        cb(false)
        return
      }
      //是否允许中途加入
      if(room.halfwayEnter == false && room.isBegin()){
        cb(false,tips.CANT_HALF_JOIN)
        return
      }
      //不可重复加入
      for(var i = 0;i < GAME_PLAYER;i++){
        if(player[i].uid === uid){
          cb(false)
          return
        }
      }
      //查找空闲位置
      var chair = -1
      for(var i = 0;i < GAME_PLAYER;i++){
        if(player[i].isActive === false){
          chair = i
          break
        }
      }
      log("chair : "+chair)
      if(chair == -1 || !player[chair]){
        cb(false,tips.ROOM_FULL)
        return
      }
      //初始化玩家属性
      room.chairMap[uid] = chair
      player[chair].isActive = true
      player[chair].isOnline = true
      player[chair].isNoGiveUp = true //true表示未放弃
      player[chair].uid = uid
      player[chair].ip = param.ip
      player[chair].playerInfo = param.playerInfo
      //玩家数量增加
      room.playerCount++

      var notify = {
        cmd: "userJoin",
        uid: uid,
        chair : chair,
        player : player[chair]
      }
      local.sendAll(notify)


      if(!room.channel.getMember(uid)){
        room.channel.add(uid,sid)
      }
      notify = local.getRoomInfo(chair)
      local.sendUid(uid,notify)
      setRoomDB(room.roomId,"player",JSON.stringify(player))
      setRoomDB(room.roomId,"chairMap",JSON.stringify(room.chairMap))      
      cb(true)
    }
    room.handle.ready = function(uid,sid,param,cb) {
      var chair = room.chairMap[uid]
      if(chair === undefined){
        cb(false)
        return
      }
      var tmpBanker = -1
      if(room.bankerMode == conf.MODE_BANKER_HOST){
        tmpBanker = banker
      }
      frame.ready(uid,chair,player,gameState,local,local.chooseBanker,tmpBanker,cb)
    }
    //定庄阶段  有抢庄则进入抢庄
    local.chooseBanker = function() {
      gameState = conf.GS_ROB_BANKER
      local.backups(function() {
        switch(room.bankerMode){
          case conf.MODE_BANKER_ROB :
            //初始化抢庄状态为false
            for(var i = 0; i < GAME_PLAYER;i++){
              robState[i] = 0
            }
            //抢庄
            var notify = {
              "cmd" : "beginRob"
            }
            local.sendAll(notify)
            timer = setTimeout(local.endRob,conf.TID_ROB_TIME)    
            break
          case conf.MODE_BANKER_ORDER :
            //轮庄
            do{
                banker = (banker + 1)%GAME_PLAYER
            }while(player[banker].isActive == false || player[banker].isReady == false)
            local.gameBegin()
            break
          case conf.MODE_BANKER_HOST :
            //房主当庄
            banker = roomHost
            if(roomHost === -1){
              banker = 0
            }
            local.gameBegin()
            break
          default:
            local.gameBegin()
            break
        }
      })
    }
    //下注通知
    local.betMessege = function(chair,bet) {
      var notify = {
        "cmd" : "bet",
        "chair" : chair,
        "bet" : bet
      }
      local.sendAll(notify)
    }
    //结束抢庄
    local.endRob = function() {
      //统计抢庄人数
      var num = 0
      var robList = {}
      for(var i = 0; i < GAME_PLAYER;i++){
        if(robState[i] == 1){
          robList[num++] = i
        }
      }
      console.log("endRob num : "+num)
      //无人抢庄将所有参与游戏的玩家加入抢庄列表
      if(num == 0){
        for(var i = 0; i < GAME_PLAYER;i++){
          //console.log("i : "+i +"player[i].isActive : "+player[i].isActive+" player[i].isReady : "+ player[i].isReady)
          if(player[i].isActive && player[i].isReady){
            robList[num++] = i
          }
        }
      }
      //console.log("num : "+num)
      //随机出一个庄家
      var index = Math.floor(Math.random() * num)%num
      //console.log("index : "+index)
      num = robList[index]
      

      banker = num

      local.gameBegin()
    }
    //游戏开始
    local.gameBegin = function(argument) {
      log("gameBegin") 
      gameState = conf.GS_GAMEING
      frame.begin()
      //第一次开始游戏调用游戏开始回调
      if(room.gameNumber === room.maxGameNumber){
        roomBeginCB(room.roomId,room.agencyId)
      }
      room.gameNumber--
      //重置下注信息
      for(var i = 0;i < GAME_PLAYER;i++){
        if(player[i].isReady){
          betList[i] = 0
          player[i].isShowCard = false    
        }
      }
      cardSlot = {}
      //换一副新牌
      cards = {}                       //牌组
      cardCount = 0                    //卡牌剩余数量
      for(var i = 1;i <= 13;i++){
        for(var j = 0;j < 4;j++){
          cards[cardCount++] = {num : i,type : j}
        }
      }
      //洗牌
      for(var i = 0;i < cardCount;i++){
        var tmpIndex = Math.floor(Math.random() * (cardCount - 0.000001))
        var tmpCard = cards[i]
        cards[i] = cards[tmpIndex]
        cards[tmpIndex] = tmpCard
      }
      var index = 0
      //发牌
      for(var i = 0;i < GAME_PLAYER;i++){
        if(player[i].isActive && player[i].isReady){
          for(var j = 0;j < 4;j++){
            player[i].handCard[j] = cards[index++];
          }
        }
      }
      //明牌模式发牌
      if(room.cardMode == conf.MODE_CARD_SHOW){
        var notify = {
          "cmd" : "MingCard"
        }
        for(var i = 0;i < GAME_PLAYER;i++){
          if(player[i].isActive && player[i].isReady){
            var tmpCards = {}
            for(var j = 0;j < MING_CARD_NUM;j++){
                tmpCards[j] = player[i].handCard[j];
            }
            notify.Cards = tmpCards
            local.sendUid(player[i].uid,notify)
          }
        }
      }
      //进入下注
      local.betting()
    }
    //下注阶段
    local.betting = function() {
      //状态改变
      gameState = conf.GS_BETTING
      //通知客户端
      var notify = {
        cmd : "beginBetting",
        banker : banker
      }
      local.sendAll(notify)
      //定时器启动下一阶段
      local.backups(function() {
        timer = setTimeout(local.deal,conf.TID_BETTING)
      })
    }
    //开牌阶段
    local.deal = function(){
        log("deal")
        gameState = conf.GS_DEAL
        //若玩家未下注默认下底分
        //默认底分
        for(var i = 0; i < GAME_PLAYER;i++){
            if(player[i].isReady && player[i].isActive && i != banker && betList[i] == 0){
              betList[i] = minBet
              local.betMessege(i,betList[i])
            }
        }
        var tmpCards = {}
        cardSlot = {}
        //发牌
        for(var i = 0;i < GAME_PLAYER;i++){
            if(player[i].isReady){
              tmpCards[i]= player[i].handCard
            }
        }
        var notify = {
          "cmd" : "deal",
          "handCards" : tmpCards
        }
        for(var i = 0;i < GAME_PLAYER;i++){
          if(player[i].isActive){
            local.sendUid(player[i].uid,notify)
          }
        }
        local.backups(function() {
          timer = setTimeout(function(){
            gameState = conf.GS_FREE
            local.settlement()
          },5 * 60 * 1000)
        })
    }
    //结算
    local.settlement = function() {
      if(gameState !== conf.GS_SETTLEMENT){
        room.runCount++
        clearTimeout(timer)
        gameState = conf.GS_SETTLEMENT
        //默认自动组牌
        for(var i = 0;i < GAME_PLAYER;i++){
            if(player[i].isReady && !cardSlot[i]){
              cardSlot[i] = logic.getDraw(player[i].handCard)
            }
        }
        //发送组牌消息
        var tmpNotify = {
          "cmd" : "drawCards",
          "cardSlot" : cardSlot
        }
        local.sendAll(tmpNotify)
        var curScores = new Array(GAME_PLAYER)
        for(var i = 0;i < GAME_PLAYER;i++){
          curScores[i] = 0
        }
        var tmpResult = {}
        //计算积分
        var tmpHandCard = {}
        tmpHandCard[0] = player[banker].handCard[cardSlot[banker][0]]
        tmpHandCard[1] = player[banker].handCard[cardSlot[banker][1]]
        var tmpBankerResult1 = logic.getType(tmpHandCard) //庄家1
        tmpHandCard[0] = player[banker].handCard[cardSlot[banker][2]]
        tmpHandCard[1] = player[banker].handCard[cardSlot[banker][3]]
        var tmpBankerResult2 = logic.getType(tmpHandCard) //庄家2

        for(var i = 0;i < GAME_PLAYER;i++){
          if(player[i].isActive && player[i].isReady){
              if(i === banker || player[i].isReady != true) continue
              //比较大小
              tmpHandCard[0] = player[i].handCard[cardSlot[i][0]]
              tmpHandCard[1] = player[i].handCard[cardSlot[i][1]]
              var tmpResult1 = logic.getType(tmpHandCard) //闲家1
              //庄家1与闲家1比
              var flag1 = logic.compare(tmpBankerResult1,tmpResult1)
              //同点同牌庄杀闲
              if(room.zsxFlag){
                if( (player[banker].handCard[cardSlot[banker][0]].num == tmpHandCard[0].num && player[banker].handCard[cardSlot[banker][1]].num == tmpHandCard[1].num) ||
                    ((player[banker].handCard[cardSlot[banker][1]].num == tmpHandCard[0].num && player[banker].handCard[cardSlot[banker][0]].num == tmpHandCard[1].num))){
                  flag1 = true
                }
              }
              tmpHandCard[0] = player[i].handCard[cardSlot[i][2]]
              tmpHandCard[1] = player[i].handCard[cardSlot[i][3]]
              var tmpResult2 = logic.getType(tmpHandCard) //闲家2
              //庄家2与闲家2比
              var flag2 = logic.compare(tmpBankerResult2,tmpResult2)
              //同点同牌庄杀闲
              if(room.zsxFlag){
                if( (player[banker].handCard[cardSlot[banker][2]].num == tmpHandCard[0].num && player[banker].handCard[cardSlot[banker][3]].num == tmpHandCard[1].num) ||
                    ((player[banker].handCard[cardSlot[banker][3]].num == tmpHandCard[0].num && player[banker].handCard[cardSlot[banker][2]].num == tmpHandCard[1].num))){
                  flag2 = true
                }
              }
              tmpResult[i] = []
              tmpResult[i].push(!flag1)
              tmpResult[i].push(!flag2)
              if(flag1 == true && flag2 == true){
                  //庄家赢
                  curScores[i] -= betList[i]
                  curScores[banker] += betList[i]
              }else if(flag1 == false && flag2 == false){
                  //闲家赢
                  curScores[i] += betList[i]
                  curScores[banker] -= betList[i]
              }
          }
        }
        //积分改变
        for(var i = 0;i < GAME_PLAYER;i++){
          if(curScores[i] != 0){
            local.changeScore(i,curScores[i])
          }
        }
        var realScores = {}
        //返回玩家实际分数
        for(var i = 0;i < GAME_PLAYER;i++){
          realScores[i] = player[i].score
        }
        //发送当局结算消息
        var notify = {
          "cmd" : "settlement",
          "stateList" : tmpResult,
          "curScores" : curScores,
          "realScores" : realScores,
          "player" : player
        }
        local.sendAll(notify)
        //记录牌局流水
        var stream = {}
        for(var i = 0; i < GAME_PLAYER;i++){
          if(player[i].isActive && player[i].isReady){
            stream[i] = {
              "uid" : player[i].uid,
              "result" : result[i],
              "handCard" : deepCopy(player[i].handCard),
              "changeScore" : curScores[i]
            }
          }
        }
        room.MatchStream[room.runCount] = stream
        //TODO 房间重置
        gameState = conf.GS_FREE
        for(var i = 0;i < GAME_PLAYER; i++){
          player[i].isReady = false
          player[i].isNoGiveUp = true
          player[i].isShowCard = false
        }
        if(room.gameNumber <= 0){
          local.gameOver()
        }
      }
    }
    local.gameOver = function(flag) {
      clearTimeout(timer)
      //总结算
      room.state = true
      var notify = {
        "cmd" : "gameOver",
        "player" : player
      }
      local.sendAll(notify)
      room.endTime = (new Date()).valueOf()
      var tmpscores = {}
      for(var i = 0; i < GAME_PLAYER;i++){
        if(player[i].isActive){
          tmpscores[player[i].uid] = player[i].score
        }
      }
      room.scores = tmpscores
      frame.close()
      //结束游戏
      roomCallBack(room.roomId,player,flag,local.init)
    }
    //发送聊天
    room.handle.say = function(uid,sid,param,cb) {
      //判断是否在椅子上
      var chair = room.chairMap[uid]
      if(chair == undefined){
        cb(false)
        return
      }    
      log("sendMsg")
      var notify = {
        cmd : "sayMsg",
        uid : uid,
        chair : chair,
        msg : param.msg
      }
      local.sendAll(notify)
      cb(true)
    }
    //玩家下注
    room.handle.bet = function(uid,sid,param,cb){
      //游戏状态为BETTING
      if(gameState !== conf.GS_BETTING){
        cb(false)
        return
      }
      //判断是否在椅子上
      var chair = room.chairMap[uid]
      if(chair === undefined){
        cb(false)
        return
      }
      //不在游戏中不能下注
      if(!player[chair].isReady){
        cb(false)
        return
      }    
      //庄家不能下注
      if(chair == banker){
        cb(false)
        return
      }
      if(!param.bet || typeof(param.bet) != "number" || param.bet < 5 || param.bet > 50){
        cb(false)
        return
      }
      betList[chair] = param.bet
      local.betMessege(chair,param.bet)
      cb(true)
      //判断所有人都下注进入发牌阶段
      var flag = true
      for(var index in betList){
        if(betList.hasOwnProperty(index)){
          if(player[index].isActive && index != banker && player[index].isReady){
              if(betList[index] === 0){
                flag = false
              }
          }
        }
      }
      if(flag){
        //取消倒计时  进入发牌
        clearTimeout(timer)
        local.deal()
      }
    }
    //玩家抢庄
    room.handle.robBanker = function(uid,sid,param,cb) {
      if(gameState !== conf.GS_ROB_BANKER){
        cb(false)
        return
      }
      //判断是否在椅子上
      var chair = room.chairMap[uid]
      if(chair == undefined){
        cb(false)
        return
      }    
      log("robBanker")
      //判断是否已抢庄
      if(robState[chair] != 0){
        cb(false)
        return
      }
      //记录抢庄
      if(param && param.flag == true){
        robState[chair] = 1
      }else{
        robState[chair] = 2
      }
      var notify = {
        "cmd" : "robBanker",
        "chair" : chair,
        "flag" : robState[chair]
      }
      local.sendAll(notify)
      cb(true)
      //判断所有人都已操作进入下个阶段
      var flag = true
      for(var index in robState){
        if(robState.hasOwnProperty(index)){
          if(player[index].isActive && player[index].isReady){
            if(robState[index] == 0){
              flag = false
            }
          }
        }
      }
      if(flag){
        clearTimeout(timer)
        local.endRob()
      }
    }
    room.handle.drawCard = function(uid,sid,param,cb) {
      //游戏状态为GS_DEAL
      if(gameState !== conf.GS_DEAL){
        cb(false)
        return
      }
      //判断是否在椅子上
      var chair = room.chairMap[uid]
      if(chair === undefined){
        cb(false)
        return
      }
      if(player[chair].isShowCard == true){
        cb(false)
        return
      }
      if(typeof(param.list[0]) != "number" || typeof(param.list[1]) != "number" || typeof(param.list[2]) != "number" || typeof(param.list[3]) != "number"){
        cb(false)
        return
      }
      var flags = [true,true,true,true]
      for(var i = 0;i < 4;i++){
       flags[param.list[i]] = false
      }
      var list = []
      for(var i = 0;i < 4;i++){
        if(flags[i] == true){
          list.push(param.list[i])
          cb(false)
          return
        }
      }
      var tmpHandCard1 = {}
      tmpHandCard1[0] = player[chair].handCard[list[0]]
      tmpHandCard1[1] = player[chair].handCard[list[1]]
      var tmpResult1 = logic.getType(tmpHandCard1)
      var tmpHandCard2 = {}
      tmpHandCard2[0] = player[chair].handCard[list[2]]
      tmpHandCard2[1] = player[chair].handCard[list[3]]
      var tmpResult2 = logic.getType(tmpHandCard2)
      if(logic.compare(tmpResult1,tmpResult2)){
        console.log("尾牌需比前牌大")
        cb(false)
        return
      }
      cardSlot[chair] = list
      var notify = {
        "cmd": "drawCard",
        "chair" : chair
      }
      local.sendAll(notify)
      player[chair].isShowCard = true
      //所有参与游戏的玩家都组好牌则进入结算
      var flag = true
      for(var i = 0; i < GAME_PLAYER;i++){
        if(player[i].isReady == true && !cardSlot[i]){
          flag = false
        }
      }
      if(flag){
        clearTimeout(timer)
        local.settlement()
      }
      cb(true)
    }
    //玩家重连
    room.reconnection = function(uid,sid,param,cb) {
      var chair = room.chairMap[uid]
      if(chair === undefined){
        cb(false)
        return
      }
      player[chair].isOnline = true
      var notify = {
        cmd: "userReconnection",
        uid: uid,
        chair : chair
      }
      local.sendAll(notify)
      if(!room.channel.getMember(uid)){
        room.channel.add(uid,sid)
      }
      var notify = {
        roomInfo : local.getRoomInfo(chair),
        betList : betList,
        state : gameState,
        surplusGameNumber : room.maxGameNumber - room.gameNumber,
        freeState : param
      }
      cb(notify)
    }
  //初始化椅子信息
  local.initChairInfo = function(chair) {
    player[chair] = {}
      player[chair].chair = chair             //椅子号
      player[chair].uid = 0                   //uid
      player[chair].isActive = false          //当前椅子上是否有人
      player[chair].isOnline = false          //玩家是否在线
      player[chair].isReady = false           //准备状态
      player[chair].isBanker = false          //是否为庄家
      player[chair].isNoGiveUp = false        //是否未放弃游戏  true表示未放弃   false表示已放弃            
      player[chair].isShowCard = false        //是否开牌
      player[chair].handCard = new Array(4)   //手牌
      player[chair].score = 0                 //当前积分
      player[chair].bankerCount = 0           //坐庄次数
      //player[chair].cardsList  = {}           //总战绩列表
      player[chair].ip  = undefined           //玩家ip地址
    }
    //玩家离开
    room.leave = function(uid) {
      //判断是否在椅子上
      // console.log("leave11111 : "+room.chairMap[uid])
      var chair = room.chairMap[uid]
      if(chair === undefined){
        return
      }
      // console.log(room.channel)
      // console.log("leave222222")
      if(player[chair].isOnline == true){
        player[chair].isOnline = false
        //playerCount--
        var tsid =  room.channel.getMember(uid)['sid']
        if(tsid){
          room.channel.leave(uid,tsid)
        }
        // console.log(room.channel)
        var notify = {
          cmd: "userDisconne",
          uid: uid,
          chair : chair
        }
        local.sendAll(notify)
        frame.disconnect(chair,player,gameState,local,local.gameBegin)  
      }
    }
    //积分改变
    local.changeScore = function(chair,score) {
      player[chair].score += score;
          // var notify = {
          //   "cmd" : "changeScore",
          //   "chair" : chair,
          //   "difference" : score,
          //   "score" : player[chair].score
          // }      
          // local.sendAll(notify)        
    }

    //广播消息
    local.sendAll = function(notify) {
      room.channel.pushMessage('onMessage',notify)
    }

    //通过uid 单播消息
    local.sendUid = function(uid,notify) {
      if(room.channel.getMember(uid)){
        var tsid =  room.channel.getMember(uid)['sid']
        channelService.pushMessageByUids('onMessage', notify, [{
          uid: uid,
          sid: tsid
        }]);  
      }
    }
    local.getRoomInfo = function(chair) {
      var newPlayer = deepCopy(player)
      //明牌模式自己三张牌可见  暗牌不可见
      if(room.cardMode == conf.MODE_CARD_SHOW){
        for(var i = 0; i < GAME_PLAYER;i++){
            if(i == chair){
              delete newPlayer[chair].handCard[3]
            }else{
              delete newPlayer[i].handCard
            }
        }
      }else if(room.cardMode == conf.MODE_CARD_HIDE){
        for(var i = 0; i < GAME_PLAYER;i++){
            delete newPlayer[i].handCard
        }
      }
      var notify = {
        cmd : "roomPlayer",
        player:newPlayer,
        gameMode : room.gameMode,
        maxGameNumber : room.maxGameNumber,
        gameNumber : room.maxGameNumber - room.gameNumber,
        consumeMode : room.consumeMode,
        cardMode : room.cardMode,
        roomId : room.roomId,
        betList : betList,
        state : gameState,
        roomType : room.roomType,
        basic : basic,
        curBet : curBet,
        zsx : room.zsxFlag,
        xsj : room.xsjFlag,
        playerNumber : room.GAME_PLAYER
      }
      return notify
    }
  //房间是否已开始游戏
  room.isBegin = function() {
    if(room.runCount === 0 && (gameState === conf.GS_FREE || gameState === conf.GS_RECOVER)){
      return false
    }else{
      return true
    }
  } 
  //房间是否空闲
  room.isFree = function() {
    return gameState === conf.GS_FREE
  }
  //获取房间人数
  room.getPlayerCount = function() {
    var count = 0
    for(var i = 0;i < GAME_PLAYER;i++){
      if(player[i].isActive){
        count++
      }
    }
    return count
  }
  //解散游戏
  room.finishGame = function(flag) {
    //游戏一局都没开始则不扣钻石
    if(room.runCount == 0){
      room.isRecord = false
    }
    room.gameNumber = 0
    local.gameOver(flag)
  }
  //获取房间数据
  room.getRoomInfo = function(){
    var data = local.getRoomInfo(-1)
    return data
  }  
  //用户退出
  room.userQuit = function(uid,cb) {
    //再次确保游戏未开始
    if(room.isBegin()){
      return
    }
    var chair = room.chairMap[uid]
    room.playerCount--
    //房主退出解散房间
    if(chair == roomHost){
      room.finishGame()
    }else{
      //清除座位信息
      local.initChairInfo(chair) 
      var tsid =  room.channel.getMember(uid)['sid']
      if(tsid){
        room.channel.leave(uid,tsid)
      }
      delete room.chairMap[uid]
      var notify = {
        cmd: "userQuit",
        uid: uid,
        chair : chair
      }
      local.sendAll(notify)     
      cb()
    }
  }
  local.backups = function(cb){
    console.log("begin backups=====")
    var dbObj = {
      "gameState" : gameState,
      "chairMap" : JSON.stringify(room.chairMap),
      "roomHost" : roomHost,
      "banker" : banker,
      "bankerMode" : room.bankerMode,
      "gameNumber" : room.gameNumber,
      "maxGameNumber" : room.maxGameNumber,
      "consumeMode" : room.consumeMode,
      "cardMode" : room.cardMode,
      "betList" : JSON.stringify(betList),
      "player" : JSON.stringify(player),
      "playerNumber" : room.GAME_PLAYER,
      "roomType" : room.roomType,
      "agencyId" : room.agencyId,
      "waitMode" : room.waitMode,
      "maxRob" : room.maxRob,
      "xsj" : room.xsjFlag,
      "zsx" : room.zsxFlag,
      "cardSlot" : JSON.stringify(cardSlot)
    }
    setRoomDBObj(room.roomId,dbObj,function() {
      console.log("end backups=====")
      if(cb){
        cb()
      }
    })
  }  

  var setRoomDB = function(hashKey,subKey,data,cb){
    gameDB.hset("gameNodeRoom:"+hashKey,subKey,data,function(err,data) {
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

  var setRoomDBObj = function(hashKey,obj,cb){
    gameDB.hmset("gameNodeRoom:"+hashKey,obj,function(err,data) {
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
  room.recover = function(data) {
    console.log("recover : ")
    console.log(data)
    local.init()
    room.state = false
    tmpGameState = parseInt(data.gameState)
    gameState = conf.GS_RECOVER
    room.chairMap = JSON.parse(data.chairMap)
    roomHost = parseInt(data.roomHost)
    banker = parseInt(data.banker)
    room.bankerMode = parseInt(data.bankerMode)
    room.gameNumber = parseInt(data.gameNumber)
    room.maxGameNumber = parseInt(data.maxGameNumber)
    room.consumeMode = parseInt(data.consumeMode)
    room.cardMode = parseInt(data.cardMode)
    room.xsjFlag = (data.xsj === "true" ? true : false)
    room.zsxFlag = (data.zsx === "true" ? true : false)
    betList = JSON.parse(data.betList)
    player = JSON.parse(data.player)
    room.GAME_PLAYER = parseInt(data.playerNumber)
    GAME_PLAYER = room.GAME_PLAYER
    room.roomType = data.roomType
    room.agencyId = parseInt(data.agencyId)
    room.waitMode = parseInt(data.waitMode)
    room.maxRob = parseInt(data.maxRob)
    cardSlot = parseInt(data.cardSlot)
    frame.start(room.waitMode)
    logic.init(room.xsjFlag)
    for(var index in player){
      player[index].isOnline = false
      robState[index] = 0
    }
  }
  local.recover = function() {
    gameState = tmpGameState
    switch(gameState){
      case conf.GS_FREE : 
        for(var index in player){
          player[index].isReady = false
        }
      break
      case conf.GAMEING : 
        local.gameBegin()
      break
      case conf.GS_ROB_BANKER:
        local.chooseBanker()
      break
      case conf.GS_BETTING:
        for(var index in player){
          betList[index] = 0
        }
        local.betting()
      break
      case conf.GS_DEAL:
        local.deal()
      break
    }
    var notify = {
      "cmd" : "recover"
    }
    local.sendAll(notify)
  }
  room.handle.recover = function(uid,sid,param,cb) {
    if(gameState !== conf.GS_RECOVER){
      cb(false)
      return
    }
    local.recover()
    cb(true)
  }
  return room 
}

var deepCopy = function(source) { 
  var tmpResult={}
  for (var key in source) {
    tmpResult[key] = typeof source[key]==="object"? deepCopy(source[key]): source[key]
  } 
  return tmpResult
}


var log = function(str) {
    // console.log("LOG NiuNiu : "+str)
}