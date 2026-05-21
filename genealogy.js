/* ====================================================
   PAGE 4 — Comment Culture Genealogy (1920×1080)
   ==================================================== */
(function drawGenealogy() {
  const svg = d3.select('#genealogy');
  if (!svg.node()) return;

  const xFromYear = y => 120 + (y - 2006) / 20 * 1680;

  const LINES = [
    {id:'album',name:'专辑主干',en:'Album Spine',color:'#6F5B4B',by:205,
     nodes:[
      {id:'a01',yr:2006.50,yY:205,ty:'major',sz:10,lb:'《薛之谦》',mt:'37,766 评论',nt:'首张专辑'},
      {id:'a02',yr:2007.58,yY:200,ty:'major',sz:9,lb:'《你过得好吗》',mt:'26,481 评论',nt:''},
      {id:'a03',yr:2008.90,yY:215,ty:'major',sz:9,lb:'《深深爱过你》',mt:'25,921 评论',nt:''},
      {id:'a04',yr:2009.92,yY:195,ty:'major',sz:11,lb:'《未完成的歌》',mt:'315,506 评论',nt:'含《认真的雪》229,499'},
      {id:'a05',yr:2012.54,yY:210,ty:'major',sz:10,lb:'《几个薛之谦》',mt:'131,484 评论',nt:'合约期满 · 转型之作'},
      {id:'a06',yr:2013.86,yY:198,ty:'major',sz:12,lb:'《意外》',mt:'1,123,502 评论',nt:'翻红起点 · 丑八怪 / 其实'},
      {id:'a07',yr:2016.43,yY:220,ty:'major',sz:12,lb:'《初学者》',mt:'857,755 评论',nt:'演员 / 绅士 / 刚刚好'},
      {id:'a08',yr:2017.84,yY:190,ty:'major',sz:13,lb:'《渡》',mt:'1,842,233 评论',nt:'专辑评论总量峰值 · 10 首'},
      {id:'a09',yr:2018.36,yY:215,ty:'major',sz:11,lb:'《怪咖》',mt:'1,227,384 评论',nt:'天份 / 最好 / 怪咖'},
      {id:'a10',yr:2019.48,yY:200,ty:'major',sz:11,lb:'《尘》',mt:'1,289,563 评论',nt:'木偶人 / 慢半拍 / 陪你去流浪'},
      {id:'a11',yr:2020.54,yY:220,ty:'major',sz:12,lb:'《天外来物》',mt:'1,545,967 评论',nt:'天外来物 442,057'},
      {id:'a12',yr:2021.54,yY:195,ty:'major',sz:9,lb:'《无数》',mt:'630,473 评论',nt:'变废为宝 / 可 / 男二号'},
      {id:'a13',yr:2023.46,yY:210,ty:'major',sz:11,lb:'《守村人》',mt:'698,913 评论',nt:'深夜率 46.13% 全系最高'},
     ]},
    {id:'likes',name:'高赞评论',en:'High-liked',color:'#C85F55',by:340,
     nodes:[
      {id:'h01',yr:2009.92,yY:335,ty:'major',sz:9,lb:'《认真的雪》热评',mt:'303,521 赞',nt:'早期代表作 · 跨度十年'},
      {id:'h02',yr:2013.86,yY:355,ty:'major',sz:11,lb:'《你还要我怎样》',mt:'357,413 赞',nt:'情歌标杆 · 开始懂爱情'},
      {id:'h03',yr:2013.86,yY:325,ty:'medium',sz:7,lb:'《其实》',mt:'280,640 赞',nt:''},
      {id:'h04',yr:2015.20,yY:340,ty:'major',sz:12,lb:'《演员》最高赞',mt:'629,222 赞',nt:'全系峰值 · 个人纪录'},
      {id:'h05',yr:2015.45,yY:360,ty:'major',sz:10,lb:'"不正经 → 深情"',mt:'629,222 赞 · 演员',nt:'最广流传金句公式'},
      {id:'h06',yr:2016.43,yY:320,ty:'major',sz:10,lb:'《绅士》',mt:'456,019 赞',nt:'初学者专辑'},
      {id:'h07',yr:2016.43,yY:365,ty:'major',sz:10,lb:'"多少人等到了零点"',mt:'458,257 赞',nt:'零点仪式文本开端'},
      {id:'h08',yr:2016.43,yY:350,ty:'medium',sz:7,lb:'《初学者》',mt:'383,870 赞',nt:''},
      {id:'h09',yr:2017.84,yY:335,ty:'major',sz:11,lb:'《动物世界》',mt:'529,179 赞',nt:'动物隐喻 · 社会讨论'},
      {id:'h10',yr:2017.84,yY:370,ty:'major',sz:10,lb:'《暧昧》热评',mt:'479,565 赞',nt:'"全世界看到薛之谦"'},
      {id:'h11',yr:2017.84,yY:310,ty:'medium',sz:7,lb:'《像风一样》',mt:'339,778 赞',nt:''},
      {id:'h12',yr:2018.36,yY:345,ty:'major',sz:10,lb:'《那是你离开北京》',mt:'376,634 赞',nt:'五岁半血管瘤 · 个人叙事'},
      {id:'h13',yr:2018.36,yY:325,ty:'medium',sz:7,lb:'《天份》',mt:'274,015 赞',nt:''},
      {id:'h14',yr:2019.48,yY:355,ty:'medium',sz:7,lb:'《慢半拍》',mt:'212,508 赞',nt:''},
      {id:'h15',yr:2019.48,yY:340,ty:'medium',sz:7,lb:'《病态》热评',mt:'247,453 赞',nt:'"愚昧成为主流"'},
      {id:'h16',yr:2020.54,yY:360,ty:'major',sz:11,lb:'《天外来物》热评',mt:'409,306 赞',nt:'"互相拯救" · 宇宙浪漫'},
      {id:'h17',yr:2021.54,yY:340,ty:'medium',sz:7,lb:'《变废为宝》',mt:'103,171 赞',nt:'求婚仪式文本'},
      {id:'h18',yr:2023.46,yY:350,ty:'medium',sz:7,lb:'《情书》',mt:'49,570 赞',nt:'"特别特别好的女孩"'},
      {id:'h19',yr:2013.86,yY:340,ty:'minor',sz:4,lb:'《丑八怪》',mt:'168,545 赞',nt:''},
      {id:'h20',yr:2017.84,yY:315,ty:'minor',sz:4,lb:'《别》',mt:'162,179 赞',nt:''},
      {id:'h21',yr:2019.48,yY:330,ty:'minor',sz:4,lb:'《陪你去流浪》',mt:'196,800 赞',nt:''},
      {id:'h22',yr:2021.54,yY:355,ty:'minor',sz:4,lb:'《可》',mt:'75,300 赞',nt:''},
     ]},
    {id:'motif',name:'母题传播',en:'Motif Spread',color:'#D39A2E',by:480,
     nodes:[
      {id:'m01',yr:2013.70,yY:480,ty:'major',sz:11,lb:'"你还要我怎样"',mt:'16,269 次 · 112 首歌',nt:'最早大规模扩散母题'},
      {id:'m02',yr:2015.20,yY:465,ty:'major',sz:12,lb:'"世界和平"',mt:'46,577 次 · 128 首歌',nt:'薛式标志语 · 跨11年'},
      {id:'m03',yr:2015.20,yY:500,ty:'major',sz:10,lb:'"像风行了X里"',mt:'41,614 次 · 113 首歌',nt:'不问归期模板'},
      {id:'m04',yr:2016.43,yY:475,ty:'medium',sz:7,lb:'"南薛北张"',mt:'242,641 赞',nt:'相声式歌手 · 幽默文本'},
      {id:'m05',yr:2016.43,yY:495,ty:'medium',sz:7,lb:'"洋葱一层层剥开"',mt:'168,545 赞 · 丑八怪',nt:'男生比喻模板'},
      {id:'m06',yr:2016.43,yY:455,ty:'medium',sz:7,lb:'"该配合你演出"',mt:'演员歌词引用',nt:''},
      {id:'m07',yr:2017.50,yY:485,ty:'major',sz:9,lb:'"红时不追难时不黑"',mt:'35,200 赞',nt:'争议期粉丝行为准则'},
      {id:'m08',yr:2017.55,yY:470,ty:'medium',sz:7,lb:'"717生日快乐"',mt:'67,658 条',nt:'粉丝日历仪式'},
      {id:'m09',yr:2017.84,yY:510,ty:'medium',sz:7,lb:'"别害怕某个旋律"',mt:'我害怕热评',nt:''},
      {id:'m10',yr:2018.40,yY:485,ty:'medium',sz:7,lb:'"感情最怕拖着"',mt:'7,930 条标签',nt:'恋爱失恋话术'},
      {id:'m11',yr:2018.70,yY:465,ty:'medium',sz:6,lb:'世界和平突破100首',mt:'2018 里程碑',nt:''},
      {id:'m12',yr:2019.48,yY:495,ty:'major',sz:9,lb:'"愚昧成为主流"',mt:'247,453 赞 · 病态',nt:'社会批判母题'},
      {id:'m13',yr:2019.48,yY:475,ty:'medium',sz:7,lb:'"年少不听薛之谦"',mt:'经典文本',nt:'听懂已是伤心人'},
      {id:'m14',yr:2020.54,yY:480,ty:'major',sz:10,lb:'"早上好哦大家"',mt:'155,778 赞 · 本人',nt:'薛之谦评论区空降'},
      {id:'m15',yr:2020.54,yY:500,ty:'medium',sz:7,lb:'"漫漫宇宙浪漫起源"',mt:'194,342 赞',nt:'天外来物诗学'},
      {id:'m16',yr:2021.54,yY:490,ty:'medium',sz:6,lb:'"变废为宝 · 结婚"',mt:'103,171 赞',nt:'人生节点仪式化'},
      {id:'m17',yr:2023.46,yY:480,ty:'medium',sz:7,lb:'"假装开心"',mt:'守村人衍生',nt:'社会情绪母题'},
      {id:'m18',yr:2023.46,yY:505,ty:'minor',sz:5,lb:'"特别好特别好"',mt:'情书 · 女孩叙事',nt:''},
      {id:'m19',yr:2017.84,yY:460,ty:'minor',sz:4,lb:'"不问归期"',mt:'像风衍生',nt:''},
      {id:'m20',yr:2020.54,yY:515,ty:'minor',sz:4,lb:'"互相拯救"',mt:'天外来物衍生',nt:''},
      {id:'m21',yr:2019.48,yY:455,ty:'minor',sz:4,lb:'"慢半拍"',mt:'爱情节奏隐喻',nt:''},
      {id:'m22',yr:2023.46,yY:460,ty:'minor',sz:3.5,lb:'"银河少年"',mt:'守村人衍生',nt:''},
     ]},
    {id:'night',name:'深夜时间',en:'Midnight Rhythm',color:'#7766A6',by:620,
     nodes:[
      {id:'n01',yr:2009.92,yY:600,ty:'medium',sz:7,lb:'早期深夜率 ~5.5%',mt:'尚未形成深夜文化',nt:''},
      {id:'n02',yr:2013.86,yY:610,ty:'medium',sz:7,lb:'深夜率 6.87%',mt:'《意外》· 凌晨三点',nt:'深夜党萌芽'},
      {id:'n03',yr:2015.45,yY:615,ty:'medium',sz:7,lb:'深夜评论开始增长',mt:'几个薛之谦 · ~7%',nt:''},
      {id:'n04',yr:2016.43,yY:625,ty:'major',sz:9,lb:'深夜率 9.06%',mt:'《初学者》· 14%→18%',nt:'深夜听薛形成'},
      {id:'n05',yr:2017.84,yY:610,ty:'major',sz:10,lb:'深夜率 11.53%',mt:'暧昧 / 别 / 动物世界',nt:'深夜评论显著上升'},
      {id:'n06',yr:2018.36,yY:635,ty:'medium',sz:7,lb:'深夜率 10.89%',mt:'《怪咖》',nt:''},
      {id:'n07',yr:2019.48,yY:615,ty:'major',sz:12,lb:'00:00 评论峰值',mt:'1,719,105 条',nt:'零点发布仪式高峰'},
      {id:'n08',yr:2019.48,yY:640,ty:'major',sz:10,lb:'《尘》深夜率 29.60%',mt:'木偶人 · 零点峰值',nt:'深夜率接近三成'},
      {id:'n09',yr:2020.54,yY:620,ty:'major',sz:9,lb:'深夜率 15.49%',mt:'天外来物 · 生日00:00',nt:'零点发布传统确立'},
      {id:'n10',yr:2021.54,yY:635,ty:'major',sz:9,lb:'深夜率 33.79%',mt:'《无数》· 失眠聚集',nt:'深夜率首次突破三成'},
      {id:'n11',yr:2022.38,yY:625,ty:'major',sz:10,lb:'深夜率 42.77%',mt:'《无数》持续',nt:'近半评论在深夜'},
      {id:'n12',yr:2023.46,yY:630,ty:'major',sz:12,lb:'深夜率 46.13%',mt:'《守村人》· 全系最高',nt:'凌晨四点 · 失眠叙事成熟'},
      {id:'n13',yr:2017.84,yY:650,ty:'medium',sz:6,lb:'别·深夜率153.9%',mt:'单曲异常峰值',nt:''},
      {id:'n14',yr:2020.54,yY:645,ty:'medium',sz:6,lb:'00:00 生日同步',mt:'7月17日传统',nt:''},
      {id:'n15',yr:2023.46,yY:605,ty:'minor',sz:4,lb:'凌晨四点叙事',mt:'守村人失眠锚点',nt:''},
      {id:'n16',yr:2022.38,yY:650,ty:'minor',sz:4,lb:'失眠聚集',mt:'无数 · 42.77%',nt:''},
      {id:'n17',yr:2017.84,yY:600,ty:'minor',sz:3.5,lb:'凌晨长评',mt:'均长 > 22 字',nt:''},
      {id:'n18',yr:2015.45,yY:605,ty:'minor',sz:3,lb:'夜听萌芽',mt:'几个薛之谦',nt:''},
      {id:'n19',yr:2020.54,yY:595,ty:'minor',sz:3,lb:'耗尽·零点',mt:'深夜对唱',nt:''},
      {id:'n20',yr:2023.46,yY:655,ty:'minor',sz:3,lb:'Nothing',mt:'深夜简约',nt:''},
     ]},
    {id:'life',name:'人生叙事',en:'Life Narrative',color:'#4E87A8',by:755,
     nodes:[
      {id:'l01',yr:2009.92,yY:745,ty:'medium',sz:7,lb:'"时间算你绝"',mt:'《认真的雪》热评',nt:'十年跨度 · 老歌新听'},
      {id:'l02',yr:2013.86,yY:755,ty:'major',sz:9,lb:'"初听不知曲中意"',mt:'丑八怪评论体系',nt:'时间变化感知'},
      {id:'l03',yr:2015.45,yY:740,ty:'major',sz:10,lb:'青春与毕业',mt:'"从小学到大学"',nt:'时间跨度叙事'},
      {id:'l04',yr:2016.43,yY:770,ty:'major',sz:9,lb:'失恋叙事',mt:'"洋葱一层层剥开"',nt:'丑八怪评论生态'},
      {id:'l05',yr:2016.43,yY:750,ty:'medium',sz:7,lb:'考试与升学',mt:'高考 / 考研 / 考公',nt:'学生听众画像'},
      {id:'l06',yr:2017.84,yY:765,ty:'major',sz:9,lb:'城市漂泊',mt:'"北漂 / 沪漂 / 深漂"',nt:'地理身份共鸣'},
      {id:'l07',yr:2017.84,yY:745,ty:'medium',sz:7,lb:'失眠与孤独',mt:'"凌晨三点一个人"',nt:'深夜叙事融合'},
      {id:'l08',yr:2018.36,yY:760,ty:'major',sz:9,lb:'家庭与童年',mt:'"五岁半血管瘤"',nt:'那是你离开北京'},
      {id:'l09',yr:2019.48,yY:755,ty:'major',sz:10,lb:'关系复盘',mt:'"爱过 / 错过 / 后悔"',nt:'情感反思型评论'},
      {id:'l10',yr:2020.54,yY:740,ty:'major',sz:9,lb:'浪漫宇宙观',mt:'"漫漫宇宙浪漫起源"',nt:'天外来物诗学'},
      {id:'l11',yr:2021.54,yY:765,ty:'major',sz:9,lb:'婚姻与承诺',mt:'"和头像里的女孩结婚"',nt:'变废为宝 · 人生仪式'},
      {id:'l12',yr:2023.46,yY:750,ty:'major',sz:10,lb:'怀旧深度听众',mt:'长评率 43.2% · 老歌 42.3%',nt:'重度听众画像'},
      {id:'l13',yr:2023.46,yY:775,ty:'medium',sz:7,lb:'假装开心',mt:'"多少人假装开心"',nt:'社会情绪共振'},
      {id:'l14',yr:2019.48,yY:780,ty:'medium',sz:7,lb:'社会批判',mt:'"愚昧成为主流"',nt:'病态评论系统'},
      {id:'l15',yr:2021.54,yY:735,ty:'medium',sz:6,lb:'男二号叙事',mt:'"甘心出演男二号"',nt:''},
      {id:'l16',yr:2020.54,yY:780,ty:'medium',sz:6,lb:'纸船 · 母爱',mt:'母亲节叙事',nt:''},
      {id:'l17',yr:2017.84,yY:730,ty:'minor',sz:4,lb:'高尚·阶层自省',mt:'"狼藏起反犬旁"',nt:''},
      {id:'l18',yr:2021.54,yY:750,ty:'minor',sz:4,lb:'凤毛麟角',mt:'少数者叙事',nt:''},
      {id:'l19',yr:2023.46,yY:760,ty:'minor',sz:4,lb:'租购·城市生存',mt:'租房青年共鸣',nt:''},
      {id:'l20',yr:2018.36,yY:730,ty:'minor',sz:3.5,lb:'违背的青春',mt:'青春遗憾主题',nt:''},
     ]},
    {id:'guard',name:'风波守护',en:'Guardian',color:'#6D946A',by:880,
     nodes:[
      {id:'g01',yr:2017.65,yY:880,ty:'major',sz:10,lb:'明日之子摔话筒',mt:'直播中断 · 评论区涌入声援',nt:''},
      {id:'g02',yr:2017.73,yY:895,ty:'major',sz:11,lb:'李雨桐事件',mt:'"红时不追难时不黑"',nt:'全网热议 · 粉丝标语诞生'},
      {id:'g03',yr:2017.78,yY:865,ty:'medium',sz:7,lb:'复婚声明',mt:'高磊鑫 · 祝福刷屏',nt:''},
      {id:'g04',yr:2017.84,yY:890,ty:'medium',sz:6,lb:'评论区两极分化',mt:'声援 vs 质疑',nt:'持续数月'},
      {id:'g05',yr:2018.70,yY:875,ty:'medium',sz:6,lb:'小雪糕出生',mt:'评论区温暖祝福',nt:''},
      {id:'g06',yr:2019.00,yY:880,ty:'medium',sz:5,lb:'李雨桐删除微博',mt:'事件法律落幕',nt:''},
      {id:'g07',yr:2023.62,yY:885,ty:'major',sz:10,lb:'好声音争议',mt:'暗示黑幕 · 与周华健退出',nt:'浙江卫视停播'},
      {id:'g08',yr:2024.12,yY:880,ty:'major',sz:9,lb:'盗摄争议',mt:'微博照片 → 合理使用',nt:'舆论翻转 · 央视定调'},
      {id:'g09',yr:2018.36,yY:890,ty:'medium',sz:6,lb:'怪咖 · 自我隐喻',mt:'风波后首专',nt:''},
      {id:'g10',yr:2023.62,yY:900,ty:'medium',sz:6,lb:'粉丝集体声援',mt:'好声音评论区',nt:''},
      {id:'g11',yr:2017.84,yY:870,ty:'minor',sz:4,lb:'《渡》评论区',mt:'事件期间发布',nt:''},
      {id:'g12',yr:2017.84,yY:910,ty:'minor',sz:3.5,lb:'背过手·暗涌',mt:'178%深夜率',nt:''},
      {id:'g13',yr:2024.12,yY:870,ty:'minor',sz:3.5,lb:'央视定调',mt:'法律定性转折',nt:''},
     ]}
  ];

  // Flatten, compute x, build lookup
  const allNodes = [];
  const nodeMap = {};
  LINES.forEach(l => {
    l.nodes.forEach(n => {
      n.lineId = l.id; n.lineName = l.name; n.lineEn = l.en; n.lineColor = l.color;
      n.x = xFromYear(n.yr);
      allNodes.push(n);
      nodeMap[n.id] = n;
    });
  });

  // Gray relationship edges (130+)
  const EDGES = (function(){
    const E=[];
    const add=(s,t,ty,w)=>{E.push({source:s,target:t,type:ty||'ref',weight:w||0.5})};
    const by=id=>LINES.find(l=>l.id===id).nodes;
    const al=by('album');
    for(let i=0;i<al.length-1;i++) add(al[i].id,al[i+1].id,'seq',0.6);
    const alHi={a06:['h02','h03'],a07:['h04','h05','h06','h07','h08'],a08:['h09','h10','h11'],a09:['h12','h13'],a10:['h14','h15'],a11:['h16'],a12:['h17'],a13:['h18'],a04:['h01']};
    Object.entries(alHi).forEach(([aid,ids])=>ids.forEach(id=>add(aid,id,'cmt',0.7)));
    const alMo={a06:['m01'],a07:['m02','m03','m04','m05','m06'],a08:['m07','m08','m09'],a09:['m10'],a10:['m12','m13'],a11:['m14','m15'],a12:['m16'],a13:['m17','m18']};
    Object.entries(alMo).forEach(([aid,ids])=>ids.forEach(id=>add(aid,id,'motif',0.45)));
    const alNi={a06:['n02'],a07:['n04'],a08:['n05','n13'],a09:['n06'],a10:['n07','n08'],a11:['n09','n14'],a12:['n10','n11'],a13:['n12']};
    Object.entries(alNi).forEach(([aid,ids])=>ids.forEach(id=>add(aid,id,'night',0.5)));
    const alLi={a04:['l01'],a06:['l02'],a07:['l03','l04','l05'],a08:['l06','l07'],a09:['l08'],a10:['l09','l14'],a11:['l10','l16'],a12:['l11','l15'],a13:['l12','l13']};
    Object.entries(alLi).forEach(([aid,ids])=>ids.forEach(id=>add(aid,id,'life',0.5)));
    add('a08','g01','event',0.55);add('a08','g02','event',0.7);add('a08','g03','event',0.5);
    add('a08','g04','event',0.55);add('a09','g09','event',0.5);add('a13','g07','event',0.45);
    add('a13','g10','event',0.4);
    add('m01','m03','derive',0.3);add('m01','m05','adjacent',0.25);
    add('m02','m07','guardian',0.4);add('m02','m11','evolve',0.35);
    add('m03','m09','derive',0.3);add('m07','m02','guardian',0.4);
    add('m14','m15','adjacent',0.3);add('m12','m14','critique',0.35);
    add('m02','m16','life-ritual',0.35);add('m17','m13','emotion',0.3);
    add('m14','n09','midnight-post',0.4);add('m03','n05','night-motif',0.3);
    add('m02','n07','midnight-ritual',0.35);add('n12','m17','night-emotion',0.4);
    const ni=by('night');for(let i=0;i<ni.length-1;i++) add(ni[i].id,ni[i+1].id,'night-seq',0.35);
    add('n02','l02','night-life',0.4);add('n04','l04','night-life',0.4);
    add('n05','l07','night-life',0.45);add('n07','l09','night-life',0.4);
    add('n12','l12','night-life',0.55);add('n12','l13','night-life',0.45);
    add('l03','l05','adjacent',0.3);add('l06','l07','adjacent',0.35);
    add('l09','l11','adjacent',0.35);add('l02','l12','evolve',0.4);
    add('l04','l06','adjacent',0.3);add('l08','l03','contrast',0.25);
    add('g02','m07','event-motif',0.7);add('g07','g10','event',0.5);
    const gu=by('guard');for(let i=0;i<gu.length-1;i++) add(gu[i].id,gu[i+1].id,'event-seq',0.3);
    add('h04','h05','same-song',0.5);add('h07','h09','same-era',0.35);
    add('h10','h16','peak-comparison',0.3);add('h02','l02','comment-life',0.45);
    add('h07','n04','comment-night',0.4);add('h09','l06','comment-life',0.35);
    add('h16','l10','comment-life',0.5);add('h01','l01','comment-life',0.45);
    const pairs=[['h04','m02'],['h07','n04'],['h16','n09'],['h10','n05'],['l03','m02'],['l06','m03'],['l12','n12'],['l09','n08'],['h02','m01'],['h15','m12'],['l14','m12']];
    pairs.forEach(([a,b])=>add(a,b,'cross',0.3));
    return E;
  })();

  // ---- DEFS ----
  const defs = svg.append('defs');
  defs.append('filter').attr('id','paper').attr('x','0').attr('y','0').attr('width','100%').attr('height','100%')
    .html(`<feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix values="0 0 0 0 0.04 0 0 0 0 0.02 0 0 0 0 0 0 0 0 0.018 0"/>`);
  const vig = defs.append('radialGradient').attr('id','vig').attr('cx','50%').attr('cy','50%');
  vig.append('stop').attr('offset','65%').attr('stop-color','transparent');
  vig.append('stop').attr('offset','100%').attr('stop-color','rgba(160,150,135,0.10)');

  // ---- BACKGROUND ----
  svg.append('rect').attr('width',1920).attr('height',1080).attr('fill','#F7F4EE');
  svg.append('rect').attr('width',1920).attr('height',1080).attr('fill','#FBFAF7').attr('opacity',0.5);
  svg.append('rect').attr('width',1920).attr('height',1080).attr('fill','#F7F4EE').attr('filter','url(#paper)');
  svg.append('rect').attr('width',1920).attr('height',1080).attr('fill','url(#vig)');

  // ---- GRID LINES ----
  const gridG = svg.append('g').attr('stroke','rgba(90,75,60,0.08)').attr('stroke-width',1);
  for(let gy=160;gy<=940;gy+=40){
    gridG.append('line').attr('x1',90).attr('y1',gy).attr('x2',1830).attr('y2',gy);
  }
  [2006,2008,2010,2012,2014,2016,2018,2020,2022,2024,2026].forEach(yr=>{
    const x=xFromYear(yr);
    const alpha = (yr===2016||yr===2020||yr===2023)?0.18:0.10;
    svg.append('line').attr('x1',x).attr('y1',145).attr('x2',x).attr('y2',925)
      .attr('stroke',`rgba(85,75,65,${alpha})`).attr('stroke-width',1);
  });

  // ---- YEAR RULERS ----
  [125,950].forEach((baseY,ri)=>{
    const isTop=ri===0;
    const years=[2006,2008,2010,2012,2014,2016,2018,2020,2022,2024,2026];
    years.forEach(yr=>{
      const x=xFromYear(yr);
      const tickY1=isTop?baseY-8:baseY-2;
      const tickY2=isTop?baseY+6:baseY+16;
      const txtY=isTop?baseY+20:baseY+32;
      if(yr>2006||isTop){
        svg.append('line').attr('x1',x).attr('y1',tickY1).attr('x2',x).attr('y2',tickY2)
          .attr('stroke','rgba(85,75,65,0.22)').attr('stroke-width',0.8);
      }
      svg.append('text').attr('x',x).attr('y',txtY).attr('text-anchor','middle')
        .attr('fill',isTop?'#8F857B':'#B0A79D')
        .attr('font-family','Inter,Georgia,serif').attr('font-size',isTop?'11px':'10px')
        .attr('font-weight','500').text(yr);
    });
  });

  // ---- GRAY RELATIONSHIP NETWORK ----
  const edgeG = svg.append('g').attr('id','gray-edges');
  EDGES.forEach(e=>{
    const s=nodeMap[e.source], t=nodeMap[e.target];
    if(!s||!t)return;
    edgeG.append('line').attr('x1',s.x).attr('y1',s.yY).attr('x2',t.x).attr('y2',t.yY)
      .attr('stroke','rgba(85,75,65,0.11)').attr('stroke-width',0.5);
  });

  // ---- LINEAGE PATHS ----
  const pathG = svg.append('g').attr('id','lineage-paths');
  const lineFn = d3.line().x(d=>d.x).y(d=>d.yY).curve(d3.curveBasis);

  LINES.forEach(l=>{
    const pts = l.nodes.map(n=>({x:n.x, yY:n.yY}));
    const g = pathG.append('g').attr('id','path-'+l.id).attr('class','lin-path');
    g.append('path').datum(pts).attr('d',lineFn).attr('fill','none')
      .attr('stroke',l.color).attr('stroke-width',3.2).attr('stroke-linecap','round').attr('stroke-linejoin','round')
      .attr('opacity',0.90);
    g.append('path').datum(pts).attr('d',lineFn).attr('fill','none')
      .attr('stroke',l.color).attr('stroke-width',5.5).attr('stroke-linecap','round')
      .attr('opacity',0.08);
  });

  // Album spine extra dashed companion
  const alPts = LINES[0].nodes.map(n=>({x:n.x, yY:n.yY}));
  svg.append('path').datum(alPts).attr('d',lineFn).attr('fill','none')
    .attr('stroke','#5A483A').attr('stroke-width',1).attr('stroke-dasharray','8,50').attr('opacity',0.18);

  // ---- NODES ----
  const nodesG = svg.append('g').attr('id','nodes');
  const nodeEls = [];

  allNodes.forEach(n=>{
    const g = nodesG.append('g').attr('id','node-'+n.id).attr('class','node')
      .attr('transform',`translate(${n.x},${n.yY})`).style('cursor','pointer');
    const r=n.sz;
    if(n.ty==='major'){
      g.append('circle').attr('r',r+4).attr('fill','none')
        .attr('stroke',n.lineColor).attr('stroke-opacity',0.30).attr('stroke-width',1.5);
    }
    g.append('circle').attr('r',r+1).attr('fill','#F8F6F1')
      .attr('stroke',d3.color(n.lineColor).darker(0.5).formatHex()).attr('stroke-width',1.8);
    g.append('circle').attr('r',r-0.5).attr('fill',n.lineColor)
      .attr('opacity',n.ty==='major'?0.92:n.ty==='medium'?0.78:0.60);
    if(n.ty==='minor'){
      g.append('circle').attr('r',1.2).attr('fill','#F8F6F1').attr('opacity',0.55);
    }
    nodeEls.push({g,n,r,x:n.x,y:n.yY});

    g.on('mouseenter',function(ev){
      showGenealogyTip(n,ev);
      d3.select(this).selectAll('circle').filter((_,i)=>i===2).transition().duration(120).attr('r',r+0.5);
      d3.select(this).selectAll('circle').filter((_,i)=>i===0).transition().duration(120).attr('r',r+6);
    });
    g.on('mouseleave',function(){
      hideGenealogyTip();
      d3.select(this).selectAll('circle').filter((_,i)=>i===2).transition().duration(120).attr('r',r-0.5);
      d3.select(this).selectAll('circle').filter((_,i)=>i===0).transition().duration(120).attr('r',r+4);
    });
  });

  // ---- LABELS ----
  const labelG = svg.append('g').attr('id','labels');
  const placed = [];

  const sortedNodes = [...nodeEls].sort((a,b)=>{
    const o={major:0,medium:1,minor:2};
    return o[a.n.ty]-o[b.n.ty];
  });

  const dirs=[
    {dx:0, dy:-1, an:'middle', dv:'top'},
    {dx:0, dy:1, an:'middle', dv:'bottom'},
    {dx:-1, dy:0, an:'end', dv:'left'},
    {dx:1, dy:0, an:'start', dv:'right'},
    {dx:0.7, dy:-0.7, an:'start', dv:'top-right'},
    {dx:-0.7, dy:-0.7, an:'end', dv:'top-left'},
    {dx:0.7, dy:0.7, an:'start', dv:'bottom-right'},
    {dx:-0.7, dy:0.7, an:'end', dv:'bottom-left'},
  ];

  function labelBB(x,y,w,h,an){
    if(an==='middle')return{x:x-w/2,y:y-h,w,h};
    if(an==='end')return{x:x-w-6,y:y-h/2,w,h};
    if(an==='start')return{x:x+6,y:y-h/2,w,h};
    return{x:x-w/2,y:y-h/2,w,h};
  }
  function overlaps(a,b){
    return !(a.x+a.w<b.x||b.x+b.w<a.x||a.y+a.h<b.y||b.y+b.h<a.y);
  }

  sortedNodes.forEach(el=>{
    const n=el.n;
    if(n.ty==='minor')return;
    const fs=n.ty==='major'?12.5:10;
    const fsSub=n.ty==='major'?10:8;
    const fsNote=n.ty==='major'?8.5:0;
    const offset=n.sz+8;
    const appW=Math.max(n.lb.length,n.mt.length)*fs*0.68+14;
    const nLines=1+(n.mt?1:0)+(n.nt?1:0);
    const appH=nLines*(fs+4)+6;

    let best=dirs[3], bestScore=Infinity;
    dirs.forEach(dir=>{
      const lx=el.x+dir.dx*offset, ly=el.y+dir.dy*offset;
      const bb=labelBB(lx,ly,appW,appH,dir.an);
      let sc=0; placed.forEach(p=>{if(overlaps(bb,p))sc++;});
      if(sc<bestScore){bestScore=sc;best=dir;}
    });

    let finalOff=bestScore>=2?offset+16:offset;
    const flx=el.x+best.dx*finalOff, fly=el.y+best.dy*finalOff;
    const lx1=el.x+best.dx*(el.r+3), ly1=el.y+best.dy*(el.r+3);
    const lx2=el.x+best.dx*finalOff, ly2=el.y+best.dy*finalOff;
    labelG.append('line').attr('x1',lx1).attr('y1',ly1).attr('x2',lx2).attr('y2',ly2)
      .attr('stroke','rgba(90,80,70,0.20)').attr('stroke-width',0.7);

    if(n.ty==='major'){
      const bgW=appW+8, bgH=appH+4;
      const bgX=best.an==='middle'?flx-bgW/2:best.an==='start'?flx-3:flx-bgW+3;
      const bgY=fly-bgH-2;
      labelG.append('rect').attr('x',bgX).attr('y',bgY).attr('width',bgW).attr('height',bgH)
        .attr('fill','rgba(248,246,241,0.72)').attr('rx',2);
    }

    labelG.append('text').attr('x',flx).attr('y',fly).attr('text-anchor',best.an)
      .attr('fill','#2F2924').attr('font-family','"Noto Serif SC",serif')
      .attr('font-size',fs+'px').attr('font-weight','700').text(n.lb);

    if(n.mt){
      labelG.append('text').attr('x',flx).attr('y',fly+fs+4).attr('text-anchor',best.an)
        .attr('fill','#6F655A').attr('font-family','"Noto Sans SC","Inter",sans-serif')
        .attr('font-size',fsSub+'px').text(n.mt);
    }

    if(n.nt){
      const noff=n.mt?(fs+fsSub+8):(fs+4);
      labelG.append('text').attr('x',flx).attr('y',fly+noff).attr('text-anchor',best.an)
        .attr('fill','#9A9085').attr('font-family','"Noto Sans SC",sans-serif')
        .attr('font-size',fsNote+'px').text(n.nt);
    }

    placed.push(labelBB(flx,fly,appW,appH,best.an));
  });

  // ---- TITLE (top-left, small) ----
  const titleG = svg.append('g').attr('transform','translate(90,58)');
  titleG.append('text').attr('x',0).attr('y',0)
    .attr('fill','#2C2723').attr('font-family','"Noto Serif SC",serif')
    .attr('font-size','34px').attr('font-weight','700').attr('letter-spacing','1px')
    .text('评论文化谱系');
  titleG.append('text').attr('x',1).attr('y',22)
    .attr('fill','#8A7D72').attr('font-family','Inter,"Noto Sans SC",sans-serif')
    .attr('font-size','10px').attr('font-weight','600').attr('letter-spacing','4px')
    .text('COMMENT CULTURE GENEALOGY');
  titleG.append('text').attr('x',0).attr('y',40)
    .attr('fill','#746A60').attr('font-family','"Noto Sans SC",sans-serif')
    .attr('font-size','13px')
    .text('一句话怎样从一首歌长出来，穿过二十年');
  titleG.append('line').attr('x1',0).attr('y1',50).attr('x2',260).attr('y2',50)
    .attr('stroke','#CFC6B8').attr('stroke-width',1);

  // ---- LEGEND (bottom-right) ----
  const lgX=1545,lgY=785;
  const legendG=svg.append('g').attr('transform',`translate(${lgX},${lgY})`);
  legendG.append('rect').attr('width',300).attr('height',155)
    .attr('fill','rgba(248,246,241,0.78)').attr('stroke','rgba(100,85,70,0.18)').attr('stroke-width',1).attr('rx',2);
  legendG.append('text').attr('x',14).attr('y',20)
    .attr('fill','#8A7D72').attr('font-family','Inter,"Noto Sans SC",sans-serif')
    .attr('font-size','9px').attr('font-weight','600').attr('letter-spacing','2px').text('LINES');

  LINES.forEach((l,i)=>{
    const ly=34+i*20;
    legendG.append('line').attr('x1',14).attr('y1',ly).attr('x2',42).attr('y2',ly)
      .attr('stroke',l.color).attr('stroke-width',3.2).attr('stroke-linecap','round');
    legendG.append('text').attr('x',50).attr('y',ly+1).attr('fill','#2C2723')
      .attr('font-family','"Noto Serif SC",serif').attr('font-size','11px').text(l.name);
    legendG.append('text').attr('x',50).attr('y',ly+13).attr('fill','#A1978C')
      .attr('font-family','Inter,"Noto Sans SC",sans-serif').attr('font-size','8px').text(l.en);
  });

  // ---- SOURCE NOTE ----
  svg.append('text').attr('x',90).attr('y',1000)
    .attr('fill','#B0A79D').attr('font-family','Inter,"Noto Sans SC",sans-serif').attr('font-size','8.5px')
    .text('SOURCE: NETEASE CLOUD MUSIC · 10,925,396 COMMENTS · 139 SONGS · 13 ALBUMS · 2006–2026');
  svg.append('text').attr('x',90).attr('y',1018)
    .attr('fill','#C4BBB0').attr('font-family','Inter,"Noto Sans SC",sans-serif').attr('font-size','8px')
    .text('METHOD: DUCKDB FULL STATS + REGEX MOTIF DETECTION + BERT SEMANTIC CLUSTERING · 195 TOPICS · 4 USER PERSONAS');

  // ---- INTERACTION ----
  let activeLine=null;
  svg.on('click',function(ev){
    const pel=ev.target.closest('.lin-path');
    if(!pel){if(activeLine){activeLine=null;resetLines();}return;}
    const lid=pel.id.replace('path-','');
    if(activeLine===lid){activeLine=null;resetLines();return;}
    activeLine=lid;
    d3.selectAll('.lin-path').style('opacity',function(){
      return d3.select(this).attr('id')==='path-'+lid?'1':'0.15';
    });
    d3.selectAll('.node').style('opacity',function(){
      const nid=d3.select(this).attr('id').replace('node-','');
      const nd=nodeMap[nid];
      return nd&&nd.lineId===lid?'1':'0.18';
    });
    d3.selectAll('#gray-edges line').style('opacity','0.04');
  });
  function resetLines(){
    d3.selectAll('.lin-path,.node').style('opacity','1');
    d3.selectAll('#gray-edges line').style('opacity','1');
  }

  // ---- TOOLTIP ----
  function showGenealogyTip(n,ev){
    const tip=document.getElementById('tip2');
    document.getElementById('t2-title').textContent=n.lb;
    document.getElementById('t2-data').textContent=[n.mt||'',n.nt||''].filter(Boolean).join(' · ');
    document.getElementById('t2-data').style.display=n.mt?'block':'none';
    document.getElementById('t2-note').textContent='';
    document.getElementById('t2-line').textContent=n.lineName+' / '+n.lineEn;
    document.getElementById('t2-line').style.color=n.lineColor;
    tip.classList.add('on');
    let tx=ev.clientX+14,ty=ev.clientY-6;
    const w=tip.offsetWidth,h=tip.offsetHeight;
    tx=Math.min(tx,window.innerWidth-w-10);
    ty=Math.max(6,Math.min(ty,window.innerHeight-h-10));
    tip.style.left=tx+'px';tip.style.top=ty+'px';
  }
  function hideGenealogyTip(){document.getElementById('tip2').classList.remove('on');}
})();
</script>
</body>
</html>