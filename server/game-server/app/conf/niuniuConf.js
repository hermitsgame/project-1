module.exports.niuConf = {

}
var conf = {}
//牌型变量
conf.COMB_TYPE_NONE  =   0            // 牛破
conf.COMB_TYPE_OX1   =    1           // 牛1
conf.COMB_TYPE_OX2   =    2           // 牛2
conf.COMB_TYPE_OX3   =    3           // 牛3
conf.COMB_TYPE_OX4   =    4           // 牛4
conf.COMB_TYPE_OX5   =    5           // 牛5
conf.COMB_TYPE_OX6   =    6           // 牛6
conf.COMB_TYPE_OX7   =    7           // 牛7   
conf.COMB_TYPE_OX8   =    8           // 牛8   x2
conf.COMB_TYPE_OX9   =    9           // 牛9   x3
conf.COMB_TYPE_OX10  =    10          // 牛牛  x4
conf.COMB_TYPE_YIN_DELUX =    11      // 银花牛 x5
conf.COMB_TYPE_JIN_DELUX =    12      // 金花牛 x6
conf.COMB_TYPE_BOMB  =    13          // 炸弹   x7
conf.COMB_TYPE_MICRO =    14          // 五小   x8



conf.GAME_PLAYER = 6                 //游戏人数
conf.TID_ROB_TIME = 5000            //抢庄时间
conf.TID_BETTING = 10000              //下注时间
conf.TID_SETTLEMENT = 10000           //结算时间

conf.TID_ZHAJINNIU = 80000			 //诈金牛模式玩家操作时间
conf.TID_ZHAJINNIU_SETTLEMENT = 3000 //炸金牛结算时间

conf.TID_ZHAJINHUA = 30000			 //炸金花模式玩家操作时间

conf.TID_MINGPAIQZ_ROB_TIME = 10000  //明牌抢庄模式抢庄时间

conf.MING_CARD_NUM = 4               //明牌数量

//游戏状态
conf.GS_FREE         = 1001              //空闲阶段
conf.GS_BETTING      = 1002              //下注阶段
conf.GS_DEAL         = 1003              //发牌阶段
conf.GS_SETTLEMENT   = 1004              //结算阶段
conf.GS_ROB_BANKER   = 1005              //抢庄阶段
conf.GS_GAMEING 	 = 1006				 //游戏已开始
conf.GS_NONE 		 = 1099 			 //不可操作阶段
conf.GS_RECOVER      = 1100              //房间恢复阶段

//游戏模式
conf.MODE_GAME_NORMAL = 1              //常规模式
conf.MODE_GAME_MING   = 2 			   //明牌抢庄
conf.MODE_GAME_BULL   = 3              //斗公牛模式
conf.MODE_GAME_SHIP   = 4              //开船模式
conf.MODE_GAME_ZHAJINNIU = 5		   //炸金牛
conf.MODE_GAME_CRAZE = 6 			   //疯狂模式
conf.MODE_GAME_SANKUNG = 7 			   //三公
conf.MODE_GAME_ZHAJINHUA = 8 		   //炸金花
conf.MODE_GAME_FOURCARD = 9 		   //四咖
//定庄模式
conf.MODE_BANKER_ROB   = 1              //随机抢庄
conf.MODE_BANKER_HOST  = 2              //房主做庄
conf.MODE_BANKER_ORDER = 3              //轮庄
conf.MODE_BANKER_NONE  = 4              //无定庄模式
conf.MODE_BANKER_NIUNIU = 5 			//牛牛坐庄
conf.MODE_BANKER_JIUDIAN = 6 			//九点坐庄
//消耗模式
conf.MODE_DIAMOND_HOST = 1              //房主扣钻
conf.MODE_DIAMOND_EVERY = 2             //每人扣钻
conf.MODE_DIAMOND_WIN = 3               //大赢家扣钻
conf.MODE_DIAMOND_NONOE = 10     		//已扣钻
//明牌模式
conf.MODE_CARD_HIDE  = 1 				//不明牌
conf.MODE_CARD_SHOW  = 2 				//明牌

conf.GAME_TYPE = {
	"niuniu" : true,
	"zhajinniu" : true,
	"mingpaiqz" : true,
	"fengkuang" : true,
	"sanKung" : true,
	"zhajinhua" : true
}

var ROOM_FACTORY = {

}
//大牌控制
conf.ROUND_TIMES = 1                         //最大洗牌次数
conf.TYPE_WEIGHT = 2                         //低于此权重洗牌
conf.typeWeight = [0,1,2,3,4,5,6,7,10,20,30,50,80,100,200,200,200,200,3000]
conf.FengKuangtypeWeight = [0,1,2,3,4,5,6,7,8,9,10,15,16,17,18,19,20,21]


//三公控制
conf.SANKUNG_ROUND_TIMES = 1 				//最大洗牌次数
conf.SANKUNG_TYPE_WEIGHT = 3                //低于此权重洗牌
conf.sanKungTypeWeight = [0,1,2,3,4,5,6,8,10,12,15,20,25]


module.exports.niuConf = conf
