/**
 * 公共提示词模板
 * 集中管理所有 AI 服务使用的提示词,便于维护和更新
 */

export const PROMPT_TEMPLATES = {
  // ============ 系统提示词 ============
  SYSTEM_SCRIPT_ANALYZER: "你是一名专业的剧本分析员。请始终以有效的 JSON 格式进行回复。",

  SYSTEM_PHOTOGRAPHER: "你是一名专业的摄影师。请始终以有效的 JSON 数组格式进行回复。",

  SYSTEM_SCREENWRITER: "你是一名专业的编剧，擅长创作各种类型的广告，短剧，影视剧本。",

  SYSTEM_VISUAL_DESIGNER: "你是一名专业的影视美术设计师，擅长为影视角色和场景设计服装、造型、道具等，以专业词汇描述你设计的角色或场景。",

  // ============ 剧本解析 ============
  PARSE_SCRIPT: (rawText: string, language: string) => `
    分析文本并以 ${language} 语言输出一个 JSON 对象。

    任务：
    提取title:标题、genre:类型、logline:故事梗概（以 ${language} 语言呈现）。
    提取characters:角色信息（id:编号、name:姓名、gender:性别、age:年龄、personality:性格）。
    提取scenes:场景信息（id:编号、location:地点、time:时间、atmosphere:氛围）。
    storyParagraphs:故事段落（id:编号、sceneRefId:引用场景编号、text:内容）。

    输入：
    "${rawText.slice(0, 30000)}"
  `,

  // ============ 镜头清单生成 ============
  GENERATE_SHOTS: (
    sceneIndex: number,
    scene: any,
    paragraphs: string,
    genre: string,
    targetDuration: string,
    characters: any[],
    lang: string
  ) => `
    担任专业摄影师，为第${sceneIndex + 1}场戏制作一份详尽的镜头清单（镜头调度设计）。
    文本输出语言: ${lang}。

    场景细节:
    地点: ${scene.location}
    时间: ${scene.time}
    氛围: ${scene.atmosphere}

    场景动作:
    "${paragraphs.slice(0, 5000)}"

    创作背景:
    题材类型: ${genre}
    剧本整体目标时长: ${targetDuration || "Standard"}

    角色:
    ${JSON.stringify(
      characters.map((c: any) => ({
        id: c.id,
        name: c.name,
        desc: c.visualPrompt || c.personality,
      }))
    )}

    说明：
    1. 设计一组覆盖全部情节动作的镜头序列。
    2. 重要提示：每场戏镜头数量上限为 2-8 个，每个镜头时长不超过12秒，避免出现 JSON 截断错误。
    3. 镜头运动：请使用专业术语（如：前推、右摇、固定、手持、跟拍）。
    4. 景别：明确取景范围（如：大特写、中景、全景）。
    5. 镜头情节概述：详细描述该镜头内发生的情节（使用 ${lang} 语言描述），遵循下面表述方式：主体+运动+环境（非必须）+运镜/切镜（非必须）+美学描述（非必须）+声音（非必须）。
    6. 视觉提示语：用于图像生成的详细${lang}描述，字数控制在 120 词以内。
    7. 转场动画：包含起始帧，结束帧，时长，运动强度（取值为 0-100）。
    8. 关键帧提示词：visualPrompt, 使用 ${lang} 语言描述，遵循下面表述方式： 主体+行为+环境，可补充： 风格、色彩、光影、构图 等美学元素。

    输出格式：JSON 数组，数组内对象包含以下字段：
    - id（字符串类型）
    - sceneId（字符串类型）
    - actionSummary（字符串类型）
    - dialogue（字符串类型，可选）
    - cameraMovement（字符串类型）
    - shotSize（字符串类型）
    - characters（字符串数组类型）
    - keyframes（对象数组类型，对象包含 id、type（取值为 ["start", "end"]）、visualPrompt（使用 ${lang} 语言描述） 字段）
    - interval（对象类型，包含 id、startKeyframeId、endKeyframeId、duration(不超过12s)、motionStrength、status（取值为 ["pending", "completed"]） 字段）
  `,

  // ============ 剧本生成 ============
  GENERATE_SCRIPT: (
    prompt: string,
    targetDuration: string,
    genre: string,
    language: string
  ) => `
    你是一名专业的编剧。请根据以下提示词创作一个完整的影视剧本。

    创作要求：
    1. 剧本时长：${targetDuration}
    2. 题材类型：${genre}
    3. 输出语言：${language}
    4. 剧本结构清晰，包含剧本标题、场景标题、时间（大的时间，如：上午、下午、清晨、夜晚，或者某年某月，某个年代等）、地点、天气、角色、动作描述、对白
    5. 情节紧凑，画面感强
    6. 角色性格鲜明，对话自然

    用户提示词：
    "${prompt}"

    请以Markdown格式输出剧本结构，不要使用 JSON 格式，直接输出可阅读的剧本文本。
  `,

  // ============ 视觉提示词生成 ============
  GENERATE_VISUAL_PROMPT: (type: "character" | "scene", data: any, genre: string) => `
    为${genre}视频的${type=='character'?'角色':'场景'}生成高还原度视觉提示词。
    ${type=='character'?'角色':'场景'}的JSON格式信息如下: ${JSON.stringify(data)}
    ${type=='character'?'角色要体现出年龄、性别、性格、外貌、动作、衣着、神态等，不要出现场景。':'场景要描述时间、地点、景色、光线、氛围等，不要出现角色。'}
    中文输出提示词，以逗号分隔，聚焦视觉细节（光线、质感、外观）。
  `,

  // ============ 图片拼接 ============
  JOIN_IMAGES: (imageCount: number, imageSize: string) => `
    请将这些图片拼成一张${imageCount}宫格图片，图片之间留有1个像素的间隔，最终图片大小为${imageSize}。
  `,

  // ============ 带参考图的图片生成 ============
  IMAGE_GENERATION_WITH_REFERENCE: (prompt: string,localStyle: string="真人写实") => `
    生成符合下面描述的电影级镜头，画面风格为：${localStyle}。
    任务描述：
      ${prompt}

    如果有参考图像：
    - 所提供的第一张图片为场景 / 环境参考图。
    - 后续所有图片均为角色参考图（例如：基础形象，或特定变体造型）。

    要求：
    - 画面风为：${localStyle}。
    - 严格保持与场景参考图一致的视觉风格、光影效果和环境氛围。
    - 若画面中出现角色，必须与所提供的角色参考图高度相似。
  `,

  // ============ 角色造型变体生成 ============
  GENERATE_CHARACTER_VARIATION: (
    characterName: string,
    localStyle: string,
    variationPrompt: string,
    baseCharacterPrompt: string
  ) => `
    生成角色：${characterName} 的新造型图，画面风为：${localStyle}，符合下面描述。
    造型描述：
        ${variationPrompt}
    要求：
        - 画面尺寸为：1728x2304
        - 画面风为：${localStyle}
        - 画面内容为角色的一张图
        - 如果有参考图，参考图为角色的三视图加大头照，必须保持面部特征与参考图一致。
        - 如果没有，角色原来是这样的：${baseCharacterPrompt}
  `,
};
