import type { ProviderPreset } from "../types";

/** 从 cc-switch 精简而来的供应商预设列表 */
export const providerPresets: ProviderPreset[] = [
  { name: "Claude Official", endpoint: null, websiteUrl: "https://www.anthropic.com/claude-code" },
  { name: "Shengsuanyun", endpoint: "https://router.shengsuanyun.com/api", websiteUrl: "https://www.shengsuanyun.com/?from=CH_4HHXMRYF" },
  { name: "PatewayAI", endpoint: "https://api.pateway.ai", websiteUrl: "https://pateway.ai" },
  { name: "火山 Agentplan", endpoint: "https://ark.cn-beijing.volces.com/api/coding", websiteUrl: "https://www.volcengine.com/activity/agentplan" },
  { name: "BytePlus", endpoint: "https://ark.ap-southeast.bytepluses.com/api/coding", websiteUrl: "https://www.byteplus.com/en/product/modelark" },
  { name: "DouBaoSeed", endpoint: "https://ark.cn-beijing.volces.com/api/compatible", websiteUrl: "https://console.volcengine.com/ark" },
  { name: "Gemini Native", endpoint: "https://generativelanguage.googleapis.com", websiteUrl: "https://ai.google.dev/gemini-api" },
  { name: "DeepSeek", endpoint: "https://api.deepseek.com/anthropic", websiteUrl: "https://platform.deepseek.com" },
  { name: "OpenCode Go", endpoint: "https://opencode.ai/zen/go", websiteUrl: "https://opencode.ai" },
  { name: "Zhipu GLM", endpoint: "https://open.bigmodel.cn/api/anthropic", websiteUrl: "https://open.bigmodel.cn" },
  { name: "Zhipu GLM en", endpoint: "https://api.z.ai/api/anthropic", websiteUrl: "https://z.ai" },
  { name: "Baidu Qianfan Coding Plan", endpoint: "https://qianfan.baidubce.com/anthropic/coding", websiteUrl: "https://cloud.baidu.com/product/qianfan_modelbuilder" },
  { name: "Bailian", endpoint: "https://dashscope.aliyuncs.com/apps/anthropic", websiteUrl: "https://bailian.console.aliyun.com" },
  { name: "Bailian For Coding", endpoint: "https://coding.dashscope.aliyuncs.com/apps/anthropic", websiteUrl: "https://bailian.console.aliyun.com" },
  { name: "Kimi", endpoint: "https://api.moonshot.cn/anthropic", websiteUrl: "https://platform.moonshot.cn/console" },
  { name: "Kimi For Coding", endpoint: "https://api.kimi.com/coding/", websiteUrl: "https://www.kimi.com/code/docs/" },
  { name: "StepFun", endpoint: "https://api.stepfun.com/step_plan", websiteUrl: "https://platform.stepfun.com/step-plan" },
  { name: "StepFun en", endpoint: "https://api.stepfun.ai/step_plan", websiteUrl: "https://platform.stepfun.ai/step-plan" },
  { name: "ModelScope", endpoint: "https://api-inference.modelscope.cn", websiteUrl: "https://modelscope.cn" },
  { name: "KAT-Coder", endpoint: "https://vanchin.streamlake.ai/api/gateway/v1/endpoints/EP_ID/claude-code-proxy", websiteUrl: "https://console.streamlake.ai" },
  { name: "Longcat", endpoint: "https://api.longcat.chat/anthropic", websiteUrl: "https://longcat.chat/platform" },
  { name: "MiniMax", endpoint: "https://api.minimaxi.com/anthropic", websiteUrl: "https://platform.minimaxi.com" },
  { name: "MiniMax en", endpoint: "https://api.minimax.io/anthropic", websiteUrl: "https://platform.minimax.io" },
  { name: "BaiLing", endpoint: "https://api.tbox.cn/api/anthropic", websiteUrl: "https://alipaytbox.yuque.com/sxs0ba/ling/get_started" },
  { name: "AiHubMix", endpoint: "https://aihubmix.com", websiteUrl: "https://aihubmix.com" },
  { name: "SiliconFlow", endpoint: "https://api.siliconflow.cn", websiteUrl: "https://siliconflow.cn" },
  { name: "SiliconFlow en", endpoint: "https://api.siliconflow.com", websiteUrl: "https://siliconflow.com" },
  { name: "DMXAPI", endpoint: "https://www.dmxapi.cn", websiteUrl: "https://www.dmxapi.cn" },
  { name: "PackyCode", endpoint: "https://www.packyapi.com", websiteUrl: "https://www.packyapi.com" },
  { name: "APIKEY.FUN", endpoint: "https://api.apikey.fun", websiteUrl: "https://apikey.fun" },
  { name: "APINebula", endpoint: "https://apinebula.com", websiteUrl: "https://apinebula.com" },
  { name: "AtlasCloud", endpoint: "https://api.atlascloud.ai", websiteUrl: "https://www.atlascloud.ai" },
  { name: "SudoCode", endpoint: "https://sudocode.us", websiteUrl: "https://sudocode.us" },
  { name: "ClaudeAPI", endpoint: "https://gw.claudeapi.com", websiteUrl: "https://claudeapi.com" },
  { name: "ClaudeCN", endpoint: "https://claudecn.top", websiteUrl: "https://claudecn.top" },
  { name: "RunAPI", endpoint: "https://runapi.co", websiteUrl: "https://runapi.co" },
  { name: "RelaxyCode", endpoint: "https://www.relaxycode.com", websiteUrl: "https://www.relaxycode.com" },
  { name: "Cubence", endpoint: "https://api.cubence.com", websiteUrl: "https://cubence.com" },
  { name: "AIGoCode", endpoint: "https://api.aigocode.com", websiteUrl: "https://aigocode.com" },
  { name: "RightCode", endpoint: "https://www.right.codes/claude", websiteUrl: "https://www.right.codes" },
  { name: "AICodeMirror", endpoint: "https://api.aicodemirror.com/api/claudecode", websiteUrl: "https://www.aicodemirror.com" },
  { name: "CrazyRouter", endpoint: "https://cn.crazyrouter.com", websiteUrl: "https://www.crazyrouter.com" },
  { name: "SSSAiCode", endpoint: "https://node-hk.sssaicode.com/api", websiteUrl: "https://www.sssaicode.com" },
  { name: "Compshare", endpoint: "https://api.modelverse.cn", websiteUrl: "https://www.compshare.cn" },
  { name: "Compshare Coding Plan", endpoint: "https://cp.compshare.cn", websiteUrl: "https://www.compshare.cn" },
  { name: "Micu", endpoint: "https://www.micuapi.ai", websiteUrl: "https://www.micuapi.ai" },
  { name: "CTok.ai", endpoint: "https://api.ctok.ai", websiteUrl: "https://ctok.ai" },
  { name: "E-FlowCode", endpoint: "https://e-flowcode.cc", websiteUrl: "https://e-flowcode.cc" },
  { name: "OpenRouter", endpoint: "https://openrouter.ai/api", websiteUrl: "https://openrouter.ai" },
  { name: "TheRouter", endpoint: "https://api.therouter.ai", websiteUrl: "https://therouter.ai" },
  { name: "Novita AI", endpoint: "https://api.novita.ai/anthropic", websiteUrl: "https://novita.ai" },
  { name: "GitHub Copilot", endpoint: "https://api.githubcopilot.com", websiteUrl: "https://github.com/features/copilot" },
  { name: "Codex", endpoint: "https://chatgpt.com/backend-api/codex", websiteUrl: "https://openai.com/chatgpt/pricing" },
  { name: "LemonData", endpoint: "https://api.lemondata.cc", websiteUrl: "https://lemondata.cc" },
  { name: "Nvidia", endpoint: "https://integrate.api.nvidia.com", websiteUrl: "https://build.nvidia.com" },
  { name: "PIPELLM", endpoint: "https://cc-api.pipellm.ai", websiteUrl: "https://code.pipellm.ai" },
  { name: "Xiaomi MiMo", endpoint: "https://api.xiaomimimo.com/anthropic", websiteUrl: "https://platform.xiaomimimo.com" },
  { name: "Xiaomi MiMo Token Plan (China)", endpoint: "https://token-plan-cn.xiaomimimo.com/anthropic", websiteUrl: "https://platform.xiaomimimo.com/#/token-plan" },
  { name: "AWS Bedrock (AKSK)", endpoint: "https://bedrock-runtime.AWS_REGION.amazonaws.com", websiteUrl: "https://aws.amazon.com/bedrock/" },
  { name: "AWS Bedrock (API Key)", endpoint: "https://bedrock-runtime.AWS_REGION.amazonaws.com", websiteUrl: "https://aws.amazon.com/bedrock/" },
];

/**
 * 获取供应商列表，第一项是「不使用供应商」
 */
export function getVendorChoices(): ProviderPreset[] {
  return [
    { name: "(不使用供应商)", endpoint: null, websiteUrl: "" },
    ...providerPresets,
  ];
}

/**
 * 根据供应商名生成 profile 名称
 * 如 "Xiaomi MiMo Token Plan (China)" → "xiaomi mimo token plan (china)"
 */
export function generateProfileName(vendorName: string): string {
  return vendorName.toLowerCase().trim();
}
