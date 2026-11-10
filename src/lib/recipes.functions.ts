import { createServerFn } from "@tanstack/react-start";
import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import { z } from "zod";
import { buildUserMessage, URGENT_RULE, TIMER_RULE } from "@/lib/recipe-prompt";

export const recipeSchema = z.object({
  recipes: z
    .array(
      z.object({
        name: z.string(),
        emoji: z.string(),
        description: z.string(),
        difficulty: z.enum(["쉬움", "보통", "어려움"]),
        timeMinutes: z.number(),
        categories: z.array(z.string()),
        usedIngredients: z.array(z.string()),
        extraIngredients: z.array(z.string()),
        extraTip: z.string(),
        steps: z.array(z.string()),
      }),
    )
    .length(3),
});

export type Recipe = z.infer<typeof recipeSchema>["recipes"][number];

export const recommendRecipes = createServerFn({ method: "POST" })
  .validator((d) =>
    z
      .object({
        ingredients: z.array(z.string().min(1).max(40)).min(1).max(60),
        categories: z.array(z.string().min(1).max(20)).max(8).default(["전체"]),
        urgentIngredients: z.array(z.string().min(1).max(40)).max(60).default([]),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ recipes: Recipe[]; error?: string }> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { recipes: [], error: "AI 설정이 완료되지 않았어요." };
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    try {
      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        maxRetries: 0,
        output: Output.object({ schema: recipeSchema }),
        instructions:
          "당신은 '냉장고 파먹기' 전문 한국인 셰프입니다. 사용자가 가진 재료를 최대한 활용한, 집에서 만들 수 있는 요리 3가지를 한국어로 추천하세요. 사용자가 원하는 요리 카테고리가 '전체'가 아니라면 해당 카테고리에 부합하는 요리만 추천하세요. categories에는 각 요리가 속하는 카테고리를 '한식, 중식, 일식, 양식, 국물/찌개, 간단/간식, 안주' 중에서 1~2개 골라 넣으세요. usedIngredients에는 보유 재료 중 실제로 쓰는 것만, extraIngredients에는 있으면 좋은 추가 재료를, extraTip에는 '치즈가 더 있으면 좋아요!' 같은 친근한 한 문장을 쓰세요. emoji에는 요리를 대표하는 음식 이모지 1개(예: 🍳, 🥘, 🍜)를 넣으세요. steps는 3~6개의 간단한 조리 단계입니다. " +
          TIMER_RULE +
          " " +
          URGENT_RULE,
        messages: [
          {
            role: "user",
            content: buildUserMessage({
              ingredients: data.ingredients,
              categories: data.categories,
              urgent: data.urgentIngredients.filter((u) => data.ingredients.includes(u)),
            }),
          },
        ],
        providerOptions: {
          openai: {
            store: false,
            forceReasoning: true,
            reasoningEffort: "low",
            reasoningSummary: "auto",
            include: ["reasoning.encrypted_content"],
          },
        },
      });
      const out = await result.output;
      return { recipes: out.recipes };
    } catch (e) {
      console.error("recommendRecipes failed", e);
      const status = (e as { statusCode?: number }).statusCode;
      const msg =
        status === 429
          ? "요청이 많아요. 잠시 후 다시 시도해 주세요."
          : status === 402
            ? "AI 사용 크레딧이 부족해요."
            : "요리를 추천하지 못했어요. 다시 시도해 주세요.";
      return { recipes: [], error: msg };
    }
  });
