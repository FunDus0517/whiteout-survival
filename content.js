(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.WinterContent=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  return {
    locations:[
      {id:'clinic',name:'山脚诊所',sub:'先处理伤口，再考虑明天',tag:'药品 · 食物',icon:'meds',unlock:4,base:{meds:1,food:3,parts:2},cold:15,lines:['药柜被撬开过。最下面一格卡住了，里面还有消毒棉和缝合包。','诊室的玻璃碎了一地。你绕过积雪，从值班桌下拖出一个急救箱。','墙上还贴着上一周的排班表。你带走了剩余药品，关上门。']},
      {id:'freight',name:'货运车场',sub:'封条后面，也许还有整箱货物',tag:'综合补给',icon:'building',unlock:5,base:{wood:7,food:5,parts:4},cold:18,lines:['集装箱的封条还在。锯开冻住的锁以后，里面是没来得及卸货的救灾物资。','一辆货车翻在道岔边。你从破开的车厢取出干粮和备用轮轴配件。','车场地面结了厚冰。你沿铁轨拖着收获往回走，鞋底磨掉了一层。']}
    ],
    recipes:[
      {id:'axe',name:'短柄手斧',icon:'wood',desc:'近战伤害提高；有木材的地点增加 3 木材储量。',cost:{wood:6,parts:5},gear:true},
      {id:'coat',name:'加厚外套',icon:'home',desc:'减少路途失温；搜刮中的降温速度降低 40%。',cost:{wood:8,parts:7},gear:true},
      {id:'boots',name:'防滑雪靴',icon:'compass',desc:'移动速度提高，路途失温减少；搜刮中降温减慢。',cost:{wood:4,parts:5},gear:true},
      {id:'pack',name:'加固背包',icon:'parts',desc:'背包容量增加 10；成功撤离额外带回 2 食物和 1 零件。',cost:{wood:8,parts:6},gear:true},
      {id:'spear',name:'长柄猎矛',icon:'compass',desc:'近战攻击更远，便于拉开身位；基础伤害提高。',cost:{wood:8,parts:6},gear:true},
      {id:'crossbow',name:'手工弩',icon:'radio',desc:'可远距离攻击；每次出发携带 8 支箭，用尽后切回近战。',cost:{wood:12,parts:14},gear:true},
      {id:'medical',name:'自制急救包',icon:'meds',desc:'制作 1 个急救包。使用后恢复 35 生命。',cost:{food:4,parts:4},gain:{meds:1}},
      {id:'soup',name:'浓炖肉汤',icon:'food',desc:'立即恢复 12 生命、22 保暖、8 士气。',cost:{food:3,wood:2},gain:{health:12,warmth:22,hope:8}}
    ],
    trades:[
      {id:'timber-food',name:'杂粮罐头',cost:{wood:6},gain:{food:8},desc:'巡逻队缺柴。拿木料换他们的备用口粮。'},
      {id:'food-parts',name:'旧电器零件',cost:{food:5},gain:{parts:7},desc:'修理工从废车上拆下的线圈，成色尚可。'},
      {id:'parts-medicine',name:'密封医疗包',cost:{parts:7},gain:{meds:2},desc:'包装完好。两只医疗包，够处理几次伤。'},
      {id:'parts-timber',name:'一车干木料',cost:{parts:5},gain:{wood:13},desc:'短途运输队带来的干柴，比湿木头耐烧。'},
      {id:'food-medicine',name:'止血与消毒用品',cost:{food:6},gain:{meds:1,parts:2},desc:'附近营地缺粮。他们愿意连备用扣件一起换。'},
      {id:'timber-parts',name:'备用接线组件',cost:{wood:8},gain:{parts:8},desc:'交换电台维修用的保险丝、接线柱和导线。'}
    ],
    quests:[
      {id:'first-route',name:'先摸清周边',desc:'带着物资成功撤离 3 次。',metric:'expeditions',target:3,reward:{wood:5,food:3}},
      {id:'seal-walls',name:'把漏风处堵上',desc:'将保温墙升级至 1 级。',metric:'walls',target:1,reward:{parts:4,hope:5}},
      {id:'another-pair',name:'两个人的值班室',desc:'招募机械师林远。',metric:'companion',target:1,reward:{food:6}},
      {id:'proper-kit',name:'出门要有装备',desc:'制作任意 1 件永久装备。',metric:'gear',target:1,reward:{parts:5,wood:4}},
      {id:'trade-route',name:'营地间的联系',desc:'与巡逻商队完成 2 笔交换。',metric:'tradeCount',target:2,reward:{food:5,meds:1}},
      {id:'fourth-day',name:'度过第一场大雪',desc:'存活到第 4 天。',metric:'day',target:4,reward:{meds:1,hope:10}},
      {id:'veteran',name:'十二次出发',desc:'带着物资成功撤离 12 次。',metric:'expeditions',target:12,reward:{parts:8,wood:8}},
      {id:'clear-area',name:'清出一条回家的路',desc:'累计消灭 5 个丧尸或野兽并成功撤离。',metric:'kills',target:5,reward:{food:6,parts:4}},
      {id:'signal',name:'让电台说话',desc:'将求救无线电修复至 2 级。',metric:'radio',target:2,reward:{meds:2,hope:10}}
    ],
    events:[
      {title:'桥面裂了',text:'回程的木桥裂开一条缝。桥下是结冰的排水沟，不算深，但下去以后得爬很久。',options:[{label:'用木料加固后通过',cost:{wood:3},gain:{hope:5,parts:3},note:'加固了三根横梁。你顺手拆走了桥头旧路灯上的零件。'},{label:'沿沟底绕过去',gain:{warmth:-9,food:2},note:'绕行多花了一会儿。沟边旧棚子里还有两袋压缩饼干。'}]},
      {title:'冷库的备用电源',text:'墙后的压缩机还在间歇工作。备用电源快没电了，冷库门却冻得很紧。',options:[{label:'拆下电源和接线板',gain:{parts:8,hope:-3},note:'你拆走了电源。冷库安静下来。'},{label:'烧水化开门缝',cost:{wood:4},gain:{food:11},note:'门开了。大部分食物还没有变质。'}]},
      {title:'追着你的脚印',text:'一只瘦狼远远跟在后面。它还没靠近，风却正把背包里的肉味吹过去。',options:[{label:'扔下口粮，慢慢退开',cost:{food:3},gain:{hope:3},note:'狼停在了口粮旁。你没有回头跑。'},{label:'举起燃着的木条驱赶',gain:{health:-7,wood:4},note:'你在争抢木条时划伤了手。狼终于退进树丛。'}]},
      {title:'旧雪橇',text:'棚子后有一架雪橇，滑板没坏，只少了固定绳。修好它，可以拖回比背包多一倍的东西。',options:[{label:'拆零件固定雪橇',cost:{parts:3},gain:{wood:12,food:3},note:'雪橇装满了。最后一段上坡相当费力。'},{label:'拆下可用的滑板',gain:{parts:4,wood:3},note:'你把金属滑板拆下来，剩下的木架劈成了柴。'}]},
      {title:'躲在楼梯间的老人',text:'老人裹着窗帘，拦住你问有没有见过他的儿子。他身边放着一箱修车工具。',options:[{label:'留下口粮，记下寻人信息',cost:{food:4},gain:{parts:7,hope:10},note:'他坚持把工具箱给你。儿子的名字写在你带回的纸条上。'},{label:'帮他搬到背风的房间',gain:{warmth:-6,hope:6},note:'你堵住了窗缝。离开前，又告诉了他营地的方向。'}]},
      {title:'油桶里的水声',text:'几只旧油桶埋在雪里。轻敲其中一只，里面传出液体晃动的声音。标签已经磨掉了。',options:[{label:'花时间检查桶盖与残留物',gain:{parts:5,wood:4,warmth:-5},note:'桶里是工业冷却液，不能喝。你拆下阀门，带走了木托盘。'},{label:'不碰未知液体，搜外围',gain:{wood:5},note:'你只带走了外围的干木板。'}]},
      {title:'掉在雪里的工牌',text:'工牌连着一串钥匙。背面的地图标着一处设备间，距离这里不到两百米。',options:[{label:'按地图找到设备间',gain:{parts:7,warmth:-6},note:'钥匙正好。设备间里放着未用完的接线组件。'},{label:'抄下位置，先回去',gain:{parts:2,hope:4},note:'你把坐标写在值班室的地图上，还带回了钥匙上的小工具。'}]},
      {title:'有人动过你的路标',text:'你昨天留下的布条不见了。岔路上多了一行新脚印，朝着相反的方向延伸。',options:[{label:'按地形重新辨认方向',gain:{warmth:-7,hope:5},note:'你认出了山脊的缺口，在树上重新刻了记号。'},{label:'跟过去，看是谁留下的',gain:{food:5,health:-5},note:'脚印通往一个废弃猎棚。你跌了一跤，但找到了食物。'}]},
      {title:'还没凝固的脚印',text:'几枚新脚印绕过转角，地上有拖曳重物的痕迹。前面是一辆卡在积雪里的运输车。',options:[{label:'用木板帮他们脱困',cost:{wood:5},gain:{food:8,parts:4},note:'运输队拿出部分补给作为回报，告诉你北线仍有人巡逻。'},{label:'协助推车',gain:{health:-6,food:5,hope:6},note:'车终于动了。你拉伤了肩膀，换到一袋干粮。'}]},
      {title:'药品需要避光',text:'一个便携药箱半埋在雪里，温度标签已经变色。部分药物可能失效了。',options:[{label:'只取密封的敷料',gain:{meds:1,parts:2},note:'你只带回了不怕冻结的绷带、敷料与金属夹。'},{label:'仔细核对包装说明',gain:{meds:2,warmth:-8},note:'确认无误以后，你把可用的用品分装好。'}]},
      {title:'观测员的最后一页',text:'记录本里写着：「风向转北，预计两天内继续降温。储备优先给燃料。」下一页是空白。',options:[{label:'抄下记录，搜集燃料',gain:{wood:8,hope:4},note:'你按记录里的位置找到了备用木料棚。'},{label:'拆走记录仪的零件',gain:{parts:6},note:'仪器彻底停了，里面的零件还能用。'}]},
      {title:'墙里传来抓挠声',text:'声音来自废屋夹层。你掀开木板，发现一只被困住的猫。它不停往后缩。',options:[{label:'用一点食物引它出来',cost:{food:1},gain:{hope:15,wood:3},note:'猫沿着缺口钻走了。你把拆下的木板带回营地。'},{label:'扩大洞口，留下退路',gain:{hope:7,parts:2},note:'洞口足够大了。你退到门外，听见它终于跳下了地。'}]},
      {title:'一卷没用完的隔热棉',text:'废弃检修箱里露出白色纤维。隔热棉浸湿了外层，里面似乎还干燥。',options:[{label:'用木火烘干后带回',cost:{wood:3},gain:{warmth:18,parts:4},note:'烘干后的隔热棉包在内衬里。回程没那么冷了。'},{label:'只取干燥内层',gain:{warmth:8,parts:2},note:'你切掉湿透的外层，留下了还能使用的部分。'}]},
      {title:'门上的粉笔字',text:'「物资放在灶台后。拿走请留记号。」门是虚掩着的，屋里没有人。',options:[{label:'取用并留下等价木材',cost:{wood:4},gain:{food:7,hope:6},note:'你留下四块干木料，在门板上画了一道线。'},{label:'拿走口粮，记下欠账',gain:{food:6,hope:-6},note:'你在记录本上写下了地址。等手头宽裕，再来一趟。'}]},
      {title:'没有送出的生日礼物',text:'储物柜里放着一盒画笔，下面压着两罐水果。包装上的日期就是今天。',options:[{label:'把画笔与罐头一起带走',gain:{food:3,hope:9},note:'画笔放在值班室桌上，暂时没有人动它。'},{label:'留下画笔，只取补给',gain:{food:4,parts:2},note:'你把礼物放回原处，从旁边工具盒取走了两个接头。'}]},
      {title:'车载电台还有电',text:'废车仪表盘亮了一瞬。车载电台的频道旋钮卡住了，但电源线没有断。',options:[{label:'修好旋钮，发出短报',cost:{parts:3},gain:{hope:16,food:4},note:'没有回应。你重复了三遍位置，带走了车里的应急干粮。'},{label:'拆回关键组件',gain:{parts:8,hope:2},note:'拆下来的组件比你营地里的新，应该能缩短维修时间。'}]}
    ]
  };
});
