/**
 * 百度TTS音色库配置
 * 文档: https://ai.baidu.com/ai-doc/SPEECH/Rluv3uq3d
 */

export interface Voice {
  per: number;          // 发音人参数值
  name: string;         // 发音人名称
  library: 'basic' | 'premium' | 'exquisite' | 'llm';  // 音库类型
  scene: string;        // 适用场景
  languages: string;    // 支持语言
}

export const VOICE_LIBRARY: Voice[] = [
  // 基础音库
  { per: 0, name: '度小美-标准女主播', library: 'basic', scene: '资讯', languages: '中文/英文' },
  { per: 1, name: '度小宇-亲切男声', library: 'basic', scene: '对话助手', languages: '中文/英文' },
  { per: 3, name: '度逍遥-情感男声', library: 'basic', scene: '小说', languages: '中文/英文' },
  { per: 4, name: '度丫丫-童声', library: 'basic', scene: '小说', languages: '中文/英文' },

  // 精品音库
  { per: 5003, name: '度逍遥-情感男声', library: 'premium', scene: '小说', languages: '中文/英文' },
  { per: 5118, name: '度小鹿-甜美女声', library: 'premium', scene: '对话助手', languages: '中文/英文' },
  { per: 106, name: '度博文-专业男主播', library: 'premium', scene: '资讯', languages: '中文/英文' },
  { per: 103, name: '度米朵-可爱童声', library: 'premium', scene: '对话助手', languages: '中文/英文' },
  { per: 110, name: '度小童-童声主播', library: 'premium', scene: '资讯', languages: '中文/英文' },
  { per: 111, name: '度小萌-软萌妹子', library: 'premium', scene: '小说', languages: '中文/英文' },
  { per: 5, name: '度小娇-成熟女主播', library: 'premium', scene: '资讯', languages: '中文/英文' },

  // 臻品音库
  { per: 4003, name: '度逍遥-情感男声', library: 'exquisite', scene: '小说', languages: '中文/英文' },
  { per: 4106, name: '度博文-专业男主播', library: 'exquisite', scene: '资讯', languages: '中文/英文' },
  { per: 4115, name: '度小贤-电台男主播', library: 'exquisite', scene: '资讯', languages: '中文/英文' },
  { per: 5147, name: '度常盈-电台女主播', library: 'exquisite', scene: '资讯', languages: '中文/英文' },
  { per: 5976, name: '度小皮-萌娃童声', library: 'exquisite', scene: '资讯', languages: '中文/英文' },
  { per: 5971, name: '度皮特-老外男声', library: 'exquisite', scene: '资讯', languages: '中文/英文' },
  { per: 4164, name: '度阿肯-主播男声', library: 'exquisite', scene: '资讯', languages: '中文/英文' },
  { per: 4176, name: '度有为-磁性男声', library: 'exquisite', scene: '资讯', languages: '中文/英文' },
  { per: 4259, name: '度小新-播音女声', library: 'exquisite', scene: '资讯', languages: '中文/英文' },
  { per: 4119, name: '度小鹿-甜美女声', library: 'exquisite', scene: '对话助手', languages: '中文/英文' },
  { per: 4105, name: '度灵儿-清激女声', library: 'exquisite', scene: '对话助手', languages: '中文/英文' },
  { per: 4117, name: '度小乔-活泼女声', library: 'exquisite', scene: '对话助手', languages: '中文/英文' },
  { per: 4288, name: '度晴岚-甜美女声', library: 'exquisite', scene: '对话助手', languages: '中文/英文' },
  { per: 4192, name: '度青川-温柔男声', library: 'exquisite', scene: '对话助手', languages: '中文/英文' },
  { per: 4100, name: '度小雯-活力女主播', library: 'exquisite', scene: '资讯', languages: '中文/英文' },
  { per: 4103, name: '度米朵-可爱女声', library: 'exquisite', scene: '对话助手', languages: '中文/英文' },
  { per: 4144, name: '度姗姗-娱乐女声', library: 'exquisite', scene: '配音', languages: '中文/英文' },
  { per: 4278, name: '度小贝-知识女主播', library: 'exquisite', scene: '资讯', languages: '中文/英文' },
  { per: 4143, name: '度清风-配音男声', library: 'exquisite', scene: '配音', languages: '中文/英文' },
  { per: 4140, name: '度小新-专业女主播', library: 'exquisite', scene: '资讯', languages: '中文/英文' },
  { per: 4129, name: '度小彦-知识男主播', library: 'exquisite', scene: '资讯', languages: '中文/英文' },
  { per: 4149, name: '度星河-广告男声', library: 'exquisite', scene: '配音', languages: '中文/英文' },
  { per: 4254, name: '度小清-广告女声', library: 'exquisite', scene: '配音', languages: '中文/英文' },
  { per: 4206, name: '度博文-综艺男声', library: 'exquisite', scene: '配音', languages: '中文/英文' },
  { per: 4147, name: '度云朵-可爱童声', library: 'exquisite', scene: '配音', languages: '中文/英文' },
  { per: 4141, name: '度婉婉-甜美女声', library: 'exquisite', scene: '配音', languages: '中文/英文' },
  { per: 4226, name: '南方-电台女主播', library: 'exquisite', scene: '资讯', languages: '中文/英文' },
  { per: 6205, name: '度悠然-旁白男声', library: 'exquisite', scene: '小说', languages: '中文/英文' },
  { per: 6221, name: '度云萱-旁白女声', library: 'exquisite', scene: '小说', languages: '中文/英文' },
  { per: 6546, name: '度清豪-逍遥侠客', library: 'exquisite', scene: '小说', languages: '中文/英文' },
  { per: 6602, name: '度清柔-温柔男神', library: 'exquisite', scene: '小说', languages: '中文/英文' },
  { per: 6562, name: '度雨楠-元气少女', library: 'exquisite', scene: '小说', languages: '中文/英文' },
  { per: 6543, name: '度雨萌-邻家女孩', library: 'exquisite', scene: '小说', languages: '中文/英文' },
  { per: 6747, name: '度书古-情感男声', library: 'exquisite', scene: '小说', languages: '中文/英文' },
  { per: 6748, name: '度书严-沉稳男声', library: 'exquisite', scene: '小说', languages: '中文/英文' },
  { per: 6746, name: '度书道-沉稳男声', library: 'exquisite', scene: '小说', languages: '中文/英文' },
  { per: 6644, name: '度书宁-亲和女声', library: 'exquisite', scene: '小说', languages: '中文/英文' },
  { per: 4148, name: '度小夏-甜美女声', library: 'exquisite', scene: '小说', languages: '中文/英文' },
  { per: 4277, name: '西贝-脱口秀女声', library: 'exquisite', scene: '配音', languages: '中文/英文' },
  { per: 4114, name: '阿龙-说书男声', library: 'exquisite', scene: '配音', languages: '中文/英文' },
  { per: 5153, name: '度常悦-民生女主播', library: 'exquisite', scene: '资讯', languages: '中文/英文' },
  { per: 6561, name: '度小乐-可爱童声', library: 'exquisite', scene: '对话助手', languages: '中文/英文' },

  // 大模型音库
  { per: 4179, name: '度泽言-温暖男声', library: 'llm', scene: '超拟人单情感', languages: '中文/英文' },
  { per: 4146, name: '度禧禧-阳光女声', library: 'llm', scene: '超拟人单情感', languages: '中文/英文' },
  { per: 6567, name: '度小柔-温柔女声', library: 'llm', scene: '超拟人单情感', languages: '中文/英文' },
  { per: 4156, name: '度言浩-年轻男声', library: 'llm', scene: '超拟人单情感', languages: '中文/英文' },
  { per: 4157, name: '度言静-明亮女声', library: 'llm', scene: '超拟人单情感', languages: '中文/英文' },
  { per: 4189, name: '度涵竹-开朗女声', library: 'llm', scene: '超拟人多情感', languages: '中文/英文' },
  { per: 4194, name: '度嫣然-活泼女声', library: 'llm', scene: '超拟人多情感', languages: '中文/英文' },
  { per: 4193, name: '度泽言-开朗男声', library: 'llm', scene: '超拟人多情感', languages: '中文/英文' },
  { per: 4195, name: '度怀安-磁性男声', library: 'llm', scene: '超拟人多情感', languages: '中文/英文' },
  { per: 4196, name: '度清影-甜美女声', library: 'llm', scene: '超拟人多情感', languages: '中文/英文' },
  { per: 4197, name: '度沁遥-知性女声', library: 'llm', scene: '超拟人多情感', languages: '中文/英文' },
  { per: 20100, name: '度小粤-粤语女声', library: 'llm', scene: '方言', languages: '中文/英文' },
  { per: 20101, name: '度晓芸-粤语女声', library: 'llm', scene: '方言', languages: '中文/英文' },
  { per: 4257, name: '四川小哥-四川男声', library: 'llm', scene: '方言', languages: '中文/英文' },
  { per: 4132, name: '度阿闽-闽南男声', library: 'llm', scene: '方言', languages: '中文/英文' },
  { per: 4139, name: '度小蓉-四川女声', library: 'llm', scene: '方言', languages: '中文/英文' },
  { per: 5977, name: '台媒女声-台湾女声', library: 'llm', scene: '方言', languages: '中文/英文' },
  { per: 4007, name: '度小台-台湾女声', library: 'llm', scene: '方言', languages: '中文/英文' },
  { per: 4150, name: '度湘玉-陕西女声', library: 'llm', scene: '方言', languages: '中文/英文' },
  { per: 4134, name: '度阿锦-东北女声', library: 'llm', scene: '方言', languages: '中文/英文' },
  { per: 4172, name: '度筱林-天津女声', library: 'llm', scene: '方言', languages: '中文/英文' },
  { per: 5980, name: '度阿花-上海女声', library: 'llm', scene: '方言', languages: '中文/英文' },
  { per: 4154, name: '度老崔-北京男声', library: 'llm', scene: '方言', languages: '中文/英文' },
];

/**
 * 按音库类型分组
 */
export const VOICE_LIBRARY_BY_TYPE: Record<string, Voice[]> = {
  basic: VOICE_LIBRARY.filter(v => v.library === 'basic'),
  premium: VOICE_LIBRARY.filter(v => v.library === 'premium'),
  exquisite: VOICE_LIBRARY.filter(v => v.library === 'exquisite'),
  llm: VOICE_LIBRARY.filter(v => v.library === 'llm'),
};

/**
 * 按场景分组
 */
export const VOICE_LIBRARY_BY_SCENE: Record<string, Voice[]> = {
  '资讯': VOICE_LIBRARY.filter(v => v.scene === '资讯'),
  '对话助手': VOICE_LIBRARY.filter(v => v.scene === '对话助手'),
  '小说': VOICE_LIBRARY.filter(v => v.scene === '小说'),
  '配音': VOICE_LIBRARY.filter(v => v.scene === '配音'),
  '超拟人单情感': VOICE_LIBRARY.filter(v => v.scene === '超拟人单情感'),
  '超拟人多情感': VOICE_LIBRARY.filter(v => v.scene === '超拟人多情感'),
  '方言': VOICE_LIBRARY.filter(v => v.scene === '方言'),
};

/**
 * 音库类型显示名称
 */
export const VOICE_LIBRARY_TYPE_NAMES: Record<string, string> = {
  basic: '基础音库',
  premium: '精品音库',
  exquisite: '臻品音库',
  llm: '大模型音库',
};
