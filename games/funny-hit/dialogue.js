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
  F.pickDialogue = (group, previous, random = Math.random) => {
    const choices = F.dialogue[group].filter(text => text !== previous);
    return choices[Math.floor(random() * choices.length)];
  };
})();
