/**
 * AI 추천 요청 문구와 결과 정렬을 만드는 순수 함수들 (서버·브라우저 공용).
 */

/** 한국어 목적격 조사: 받침 있으면 '을', 없으면 '를', 한글이 아니면 '을(를)' */
export function withObjectParticle(word: string): string {
  const trimmed = word.trim();
  const last = trimmed.charCodeAt(trimmed.length - 1);
  if (last >= 0xac00 && last <= 0xd7a3) {
    return trimmed + ((last - 0xac00) % 28 === 0 ? "를" : "을");
  }
  return `${trimmed}을(를)`;
}

/** 유통기한 임박 재료가 있으면 최우선 추천 문구를 돌려줘요. */
export function urgentPriorityLine(urgent: string[]): string | null {
  const list = urgent.map((s) => s.trim()).filter(Boolean);
  if (list.length === 0) return null;
  return `🚨 유통기한이 얼마 남지 않은 ${withObjectParticle(list.join(", "))} 먼저 소비할 수 있는 레시피`;
}

export const URGENT_RULE =
  "사용자 메시지에 '🚨 유통기한 임박 재료'가 있으면, 그 재료를 먼저 소비할 수 있는 레시피를 최우선으로 추천하세요. 첫 번째 레시피는 임박 재료를 가장 많이 사용해야 하고, 가능하면 3가지 요리 모두 임박 재료를 하나 이상 사용하세요. 사용한 임박 재료는 반드시 usedIngredients에 그대로 적으세요.";

export const TIMER_RULE =
  "끓이기·굽기·삶기·뜸들이기처럼 기다리는 시간이 있는 단계에는 '7분', '30초'처럼 구체적인 시간을 숫자로 적으세요.";

export function buildUserMessage(input: {
  ingredients: string[];
  categories: string[];
  urgent: string[];
}): string {
  const lines = [`보유 재료: ${input.ingredients.join(", ")}`, `원하는 카테고리: ${input.categories.join(", ")}`];
  const priority = urgentPriorityLine(input.urgent);
  if (priority) {
    lines.push(`🚨 유통기한 임박 재료 (D-1 ~ D-3): ${input.urgent.join(", ")}`);
    lines.push(`최우선 요청: ${priority}를 가장 먼저 추천해 주세요.`);
  }
  return lines.join("\n");
}

/** 레시피가 사용하는 임박 재료 목록 */
export function urgentUsed(recipe: { usedIngredients: string[] }, urgent: string[]): string[] {
  return urgent.filter((u) => recipe.usedIngredients.some((i) => i.includes(u) || u.includes(i)));
}

/** 임박 재료를 많이 쓰는 레시피가 앞에 오도록 정렬 (같으면 원래 순서 유지) */
export function prioritizeUrgent<T extends { usedIngredients: string[] }>(recipes: T[], urgent: string[]): T[] {
  if (urgent.length === 0) return recipes;
  return recipes
    .map((r, i) => ({ r, i, n: urgentUsed(r, urgent).length }))
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .map((x) => x.r);
}
