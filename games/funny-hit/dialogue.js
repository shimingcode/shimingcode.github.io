(() => {
  'use strict';
  const F = window.FunnyHit ||= {};
  F.dialogue = Object.freeze({
    milestones: {1:'呀！吓我一跳～',3:'等、等一下嘛～',5:'呜呜，饶了狐狐嘛～',8:'哼，狐狐才没有认输呢！',12:'再、再陪狐狐玩一下嘛～',15:'嘿嘿，你好厉害呀～',20:'好啦好啦，狐狐投降啦～'},
    normal:['呀！','诶？','呜哇～','怎、怎么啦？','吓我一跳嘛～'],
    plead:['呜呜，不要再点啦～','等、等一下嘛～','狐狐知道错啦～','饶了狐狐好不好呀～','人家要投降啦～'],
    shy:['再、再陪狐狐玩一下嘛～','哼，才没有害羞呢～','你、你怎么一直看着狐狐呀？','嘿嘿，再来一下嘛～','人家才没有认输呢～','呜……好害羞呀～'],
    final:['好啦好啦，狐狐认输啦～','这次是你赢啦！','下次狐狐一定会赢的！','要不要再玩一次呀？']
  });
  F.emotions = Object.freeze({
    SHY:{label:'害羞',rate:.93,pitch:1.04,lines:['诶……你、你怎么又来啦～','呜……人家会害羞的嘛～','才、才没有喜欢这样呢！']},
    PLEADING:{label:'求饶',rate:.91,pitch:1.02,lines:['呜呜，饶了狐狐嘛～','等、等一下呀～','人家真的要投降啦～']},
    CUTE:{label:'撒娇',rate:.93,pitch:1.06,lines:['再、再陪狐狐玩一下嘛～','好不好嘛～','嘿嘿，再来一次嘛～']},
    HAPPY:{label:'开心',rate:.98,pitch:1.05,lines:['诶嘿嘿，好开心呀！','哇！好厉害～','狐狐最喜欢樱花啦！']},
    PLAYFUL:{label:'调皮',rate:.96,pitch:1.04,lines:['哼哼，抓不到我吧！','嘿嘿，被骗到啦！','接招！狐狐魔法！']}
  });
  F.nodeEmotions = Object.freeze({1:'PLAYFUL',3:'SHY',5:'PLEADING',8:'PLAYFUL',12:'CUTE',15:'HAPPY',20:'PLEADING'});
  // Only populate with verified, licensed recordings. Empty means no recordings are shipped.
  // Keys are exact subtitles; values: {src:'filename.wav',label:'voice name',license:'license reference'}.
  F.recordings = Object.freeze({});
  F.pickDialogue = (group, previous, random = Math.random) => {
    const choices = F.dialogue[group].filter(text => text !== previous);
    return choices[Math.floor(random() * choices.length)];
  };
})();
